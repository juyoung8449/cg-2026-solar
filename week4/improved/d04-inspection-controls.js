/* 
   개선된 카메라 조작

   마우스 조작:
   - 좌클릭 + 드래그 (상하/좌우/대각선) : 카메라 평면 이동 (Pan)
   - 마우스 휠                         : Z축 거리 이동 (Zoom)

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

    // 카메라 회전은 고정
    rotation: [0, 0, 0, 1],

    fov: 45,
    actions: 0
  };


  // --------------------------------------------------
  // 초기 위치
  // --------------------------------------------------

  function home() {

    state.target = [3, 3, 0];
    state.distance = 30;

    // 카메라 방향 고정
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

      // 드래그 시작 당시 위치
      target: [...state.target]
    };

    // 드래그 1회 = 조작 1회
    state.actions++;

    canvas.setPointerCapture(e.pointerId);
  });


  // --------------------------------------------------
  // 좌클릭 드래그 (X, Y 및 대각선 이동 반대로 수정)
  // --------------------------------------------------

  canvas.addEventListener('pointermove', e => {

    if (!drag || drag.id !== e.pointerId) return;

    const r = canvas.getBoundingClientRect();

    const unit =
      2 *
      state.distance *
      Math.tan(state.fov * Math.PI / 360) /
      r.height;


    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;


    // ----------------------------------------------
    // X, Y축 및 대각선 이동 방향 (Y축 반대 적용)
    // ----------------------------------------------
    
    // 오른쪽으로 드래그(+dx) -> 오른쪽(+X)으로 이동
    state.target[0] = drag.target[0] + dx * unit;

    // 위로 드래그(-dy) -> 아래(-Y)로 이동 (반대 설정)
    // 아래로 드래그(+dy) -> 위(+Y)로 이동
    state.target[1] = drag.target[1] + dy * unit;
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

      state.distance = Math.max(
        0.12,
        Math.min(
          100,
          state.distance *
          Math.exp(e.deltaY * 0.001)
        )
      );

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
