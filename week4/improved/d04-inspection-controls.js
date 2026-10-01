아래는 1·2번을 반영해 일반 드래그가 **화면 기준으로 패닝**되도록 수정한 전체 코드입니다. 드래그 방향으로 화면의 장면이 움직이도록 X/Y 부호도 조정했습니다.

````javascript
/*
   개선된 카메라 조작

   --------------------------------------------
   일반 조작
   --------------------------------------------

   좌클릭 + 좌우 드래그
   → 화면 기준 좌우 이동

   좌클릭 + 위아래 드래그
   → 화면 기준 상하 이동

   마우스 휠
   → Z축 방향 거리 조절


   --------------------------------------------
   회전 조작
   --------------------------------------------

   Alt + 좌클릭 + 좌우 드래그
   → 수평 회전(Yaw)

   Alt + 좌클릭 + 위아래 드래그
   → 수직 회전(Pitch)

   ※ Roll 회전은 발생하지 않습니다.
   ※ 화면의 수평이 유지됩니다.
*/

window.InspectionControls = function(canvas) {

  // ==================================================
  // 기본 함수
  // ==================================================

  const normalize = v => {
    const n = Math.hypot(...v) || 1;
    return v.map(x => x / n);
  };


  // ==================================================
  // 쿼터니언 곱셈
  // ==================================================

  const mul = (a, b) => [
    a[3] * b[0]
      + a[0] * b[3]
      + a[1] * b[2]
      - a[2] * b[1],

    a[3] * b[1]
      - a[0] * b[2]
      + a[1] * b[3]
      + a[2] * b[0],

    a[3] * b[2]
      + a[0] * b[1]
      - a[1] * b[0]
      + a[2] * b[3],

    a[3] * b[3]
      - a[0] * b[0]
      - a[1] * b[1]
      - a[2] * b[2]
  ];


  // ==================================================
  // 축 + 각도 → 쿼터니언
  // ==================================================

  function axisAngle(axis, angle) {
    const half = angle * 0.5;
    const s = Math.sin(half);

    return normalize([
      axis[0] * s,
      axis[1] * s,
      axis[2] * s,
      Math.cos(half)
    ]);
  }


  // ==================================================
  // 쿼터니언으로 벡터 회전
  // ==================================================

  const rotate = (q, v) =>
    mul(
      mul(q, [...v, 0]),
      [-q[0], -q[1], -q[2], q[3]]
    ).slice(0, 3);


  // ==================================================
  // 카메라 상태
  // ==================================================

  const state = {
    // 관찰 대상 위치
    target: [3, 3, 0],

    // 카메라와 관찰 대상 사이 거리
    distance: 30,

    // 최종적으로 계산되는 회전값
    rotation: [0, 0, 0, 1],

    // 좌우 회전
    yaw: 0,

    // 상하 회전
    pitch: 0,

    fov: 45,

    actions: 0
  };


  // ==================================================
  // 회전값 업데이트
  // ==================================================

  function updateRotation() {
    const yawQ = axisAngle([0, 1, 0], state.yaw);
    const pitchQ = axisAngle([1, 0, 0], state.pitch);

    // Yaw → Pitch 순서로 적용. Roll은 별도로 적용하지 않습니다.
    state.rotation = normalize(mul(yawQ, pitchQ));
  }


  // ==================================================
  // 초기 위치
  // ==================================================

  function home() {
    state.target = [3, 3, 0];
    state.distance = 30;
    state.yaw = 0;
    state.pitch = 0;

    updateRotation();

    state.fov = 45;
  }

  home();


  // ==================================================
  // Alt 키 상태
  // ==================================================

  let altHeld = false;

  window.addEventListener('keydown', e => {
    if (e.key === 'Alt') {
      altHeld = true;
    }
  });

  window.addEventListener('keyup', e => {
    if (e.key === 'Alt') {
      altHeld = false;
    }
  });

  window.addEventListener('blur', () => {
    altHeld = false;
  });


  // ==================================================
  // 드래그 상태
  // ==================================================

  let drag = null;

  canvas.style.touchAction = 'none';

  canvas.addEventListener('contextmenu', e => e.preventDefault());


  // ==================================================
  // 마우스 버튼
  // ==================================================

  canvas.addEventListener('pointerdown', e => {
    // 좌클릭만 사용
    if (drag || e.button !== 0) {
      return;
    }

    const rotating = altHeld || e.altKey;

    if (rotating) {
      drag = {
        id: e.pointerId,
        mode: 'rotate',
        x: e.clientX,
        y: e.clientY,
        yaw: state.yaw,
        pitch: state.pitch
      };
    } else {
      drag = {
        id: e.pointerId,
        mode: 'move',
        x: e.clientX,
        y: e.clientY,
        target: [...state.target]
      };
    }

    state.actions++;

    canvas.setPointerCapture(e.pointerId);
  });


  // ==================================================
  // 마우스 이동
  // ==================================================

  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) {
      return;
    }

    // ==================================================
    // 일반 이동: 카메라 화면 기준 패닝
    // ==================================================

    if (drag.mode === 'move') {
      // 드래그 중 Alt를 누르면 회전 모드로 전환
      if (altHeld || e.altKey) {
        drag.mode = 'rotate';
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.yaw = state.yaw;
        drag.pitch = state.pitch;
        return;
      }

      const r = canvas.getBoundingClientRect();

      const unit =
        2 *
        state.distance *
        Math.tan(state.fov * Math.PI / 360) /
        r.height;

      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;

      // 회전된 카메라 기준 화면의 오른쪽·위쪽 방향
      const right = rotate(state.rotation, [1, 0, 0]);
      const up = rotate(state.rotation, [0, 1, 0]);

      /*
         target을 카메라 화면 기준으로 이동합니다.
         마우스를 오른쪽으로 드래그하면 화면의 장면도 오른쪽으로,
         위로 드래그하면 화면의 장면도 위쪽으로 움직입니다.
      */
      for (let i = 0; i < 3; i++) {
        state.target[i] =
          drag.target[i]
          - right[i] * dx * unit
          + up[i] * dy * unit;
      }

      return;
    }


    // ==================================================
    // Alt + 회전
    // ==================================================

    if (drag.mode === 'rotate') {
      // Alt가 풀리면 다시 이동 모드로 변경
      if (!altHeld && !e.altKey) {
        drag.mode = 'move';
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.target = [...state.target];
        return;
      }

      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const sensitivity = 0.01;

      state.yaw = drag.yaw - dx * sensitivity;
      state.pitch = drag.pitch - dy * sensitivity;

      // 카메라가 완전히 뒤집히는 것을 방지합니다.
      const limit = Math.PI * 0.49;

      state.pitch = Math.max(
        -limit,
        Math.min(limit, state.pitch)
      );

      updateRotation();
    }
  });


  // ==================================================
  // 드래그 종료
  // ==================================================

  for (const event of [
    'pointerup',
    'pointercancel',
    'lostpointercapture'
  ]) {
    canvas.addEventListener(event, e => {
      if (drag?.id === e.pointerId) {
        drag = null;
      }
    });
  }


  // ==================================================
  // 마우스 휠
  // ==================================================

  let wheelTimer = null;

  canvas.addEventListener('wheel', e => {
    e.preventDefault();

    state.distance = Math.max(
      0.12,
      Math.min(
        100,
        state.distance * Math.exp(e.deltaY * 0.001)
      )
    );

    // 연속적인 휠 입력은 하나의 조작으로 계산
    if (wheelTimer === null) {
      state.actions++;
    }

    clearTimeout(wheelTimer);

    wheelTimer = setTimeout(() => {
      wheelTimer = null;
    }, 250);
  }, {
    passive: false
  });


  // ==================================================
  // 키보드
  // ==================================================

  // 방향키 회전은 사용하지 않습니다. Home만 초기화 기능으로 유지합니다.
  canvas.addEventListener('keydown', e => {
    if (e.key !== 'Home') {
      return;
    }

    e.preventDefault();
    state.actions++;
    home();
  });


  // ==================================================
  // 카메라 계산
  // ==================================================

  function camera() {
    const offset = rotate(
      state.rotation,
      [0, 0, state.distance]
    );

    return {
      eye: state.target.map((v, i) => v + offset[i]),
      target: [...state.target],
      up: rotate(state.rotation, [0, 1, 0])
    };
  }


  // ==================================================
  // 외부에서 사용할 값
  // ==================================================

  return {
    state,
    home,
    camera
  };
};
````
