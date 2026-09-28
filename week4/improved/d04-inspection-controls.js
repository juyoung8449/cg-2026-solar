/* 
   개선된 카메라 조작

   마우스 조작:
   - 좌클릭 + 좌우 드래그 : X축 방향 이동
   - 좌클릭 + 상하 드래그 : Y축 방향 이동
   - 마우스 휠             : Z축 방향 이동

   좌클릭 드래그에서는 카메라 회전이 발생하지 않습니다.
   따라서 이동 중에도 카메라의 수평/수직 방향이 유지됩니다.
*/

window.InspectionControls = function(canvas) {

  // --------------------------------------------------
  // 기본 벡터 / 쿼터니언 함수
  // --------------------------------------------------

  const normalize = v => {
    const n = Math.hypot(...v) || 1;
    return v.map(x => x / n);
  };

  const mul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];

  const rotate = (q, v) =>
    mul(
      mul(q, [...v, 0]),
      [-q[0], -q[1], -q[2], q[3]]
    ).slice(0, 3);


  // --------------------------------------------------
  // 카메라 상태
  // --------------------------------------------------

  const state = {
    target: [3, 3, 0],
    distance: 30,

    // 카메라 회전은 고정합니다.
    // 기본 방향: +Z에서 -Z를 바라봄
    rotation: [0, 0, 0, 1],

    fov: 45,
    actions: 0
  };


  // --------------------------------------------------
  // 초기 위치로 돌아가기
  // --------------------------------------------------

  function home() {
    state.target = [3, 3, 0];
    state.distance = 30;

    // 카메라 방향을 초기화합니다.
    // 회전값은 마우스 드래그로 변경되지 않습니다.
    state.rotation = [0, 0, 0, 1];

    state.fov = 45;
  }

  home();


  // --------------------------------------------------
  // 마우스 드래그 상태
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

    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,

      // 드래그 시작 당시의 카메라 위치 저장
      target: [...state.target]
    };

    // 드래그 1회 = 조작 1회
    state.actions++;

    canvas.setPointerCapture(e.pointerId);
  });


  // --------------------------------------------------
  // 좌클릭 드래그
  // --------------------------------------------------

  canvas.addEventListener('pointermove', e => {

    if (!drag || drag.id !== e.pointerId) return;

    const r = canvas.getBoundingClientRect();

    /*
      화면 높이를 기준으로 이동량을 계산합니다.

      distance가 멀어지면 한 번의 드래그로
      더 넓은 거리를 이동할 수 있습니다.
    */
    const unit =
      2 *
      state.distance *
      Math.tan(state.fov * Math.PI / 360) /
      r.height;


    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;


    // ----------------------------------------------
    // X축 이동
    // ----------------------------------------------

    state.target[0] =
      drag.target[0] - dx * unit;


    // ----------------------------------------------
    // Y축 이동
    // ----------------------------------------------

    state.target[1] =
      drag.target[1] - dy * unit;


    /*
      중요:
      여기서는 state.rotation을 변경하지 않습니다.

      따라서 좌클릭 드래그를 해도
      카메라가 회전하지 않습니다.
    */
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

    canvas.addEventListener(event, e => {

      if (drag?.id === e.pointerId) {
        drag = null;
      }

    });
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
        휠:
        앞으로 굴리면 카메라가 가까워지고
        뒤로 굴리면 카메라가 멀어집니다.
      */

      state.distance = Math.max(
        0.12,
        Math.min(
          100,
          state.distance *
          Math.exp(e.deltaY * 0.001)
        )
      );


      /*
        휠을 한 번 굴릴 때마다 actions가 증가하는
        기존 문제를 개선합니다.

        짧은 시간 동안 연속으로 발생한 wheel 이벤트는
        하나의 조작으로 처리합니다.
      */

      if (wheelTimer === null) {
        state.actions++;
      }

      clearTimeout(wheelTimer);

      wheelTimer = setTimeout(() => {
        wheelTimer = null;
      }, 250);

    },
    { passive: false }
  );


  // --------------------------------------------------
  // 키보드 조작
  // --------------------------------------------------

  /*
    기존에는 방향키를 이용해서 카메라를 회전시켰습니다.

    이번 개선 버전에서는
    "마우스만 사용"하는 조작 방식을 적용하므로
    키보드 조작을 제거합니다.

    Home만 남겨서 초기 화면으로 돌아갈 수 있도록 합니다.
  */

  canvas.addEventListener('keydown', e => {

    if (e.key !== 'Home') return;

    e.preventDefault();

    state.actions++;

    home();
  });


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

      eye: state.target.map(
        (v, i) => v + offset[i]
      ),

      target: [...state.target],

      up: rotate(
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
