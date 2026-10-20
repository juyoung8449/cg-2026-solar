/* 학생 관찰 인터페이스: F로 4분할, 분할 화면을 클릭해 한 뷰를 확대합니다. */
(() => {
  'use strict';

  const viewer = window.InspectionViewer;
  if (!viewer) {
    throw new Error('InspectionViewer가 초기화된 뒤 학생 인터페이스를 불러와야 합니다.');
  }

  const { canvas, controls, drawView } = viewer;
  const viewportElement = document.querySelector('.viewport');
  if (!viewportElement) {
    throw new Error('분할 뷰를 표시할 .viewport 요소를 찾을 수 없습니다.');
  }

  const viewTarget = [3, 4.5, 0];
  const fixedViews = {
    top: {
      eye: [3, 32, 0],
      target: viewTarget,
      up: [0, 0, -1],
      orthographic: true,
      halfHeight: 8.5,
      baseHalfHeight: 8.5
    },
    left: {
      eye: [-28, 4.5, 0],
      target: viewTarget,
      up: [0, 1, 0],
      orthographic: true,
      halfHeight: 8.5,
      baseHalfHeight: 8.5
    },
    right: {
      eye: [34, 4.5, 0],
      target: viewTarget,
      up: [0, 1, 0],
      orthographic: true,
      halfHeight: 8.5,
      baseHalfHeight: 8.5
    }
  };
  const focusedViewStates = {
    top: { target: viewTarget, distance: 28, yaw: 0, pitch: 1.48 },
    left: { target: viewTarget, distance: 28, yaw: -Math.PI / 2, pitch: 0 },
    right: { target: viewTarget, distance: 31, yaw: Math.PI / 2, pitch: 0 }
  };
  const zoomFactor = 0.6;

  const viewLabels = [
    ['original', '원래 카메라'],
    ['top', '위에서 보기'],
    ['left', '왼쪽 사이드뷰'],
    ['right', '오른쪽 사이드뷰']
  ];
  for (const [name, text] of viewLabels) {
    const label = document.createElement('span');
    label.className = 'split-view-label';
    label.dataset.view = name;
    label.textContent = text;
    viewportElement.appendChild(label);
  }

  let mode = 'single';
  let savedCameraState = null;
  let pointerStart = null;
  let pendingFocusTimer = null;

  function saveCameraState() {
    savedCameraState = {
      ...controls.state,
      target: [...controls.state.target]
    };
  }

  function restoreCameraState() {
    if (!savedCameraState) return;
    Object.assign(controls.state, savedCameraState);
    savedCameraState = null;
  }

  function setMode(nextMode) {
    mode = nextMode;
    viewportElement.classList.toggle('split', mode === 'split');
  }

  function toggleSplit() {
    if (mode === 'single') {
      setMode('split');
    } else if (mode === 'split') {
      setMode('single');
    } else {
      restoreCameraState();
      setMode('split');
    }
  }

  function focusView(name) {
    if (mode !== 'split') return;

    saveCameraState();
    if (name !== 'original') {
      const viewState = focusedViewStates[name];
      const zoom = fixedViews[name].halfHeight / fixedViews[name].baseHalfHeight;
      Object.assign(controls.state, viewState, {
        target: [...viewState.target],
        distance: viewState.distance * zoom
      });
    }
    setMode('focused');
  }

  function viewAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return y < 0.5
      ? (x < 0.5 ? 'original' : 'top')
      : (x < 0.5 ? 'left' : 'right');
  }

  function zoomInView(name) {
    if (mode === 'split' && name !== 'original') {
      const view = fixedViews[name];
      view.halfHeight = Math.max(0.5, view.halfHeight * zoomFactor);
    } else {
      controls.state.distance = Math.max(0.12, controls.state.distance * zoomFactor);
    }
    controls.state.actions++;
  }

  function zoomOutView(name) {
    if (mode === 'split' && name !== 'original') {
      const view = fixedViews[name];
      view.halfHeight = Math.min(100, view.halfHeight / zoomFactor);
    } else {
      controls.state.distance = Math.min(100, controls.state.distance / zoomFactor);
    }
    controls.state.actions++;
  }

  function drawSplitViews(width, height) {
    const leftWidth = Math.floor(width / 2);
    const bottomHeight = Math.floor(height / 2);
    const rightWidth = width - leftWidth;
    const topHeight = height - bottomHeight;

    drawView(controls.camera(), [0, bottomHeight, leftWidth, topHeight]);
    drawView(fixedViews.top, [leftWidth, bottomHeight, rightWidth, topHeight]);
    drawView(fixedViews.left, [0, 0, leftWidth, bottomHeight]);
    drawView(fixedViews.right, [leftWidth, 0, rightWidth, bottomHeight]);
  }

  viewer.render = () => {
    if (mode === 'split') {
      drawSplitViews(canvas.width, canvas.height);
    } else {
      drawView(controls.camera());
    }
  };

  window.addEventListener('keydown', event => {
    if (
      event.target instanceof HTMLElement &&
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
    ) {
      return;
    }

    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleSplit();
    } else if (event.key === 'Escape' && mode === 'split') {
      event.preventDefault();
      setMode('single');
    } else if (event.key === 'Escape' && mode === 'focused') {
      event.preventDefault();
      restoreCameraState();
      setMode('split');
    }
  });

  canvas.addEventListener('pointerdown', event => {
    pointerStart = event.button === 0
      ? { x: event.clientX, y: event.clientY }
      : null;
  });

  canvas.addEventListener('pointerup', event => {
    if (!pointerStart) return;

    const moved = Math.hypot(
      event.clientX - pointerStart.x,
      event.clientY - pointerStart.y
    );
    pointerStart = null;
    if (moved > 5 || mode !== 'split') return;

    if (pendingFocusTimer !== null) clearTimeout(pendingFocusTimer);
    const name = viewAt(event.clientX, event.clientY);
    if (!name) return;
    pendingFocusTimer = setTimeout(() => {
      pendingFocusTimer = null;
      focusView(name);
    }, 300);
  });

  canvas.addEventListener('dblclick', event => {
    if (!event.shiftKey && !event.altKey) return;

    event.preventDefault();
    if (pendingFocusTimer !== null) {
      clearTimeout(pendingFocusTimer);
      pendingFocusTimer = null;
    }

    const name = mode === 'split' ? viewAt(event.clientX, event.clientY) : 'original';
    if (!name) return;
    if (event.shiftKey) zoomInView(name);
    else zoomOutView(name);
  });

  canvas.addEventListener('pointercancel', () => {
    pointerStart = null;
  });
})();
