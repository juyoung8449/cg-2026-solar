# 깃허브 실행주소
http://localhost:8000/week4/baseline/
https://juyoung8449.github.io/cg-2026-solar/week4/improved/

# 조작 방법
본 프로그램은 사용자가 3차원 공간 내 카메라 위치와 시점을 직관적으로 조작할 수 있도록 마우스와 키보드를 연동한 다각적인 인터페이스를 제공한다. 카메라 조작의 기본이 되는 회전 기능은 마우스 좌클릭 후 드래그하거나 키보드 방향키를 사용하여 제어하며, 관찰 대상과의 거리 조절(Zoom)은 마우스 휠 스크롤 또는 키보드의 `+`, `-` 키를 통해 손쉽게 수행할 수 있다. 또한 시점을 평행 이동할 때는 Shift 키를 누른 채 마우스를 드래그하거나 우클릭 드래그 방식을 지원하여 세밀한 위치 조정을 가능하게 하였다. 전체 관찰 시점으로 즉시 복귀하려면 `Home` 키를 활용한다.

다각도 관찰 및 비교를 위해 분할 화면 모드도 함께 구현하였다. 사용자가 키보드 `F` 키를 누르면 화면이 즉시 4분할 뷰로 전환되어 서로 다른 방향의 시점을 동시에 관찰할 수 있다. 분할된 상태에서 특정 뷰를 마우스로 클릭하면 해당 화면이 전체 화면으로 확대되어 집중적으로 관찰할 수 있으며, 이 상태에서 `Esc` 키를 누르면 언제든지 다시 4분할 화면으로 원상 복귀된다.


# 기본 버전의 지점별 관찰 결과
1. p1 본관 입구 안내:
안내판의 동 이름과 층수를 확인하세요- ENTRY A/ LEVEAL 3 (조작 5회)
2. p2 1층 안쪽 밸브
밸브의 식별 번호외 상태를 읽으세요- V-07 OPEN (기본 조작 21회)
3. P3 2층 제어함
작은 명판의 회로 번호와 전압을 읽으세요- B-12 24 V (기본 조작 19회)
4. P4 옥상 서비스 장치
장치의 이름과 점섬 주기를 확인하세여 FILTER 30 DAYS (기본 조작 13회)
5. P5 본관 뒤쪽 배관
뒤쪽 표지의 배관 용도와 유량을 읽으세요. -RETURN 9L/min (기본 조작 15회)
6. P6 별관 펌프
별관 장치의 제한 온도를 확인하세요. -LIMIT 80 c (기본 조작 22회)
7. O1 전면 패널 정렬
전면 직교 뷰에서 파랑 A·주황 B 패널의 상단 높이와 폭이 같은지 비교하세요.
다르다. 파란색이 상단 높이가 높고 주황색의 폭이 좁다. 
8. O2 측면 돌출 비교
오른쪽 측면 직교 뷰에서 A·B 장치의 전면 끝을 비교하세요. 어느 쪽이 건물 앞쪽(+z)으로 더 돌출되나요?
파란색이 더 돌출된다.


# 관찰 과정에서 나타난 기존 조작 방식의 한계점

기존 카메라 조작 방식에서는 원근감을 조절하여 관찰 대상과의 거리를 변경하는 기능 자체는 비교적 원활하게 작동하였으나, 세밀한 관찰 위치 탐색과 시점 유지 측면에서 여러 구조적인 불편함이 발생하였다. 가장 큰 문제는 수평(X축) 이동 과정에서 의도하지 않은 카메라 회전이 함께 일어난다는 점이었다. 이로 인해 물체의 수평 상태를 유지한 채 위치만 이동하기 어려웠으며, 실제로 간판이나 표지의 글씨를 읽을 때 카메라가 임의로 약 90도 가까이 돌아간 채 관찰해야 하는 상황이 빈번하게 발생하여 원하는 각도를 맞추기 위한 불필요한 재조작이 누적되었다.

더불어 수직(Y축) 방향으로의 직관적인 이동이 제한되어 화면 상단에 위치한 대상을 관찰하기가 매우 번거로웠다. 목표 지점을 원하는 높이에서 보기 위해서는 먼저 카메라를 대상과 멀리 떨어뜨린 후 목표점을 재설정하거나, Z축 이동 후 다시 X축 방향을 조정하는 등 여러 번거로운 단계를 거쳐야만 했다. 특히 건물 내 특정 간판이나 장치를 찾기 위해 카메라를 반복적으로 회전, 확대, 축소하는 과정에서 많은 시간과 조작력이 소모되었으며, 관찰 대상까지 바로 접근하지 못하고 거리와 방향을 계속해서 미세 조정해야 하는 문제가 도드라졌다.

또한 조작 횟수 측정 방식에서도 개선점이 확인되었다. 원하는 관찰 지점을 찾아가는 동안 연속적으로 사용하는 마우스 휠 조작이 개별적인 독립 조작으로 카운트되어 불필요하게 조작 횟수를 증가시키는 결과를 초래하였다. 따라서 단순 휠 스크롤을 의미 있는 조작 단위로 묶어 기록하는 방식의 개선과 함께, 간판 탐색을 위해 무분별한 회전 및 확대/축소를 반복해야 했던 문제를 구조적으로 해결하기 위해 다각도 시점을 동시에 제공하는 4분할 화면 기능의 추가가 필요함을 확인하였다.

# 1. 사용자 및 관찰 목표
사용자

본 시스템의 사용자는 3D 공간에 배치된 물체를 관찰하기 위해 카메라를 이동시키는 사용자이다. 특히 특정 물체의 위치를 확인하거나 물체에 표시된 글자와 방향을 자세히 관찰해야 하므로, 카메라의 위치와 방향을 직관적으로 조작할 수 있어야 한다.

관찰 목표

기존 조작 방식에서는 카메라를 이동하는 과정에서 의도하지 않은 회전이 발생하고, Y축 방향으로 이동하기 어려워 원하는 관찰 위치에 도달하기 위해 여러 번의 조작이 필요했다. 또한 카메라가 기울어져 관찰 대상의 수평을 유지하기 어려운 문제가 있었다.

따라서 개선된 조작의 목표를 다음과 같이 설정하였다.

카메라를 이동할 때 의도하지 않은 회전이 발생하지 않도록 한다.
X축과 Y축 방향으로 카메라를 직접 이동할 수 있도록 한다.
카메라의 수평을 유지하여 물체를 안정적인 방향에서 관찰할 수 있도록 한다.
특정 방향에 있는 물체를 적은 조작으로 찾아갈 수 있도록 한다.
필요한 경우에는 별도의 조작으로 카메라 방향만 회전할 수 있도록 한다.
연속적인 마우스 휠 조작이 불필요하게 많은 조작 횟수로 기록되지 않도록 한다.

# 스케치 1
스케치
          마우스 드래그
                ↓
        ┌──────────────┐
        │   3D 화면    │
        │              │
        │      ●       │
        │    ↗         │
        │  카메라 회전 │
        └──────────────┘

      좌클릭 + 드래그
              ↓
       카메라 방향 회전

첫 번째 대안은 기존에 사용하던 Arcball 방식의 카메라 회전 기능을 유지하는 방법이다.

마우스를 드래그한 방향에 따라 가상의 구 표면에서 회전값을 계산하고, 쿼터니언을 이용하여 카메라의 방향을 변경한다.

장점
자유롭게 3차원 방향으로 회전할 수 있다.
다양한 각도에서 물체를 관찰하기 쉽다.
3D 프로그램에서 일반적으로 사용되는 방식과 유사하다.

# 스케치2
스케치
       좌클릭 + 드래그
              │
       ┌──────┴──────┐
       ↓             ↓
    좌우 이동       상하 이동
       ↓             ↓
      X축           Y축


       마우스 휠
           ↓
          Z축


      ※ 회전 없음

두 번째 대안은 일반 좌클릭 드래그에서는 회전을 완전히 제거하고 이동만 수행하는 방식이다.

좌우 드래그 → X축 이동
위아래 드래그 → Y축 이동
마우스 휠 → Z축 거리 조절

로 역할을 명확하게 분리한다.


# 스케치 3
스케치
              일반 조작

      좌클릭 + 드래그
              │
       ┌──────┴──────┐
       ↓             ↓
      X축            Y축
      이동            이동

       마우스 휠
           ↓
          Z축
           이동


              회전 조작

       Alt + 좌클릭
              +
           드래그
              ↓
        ┌─────────┐
        │ 카메라  │
        │  회전   │
        └─────────┘

        ※ 위치는 고정

세 번째 대안은 두 번째 대안의 이동 방식을 유지하면서 Alt 키를 누른 상태에서만 회전이 발생하도록 추가하는 방식이다.

즉, 평소에는 이동만 수행하고, 사용자가 명시적으로 Alt를 누른 경우에만 카메라 방향을 변경한다.


#대표코드1 (카메라 위치 계산)
function camera() {
  // 카메라 회전(rotation)을 적용한 Z축 거리(distance) 오프셋 계산
  const offset = rotate(
    state.rotation,
    [0, 0, state.distance]
  );

  return {
    // 카메라 실제 위치 = 시점 타깃 + 오프셋
    eye: state.target.map((v, i) => v + offset[i]),
    
    // 카메라가 바라보는 중심점
    target: [...state.target],
    
    // 카메라의 상방 벡터 (수평 유지)
    up: rotate(state.rotation, [0, 1, 0])
  };
}

#대표코드2 (마우스 드래그 및 평면이동)
canvas.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;

  const r = canvas.getBoundingClientRect();

  // 화면 높이 및 FOV, 거리에 비례한 월드 좌표 이동 단위 계산
  const unit =
    2 *
    state.distance *
    Math.tan(state.fov * Math.PI / 360) /
    r.height;

  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;

  // X축 이동: 오른쪽 드래그 (+dx) -> 오른쪽 (+X) 이동
  state.target[0] = drag.target[0] + dx * unit;

  // Y축 이동 (반대 설정): 위로 드래그 (-dy) -> 아래 (-Y) 이동
  //                         아래로 드래그 (+dy) -> 위 (+Y) 이동
  state.target[1] = drag.target[1] + dy * unit;
});


#대표코드3(4분할)
const viewTarget = [3, 4.5, 0];

const fixedViews = {
  top: {
    eye: [3, 32, 0],
    target: viewTarget,
    up: [0, 0, -1],
    orthographic: true,
    halfHeight: 8.5
  },
  left: {
    eye: [-28, 4.5, 0],
    target: viewTarget,
    up: [0, 1, 0],
    orthographic: true,
    halfHeight: 8.5
  },
  right: {
    eye: [34, 4.5, 0],
    target: viewTarget,
    up: [0, 1, 0],
    orthographic: true,
    halfHeight: 8.5
  }
};

const focusedViewStates = {
  top: { target: [...viewTarget], distance: 28, yaw: 0, pitch: 1.48 },
  left: { target: [...viewTarget], distance: 28, yaw: -Math.PI / 2, pitch: 0 },
  right: { target: [...viewTarget], distance: 31, yaw: Math.PI / 2, pitch: 0 }
};

let splitView = false;
let returnToSplit = false;
let savedCameraState = null;

function drawSplitViews(width, height) {
  const leftWidth = Math.floor(width / 2);
  const bottomHeight = Math.floor(height / 2);
  const rightWidth = width - leftWidth;
  const topHeight = height - bottomHeight;

  // 캔버스 뷰포트 좌표의 원점은 왼쪽 아래입니다.
  drawView(controls.camera(), [0, bottomHeight, leftWidth, topHeight]);
  drawView(fixedViews.top, [leftWidth, bottomHeight, rightWidth, topHeight]);
  drawView(fixedViews.left, [0, 0, leftWidth, bottomHeight]);
  drawView(fixedViews.right, [leftWidth, 0, rightWidth, bottomHeight]);
}

function toggleSplit() {
  const viewport = document.querySelector('.viewport');

  if (splitView) {
    splitView = false;
    returnToSplit = false;
    viewport.classList.remove('split');

    if (savedCameraState) {
      Object.assign(controls.state, savedCameraState);
      savedCameraState = null;
    }
    return;
  }

  if (returnToSplit) {
    returnToSplit = false;
    splitView = true;
    viewport.classList.add('split');

    if (savedCameraState) {
      Object.assign(controls.state, savedCameraState);
      savedCameraState = null;
    }
    return;
  }

  splitView = true;
  viewport.classList.add('split');
}

// F 키: 4분할 전환. 확대 상태에서는 4분할로 돌아갑니다.
// Esc 키: 원래 화면으로 복귀합니다.
window.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'f') {
    event.preventDefault();
    toggleSplit();
  } else if (event.key === 'Escape' && (splitView || returnToSplit)) {
    event.preventDefault();
    toggleSplit();
  }
});

// 분할 화면을 클릭하면 해당 시점으로 확대합니다.
canvas.addEventListener('pointerup', event => {
  if (!pointerStart || !splitView) return;

  const moved = Math.hypot(
    event.clientX - pointerStart.x,
    event.clientY - pointerStart.y
  );
  pointerStart = null;
  if (moved > 5) return;

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  const name = y < 0.5
    ? (x < 0.5 ? 'original' : 'top')
    : (x < 0.5 ? 'left' : 'right');

  if (name !== 'original') {
    savedCameraState = {
      ...controls.state,
      target: [...controls.state.target]
    };
    Object.assign(controls.state, focusedViewStates[name]);
  }

  splitView = false;
  returnToSplit = true;
  document.querySelector('.viewport').classList.remove('split');
});
