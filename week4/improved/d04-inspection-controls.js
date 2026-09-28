/*
   개선된 카메라 조작

   기본 마우스 조작:
   - 좌클릭 + 좌우 드래그 : X축 방향 이동
   - 좌클릭 + 위/아래 드래그 : Y축 방향 이동
   - 마우스 휠 : Z축 방향 이동

   회전 조작:
   - Alt + 좌클릭 + 드래그 : 카메라 회전

   Alt를 누르지 않은 일반 드래그에서는
   카메라가 회전하지 않습니다.

   Alt + 드래그 회전에서는
   카메라의 target 위치를 변경하지 않고
   rotation만 변경합니다.
*/

window.InspectionControls = function(canvas) {

  // --------------------------------------------------
  // 기본 벡터 함수
  // --------------------------------------------------

  const normalize = v => {
    const n = Math.hypot(...v) || 1;
    return v.map(x => x / n);
  };


  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];


  // --------------------------------------------------
  // 쿼터니언 곱셈
  // --------------------------------------------------

  const mul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];


  // --------------------------------------------------
  // 쿼터니언으로 벡터 회전
  // --------------------------------------------------

  const rotate = (q, v) =>
    mul(
      mul(q, [...v, 0]),
      [-q[0], -q[1], -q[2], q[3]]
    ).slice(0, 3);


  // --------------------------------------------------
  // 카메라 상태
  // --------------------------------------------------

  const state = {

    // 관찰 대상
    target: [3, 3, 0],

    // 카메라와 관찰 대상 사이 거리
    distance: 30,

    // 카메라 회전
    rotation: [0, 0, 0, 1],

    fov: 45,

    // 조작 횟수
    actions: 0
  };


  // --------------------------------------------------
  // 초기 화면
  // --------------------------------------------------

  function home() {

    state.target = [3, 3, 0];

    state.distance = 30;

    // 초기 카메라 방향
    state.rotation = [0, 0, 0, 1];

    state.fov = 45;
  }

  home();


  // --------------------------------------------------
  // Arcball용 포인터 투영
  // --------------------------------------------------

  function sphere(e) {

    const r = canvas.getBoundingClientRect();

    const s = Math.min(r.width, r.height);

    const x =
      (2 * (e.clientX - r.left) - r.width) / s;

    const y =
      (r.height - 2 * (e.clientY - r.top)) / s;

    const d = x * x + y * y;

    if (d <= 1) {
      return [
        x,
        y,
        Math.sqrt(1 - d)
      ];
    }

    return normalize([
      x,
      y,
      0
    ]);
  }


  // --------------------------------------------------
  // 드래그 상태
  // --------------------------------------------------

  let drag = null;

  canvas.style.touchAction = 'none';

  canvas.addEventListener(
    'contextmenu',
    e => e.preventDefault()
  );


  // --------------------------------------------------
  // 좌클릭 시작
  // --------------------------------------------------

  canvas.addEventListener('pointerdown', e => {

    // 좌클릭만 사용
    if (drag || e.button !== 0) return;


    /*
      Alt가 눌려 있으면 회전 모드

      Alt가 없으면 이동 모드
    */

    if (e.altKey) {

      // ----------------------------------------------
      // 회전 모드
      // ----------------------------------------------

      drag = {

        id: e.pointerId,

        mode: 'rotate',

        p: sphere(e),

        // 회전 시작 당시의 회전값 저장
        q: [...state.rotation],

        x: e.clientX,
        y: e.clientY
      };

    } else {

      // ----------------------------------------------
      // 이동 모드
      // ----------------------------------------------

      drag = {

        id: e.pointerId,

        mode: 'move',

        x: e.clientX,
        y: e.clientY,

        // 이동 시작 당시 위치 저장
        target: [...state.target]
      };
    }


    // 드래그 1회 = 조작 1회
    state.actions++;

    canvas.setPointerCapture(e.pointerId);
  });


  // --------------------------------------------------
  // 마우스 이동
  // --------------------------------------------------

  canvas.addEventListener('pointermove', e => {

    if (!drag || drag.id !== e.pointerId) return;


    // ==================================================
    // ① 일반 좌클릭 드래그
    // ==================================================

    if (drag.mode === 'move') {

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
        마우스를 위로 움직이면
        화면 좌표의 dy는 음수가 됩니다.

        따라서:

        위로 드래그
        → dy 음수
        → -dy 양수
        → Y 증가
        → 위로 이동

        아래로 드래그
        → dy 양수
        → -dy 음수
        → Y 감소
        → 아래로 이동
      */

      state.target[1] =
        drag.target[1] - dy * unit;


      /*
        중요:

        일반 드래그에서는
        state.rotation을 변경하지 않습니다.

        따라서 이동 중 카메라가
        의도하지 않게 회전하지 않습니다.
      */

      return;
    }


    // ==================================================
    // ② Alt + 좌클릭 드래그
    // ==================================================

    if (drag.mode === 'rotate') {

      /*
        Alt + 좌클릭에서는
        위치(target)는 그대로 두고
        rotation만 변경합니다.

        즉,

        target X → 고정
        target Y → 고정
        target Z → 고정

        rotation → 변경
      */


      const current =
        sphere(e);


      const dot =
        current.reduce(
          (v, x, i) =>
            v + x * drag.p[i],
          0
        );


      let q = [
        ...cross(
          current,
          drag.p
        ),
        1 + dot
      ];


      /*
        포인터가 반대쪽에 있을 때
        회전축을 별도로 처리합니다.
      */

      if (Math.hypot(...q) < 1e-7) {

        const axis =
          normalize(
            cross(
              current,
              Math.abs(current[0]) < 0.9
                ? [1, 0, 0]
                : [0, 1, 0]
            )
          );

        q = [
          ...axis,
          0
        ];
      }


      /*
        시작할 때 저장해 놓은 회전값에
        현재 드래그 회전을 적용합니다.
      */

      state.rotation =
        normalize(
          mul(
            drag.q,
            normalize(q)
          )
        );


      /*
        여기에서는 state.target을
        전혀 변경하지 않습니다.

        따라서 Alt 회전 중에는
        카메라의 기준 위치가 고정됩니다.
      */
    }

  });


  // --------------------------------------------------
  // 드래그 종료
  // --------------------------------------------------

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


  // --------------------------------------------------
  // 마우스 휠
  // --------------------------------------------------

  let wheelTimer = null;


  canvas.addEventListener(
    'wheel',
    e => {

      e.preventDefault();


      /*
        마우스 휠:

        휠 위쪽
        → 카메라가 가까워짐

        휠 아래쪽
        → 카메라가 멀어짐
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
        연속된 휠 조작은
        하나의 조작으로 기록합니다.
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


  // --------------------------------------------------
  // 키보드
  // --------------------------------------------------

  /*
    마우스 중심 조작을 위해
    방향키 회전은 제거했습니다.

    Home만 유지합니다.
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


  // --------------------------------------------------
  // 카메라 계산
  // --------------------------------------------------

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


  // --------------------------------------------------
  // 외부에서 사용할 값
  // --------------------------------------------------

  return {
    state,
    home,
    camera
  };

};
