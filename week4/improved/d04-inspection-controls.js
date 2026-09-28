/*
   개선된 카메라 조작

   --------------------------------------------
   일반 조작
   --------------------------------------------

   좌클릭 + 좌우 드래그
   → X축 이동

   좌클릭 + 위아래 드래그
   → Y축 이동

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

      mul(
        q,
        [...v, 0]
      ),

      [
        -q[0],
        -q[1],
        -q[2],
        q[3]
      ]

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

    // ------------------------------
    // 중요
    // ------------------------------

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

    /*
       Yaw
       ------------------------------
       Y축을 기준으로 좌우 회전
    */

    const yawQ =
      axisAngle(
        [0, 1, 0],
        state.yaw
      );


    /*
       Pitch
       ------------------------------
       X축을 기준으로 위아래 회전
    */

    const pitchQ =
      axisAngle(
        [1, 0, 0],
        state.pitch
      );


    /*
       Yaw → Pitch 순서로 적용

       이 방식에서는 Roll 값을
       별도로 만들지 않습니다.

       따라서 카메라 화면이
       옆으로 기울어지는 현상을 방지합니다.
    */

    state.rotation =
      normalize(
        mul(
          yawQ,
          pitchQ
        )
      );
  }


  // ==================================================
  // 초기 위치
  // ==================================================

  function home() {

    state.target = [3, 3, 0];

    state.distance = 30;

    /*
       초기 회전값
    */

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


  window.addEventListener(
    'keydown',
    e => {

      if (e.key === 'Alt') {

        altHeld = true;

      }

    }
  );


  window.addEventListener(
    'keyup',
    e => {

      if (e.key === 'Alt') {

        altHeld = false;

      }

    }
  );


  /*
     브라우저 창을 벗어나면
     Alt 상태 초기화
  */

  window.addEventListener(
    'blur',
    () => {

      altHeld = false;

    }
  );


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
  // 마우스 버튼
  // ==================================================

  canvas.addEventListener(
    'pointerdown',
    e => {

      /*
         좌클릭만 사용
      */

      if (
        drag ||
        e.button !== 0
      ) {

        return;

      }


      /*
         Alt가 눌려 있으면
         회전 모드
      */

      const rotating =
        altHeld || e.altKey;


      if (rotating) {

        // ==========================================
        // Alt + 좌클릭
        // 회전 모드
        // ==========================================

        drag = {

          id: e.pointerId,

          mode: 'rotate',

          x: e.clientX,

          y: e.clientY,

          /*
             드래그 시작 당시의
             yaw / pitch 저장
          */

          yaw: state.yaw,

          pitch: state.pitch

        };

      } else {

        // ==========================================
        // 일반 좌클릭
        // 이동 모드
        // ==========================================

        drag = {

          id: e.pointerId,

          mode: 'move',

          x: e.clientX,

          y: e.clientY,

          target: [
            ...state.target
          ]

        };

      }


      state.actions++;

      canvas.setPointerCapture(
        e.pointerId
      );

    }
  );


  // ==================================================
  // 마우스 이동
  // ==================================================

  canvas.addEventListener(
    'pointermove',
    e => {

      if (
        !drag ||
        drag.id !== e.pointerId
      ) {

        return;

      }


      // ==================================================
      // 일반 이동
      // ==================================================

      if (drag.mode === 'move') {

        /*
           드래그 중 Alt를 누르면
           회전 모드로 전환
        */

        if (
          altHeld ||
          e.altKey
        ) {

          drag.mode = 'rotate';

          drag.x = e.clientX;

          drag.y = e.clientY;

          drag.yaw = state.yaw;

          drag.pitch = state.pitch;

          return;

        }


        const r =
          canvas.getBoundingClientRect();


        /*
           화면의 이동량을
           실제 좌표 이동량으로 변환
        */

        const unit =

          2 *
          state.distance *
          Math.tan(
            state.fov *
            Math.PI /
            360
          ) /
          r.height;


        const dx =
          e.clientX - drag.x;


        const dy =
          e.clientY - drag.y;


        // ------------------------------------------
        // X축 이동
        // ------------------------------------------

        state.target[0] =

          drag.target[0]
          - dx * unit;


        // ------------------------------------------
        // Y축 이동
        // ------------------------------------------

        /*
           마우스를 위로 움직이면
           dy가 음수가 됩니다.

           따라서:

           위로 드래그
           → Y 증가
           → 화면에서 위로 이동

           아래로 드래그
           → Y 감소
           → 화면에서 아래로 이동
        */

        state.target[1] =

          drag.target[1]
          - dy * unit;


        return;
      }


      // ==================================================
      // Alt + 회전
      // ==================================================

      if (drag.mode === 'rotate') {

        /*
           Alt가 풀리면
           다시 이동 모드로 변경
        */

        if (
          !altHeld &&
          !e.altKey
        ) {

          drag.mode = 'move';

          drag.x = e.clientX;

          drag.y = e.clientY;

          drag.target = [
            ...state.target
          ];

          return;

        }


        // ------------------------------------------
        // 마우스 이동량
        // ------------------------------------------

        const dx =
          e.clientX - drag.x;


        const dy =
          e.clientY - drag.y;


        /*
           회전 감도

           숫자를 크게 하면
           더 빠르게 회전합니다.
        */

        const sensitivity = 0.01;


        // ------------------------------------------
        // Yaw
        // 좌우 회전
        // ------------------------------------------

        state.yaw =

          drag.yaw
          - dx * sensitivity;


        // ------------------------------------------
        // Pitch
        // 상하 회전
        // ------------------------------------------

        state.pitch =

          drag.pitch
          - dy * sensitivity;


        /*
           Pitch 제한

           카메라가 완전히 뒤집히는 것을
           방지합니다.

           약 ±89도까지 허용
        */

        const limit =
          Math.PI * 0.49;


        state.pitch =
          Math.max(
            -limit,
            Math.min(
              limit,
              state.pitch
            )
          );


        /*
           yaw + pitch로
           최종 회전값 계산
        */

        updateRotation();

      }

    }
  );


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

        if (
          drag?.id === e.pointerId
        ) {

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
         휠 위
         → 가까워짐

         휠 아래
         → 멀어짐
      */

      state.distance =

        Math.max(

          0.12,

          Math.min(

            100,

            state.distance *
            Math.exp(
              e.deltaY *
              0.001
            )

          )

        );


      /*
         연속적인 휠 입력은
         하나의 조작으로 계산
      */

      if (
        wheelTimer === null
      ) {

        state.actions++;

      }


      clearTimeout(wheelTimer);


      wheelTimer =

        setTimeout(
          () => {

            wheelTimer = null;

          },
          250
        );

    },

    {
      passive: false
    }

  );


  // ==================================================
  // 키보드
  // ==================================================

  /*
     방향키 회전은 사용하지 않습니다.

     Home만 초기화 기능으로 유지합니다.
  */

  canvas.addEventListener(
    'keydown',
    e => {

      if (
        e.key !== 'Home'
      ) {

        return;

      }


      e.preventDefault();

      state.actions++;

      home();

    }
  );


  // ==================================================
  // 카메라 계산
  // ==================================================

  function camera() {

    /*
       현재 회전값을 이용하여
       카메라와 target 사이의 offset 계산
    */

    const offset =

      rotate(
        state.rotation,
        [
          0,
          0,
          state.distance
        ]
      );


    return {

      eye:

        state.target.map(
          (v, i) =>
            v + offset[i]
        ),


      target:

        [
          ...state.target
        ],


      /*
         회전된 Y축을 카메라의 up으로 사용

         yaw + pitch 방식이기 때문에
         roll 회전이 발생하지 않습니다.
      */

      up:

        rotate(
          state.rotation,
          [0, 1, 0]
        )

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
