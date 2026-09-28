/*
   개선된 카메라 조작

   기본 조작
   --------------------------------
   좌클릭 + 좌우 드래그
   → X축 이동

   좌클릭 + 위/아래 드래그
   → Y축 이동

   마우스 휠
   → Z축 방향 거리 조절


   회전 조작
   --------------------------------
   Alt + 좌클릭 + 드래그
   → 카메라 회전

   Alt 회전 중에는 카메라의 위치(target)는
   변경하지 않고 방향(rotation)만 변경합니다.
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
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];


  // ==================================================
  // 축을 기준으로 회전하는 쿼터니언
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

    // 관찰 대상의 위치
    target: [3, 3, 0],

    // 카메라와 관찰 대상 사이 거리
    distance: 30,

    // 카메라 회전
    rotation: [0, 0, 0, 1],

    fov: 45,

    // 조작 횟수
    actions: 0
  };


  // ==================================================
  // 초기화
  // ==================================================

  function home() {

    state.target = [3, 3, 0];

    state.distance = 30;

    // 초기 카메라 방향
    state.rotation = [0, 0, 0, 1];

    state.fov = 45;
  }

  home();


  // ==================================================
  // Alt 키 상태
  // ==================================================

  /*
     브라우저에 따라 pointer 이벤트의 e.altKey가
     안정적으로 전달되지 않는 경우가 있기 때문에
     Alt 키의 눌림 상태를 별도로 저장합니다.
  */

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


  // 브라우저 창을 벗어났을 때 Alt 상태 초기화
  window.addEventListener('blur', () => {
    altHeld = false;
  });


  // ==================================================
  // 드래그 상태
  // ==================================================

  let drag = null;

  canvas.style.touchAction = 'none';

  canvas.addEventListener(
    'contextmenu',
    e => e.preventDefault()
  );


  // ==================================================
  // 마우스 버튼 누르기
  // ==================================================

  canvas.addEventListener('pointerdown', e => {

    // 좌클릭만 사용
    if (drag || e.button !== 0) return;


    /*
       Alt가 눌려 있으면 회전 모드
       그렇지 않으면 이동 모드
    */

    const rotating =
      altHeld || e.altKey;


    if (rotating) {

      // ==============================================
      // Alt + 좌클릭
      // → 회전 모드
      // ==============================================

      drag = {

        id: e.pointerId,

        mode: 'rotate',

        x: e.clientX,
        y: e.clientY,

        // 회전 시작 시점의 회전값 저장
        rotation: [...state.rotation]
      };

    } else {

      // ==============================================
      // 일반 좌클릭
      // → 이동 모드
      // ==============================================

      drag = {

        id: e.pointerId,

        mode: 'move',

        x: e.clientX,
        y: e.clientY,

        // 이동 시작 시점의 위치 저장
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
    // ① 일반 이동
    // ==================================================

    if (drag.mode === 'move') {

      /*
         혹시 드래그 도중 Alt를 누른 경우에도
         즉시 회전 모드로 전환합니다.

         따라서 Alt를 누른 상태에서 드래그하면
         확실하게 회전할 수 있습니다.
      */

      if (altHeld || e.altKey) {

        drag.mode = 'rotate';

        drag.x = e.clientX;
        drag.y = e.clientY;

        drag.rotation = [...state.rotation];

        return;
      }


      const r =
        canvas.getBoundingClientRect();


      const unit =
        2 *
        state.distance *
        Math.tan(
          state.fov * Math.PI / 360
        ) /
        r.height;


      const dx =
        e.clientX - drag.x;

      const dy =
        e.clientY - drag.y;


      // ----------------------------------------------
      // X축 이동
      // ----------------------------------------------

      state.target[0] =
        drag.target[0] - dx * unit;


      // ----------------------------------------------
      // Y축 이동
      // ----------------------------------------------

      /*
         마우스를 위로 드래그
         → dy가 음수
         → Y 증가
         → 위로 이동

         마우스를 아래로 드래그
         → dy가 양수
         → Y 감소
         → 아래로 이동
      */

      state.target[1] =
        drag.target[1] - dy * unit;


      return;
    }


    // ==================================================
    // ② Alt + 좌클릭 회전
    // ==================================================

    if (drag.mode === 'rotate') {

      /*
         Alt가 풀렸다면 회전 모드를 종료합니다.
      */

      if (!altHeld && !e.altKey) {

        drag.mode = 'move';

        drag.x = e.clientX;
        drag.y = e.clientY;

        drag.target = [...state.target];

        return;
      }


      /*
         마우스 이동량
      */

      const dx =
        e.clientX - drag.x;

      const dy =
        e.clientY - drag.y;


      /*
         회전 속도

         숫자를 크게 하면
         조금만 움직여도 많이 회전합니다.

         현재 0.01 정도로 설정했습니다.
      */

      const sensitivity = 0.01;


      // ----------------------------------------------
      // 좌우 드래그 → Y축 기준 회전
      // ----------------------------------------------

      const yaw =
        axisAngle(
          [0, 1, 0],
          -dx * sensitivity
        );


      // ----------------------------------------------
      // 상하 드래그 → X축 기준 회전
      // ----------------------------------------------

      const pitch =
        axisAngle(
          [1, 0, 0],
          -dy * sensitivity
        );


      /*
         좌우 + 상하 회전을 합칩니다.
      */

      const delta =
        mul(yaw, pitch);


      /*
         기존 회전에 새로운 회전을 적용합니다.
      */

      state.rotation =
        normalize(
          mul(
            delta,
            drag.rotation
          )
        );


      /*
         중요!

         여기에서는

         state.target[0]
         state.target[1]
         state.target[2]

         를 전혀 변경하지 않습니다.

         따라서 Alt 회전에서는
         카메라의 위치는 그대로이고
         방향만 변경됩니다.
      */
    }

  });


  // ==================================================
  // 드래그 종료
  // ==================================================

  for (
    const event of [
      'pointerup',
      'pointercancel',
      'lostpointercapture'
    ]
  ) {

    canvas.addEventListener(
      event,
      e => {

        if (drag?.id === e.pointerId) {

          drag = null;
        }

      }
    );
  }


  // ==================================================
  // 마우스 휠
  // ==================================================

  let wheelTimer = null;


  canvas.addEventListener(
    'wheel',
    e => {

      e.preventDefault();


      /*
         휠 위쪽
         → 카메라 가까워짐

         휠 아래쪽
         → 카메라 멀어짐
      */

      state.distance =
        Math.max(
          0.12,
          Math.min(
            100,
            state.distance *
            Math.exp(
              e.deltaY * 0.001
            )
          )
        );


      /*
         연속된 휠 입력을
         하나의 조작으로 계산
      */

      if (wheelTimer === null) {
        state.actions++;
      }


      clearTimeout(wheelTimer);


      wheelTimer =
        setTimeout(() => {

          wheelTimer = null;

        }, 250);

    },
    {
      passive: false
    }
  );


  // ==================================================
  // 키보드
  // ==================================================

  /*
     방향키 회전은 제거합니다.

     Home만 초기화 기능으로 사용합니다.
  */

  canvas.addEventListener(
    'keydown',
    e => {

      if (e.key !== 'Home') return;

      e.preventDefault();

      state.actions++;

      home();
    }
  );


  // ==================================================
  // 카메라 계산
  // ==================================================

  function camera() {

    const offset =
      rotate(
        state.rotation,
        [0, 0, state.distance]
      );


    return {

      eye:
        state.target.map(
          (v, i) =>
            v + offset[i]
        ),

      target:
        [...state.target],

      up:
        rotate(
          state.rotation,
          [0, 1, 0]
        )
    };
  }


  // ==================================================
  // 외부에 제공
  // ==================================================

  return {
    state,
    home,
    camera
  };

};
