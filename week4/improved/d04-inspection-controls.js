/* d04-inspection-controls.js */

window.InspectionControls = function(canvas, options = {}) {
  const settings = {
    zoomSpeed: 0.001,
    rotationStep: 0.04,
    dragRotationSpeed: 0.005,
    panStep: 0.05, // 화면 높이의 5%만큼 키보드로 이동
    actionDebounceMs: 200,
    minDistance: 0.12,
    maxDistance: 100,
    ...options
  };

  const clampDistance = distance =>
    Math.max(settings.minDistance, Math.min(settings.maxDistance, distance));

  const clampPitch = pitch =>
    Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));

  const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

  const state = {
    target: [3, 3, 0],
    distance: 30,
    yaw: 0,
    pitch: 0.22,
    fov: 45,
    actions: 0
  };

  let actionTimer = null;

  function cancelPendingAction() {
    if (actionTimer !== null) {
      clearTimeout(actionTimer);
      actionTimer = null;
    }
  }

  // 휠과 키 반복 입력은 입력이 멈춘 뒤 한 번만 집계합니다.
  function debounceAction() {
    cancelPendingAction();
    actionTimer = setTimeout(() => {
      actionTimer = null;
      state.actions++;
    }, settings.actionDebounceMs);
  }

  function home() {
    cancelPendingAction();
    state.target = [3, 3, 0];
    state.distance = clampDistance(30);
    state.yaw = 0.6;
    state.pitch = 0.22;
    state.fov = 45;
  }

  function viewBasis(yaw, pitch) {
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);
    const sinPitch = Math.sin(pitch);
    const cosPitch = Math.cos(pitch);

    return {
      right: [cosYaw, 0, -sinYaw],
      up: [
        -sinPitch * sinYaw,
        cosPitch,
        -sinPitch * cosYaw
      ]
    };
  }

  function panTarget(horizontal, vertical, amount) {
    const { right, up } = viewBasis(state.yaw, state.pitch);

    state.target = state.target.map((value, index) =>
      value +
      horizontal * amount * right[index] +
      vertical * amount * up[index]
    );
  }

  let drag = null;

  canvas.style.touchAction = 'none';
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;

  canvas.addEventListener('contextmenu', event => event.preventDefault());

  canvas.addEventListener('pointerdown', event => {
    if (drag || ![0, 2].includes(event.button)) return;

    const rect = canvas.getBoundingClientRect();

    drag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startYaw: state.yaw,
      startPitch: state.pitch,
      startTarget: [...state.target],
      startDistance: state.distance,
      pan: event.shiftKey || event.button === 2,
      viewportHeight: Math.max(1, rect.height)
    };

    state.actions++;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (drag.pan) {
      const { right, up } = viewBasis(state.yaw, state.pitch);
      const worldPerPixel =
        2 * drag.startDistance * Math.tan(state.fov * Math.PI / 360) /
        drag.viewportHeight;

      state.target = drag.startTarget.map((value, index) =>
        value -
        deltaX * worldPerPixel * right[index] +
        deltaY * worldPerPixel * up[index]
      );
      return;
    }

    state.yaw = wrapAngle(
      drag.startYaw - deltaX * settings.dragRotationSpeed
    );
    state.pitch = clampPitch(
      drag.startPitch + deltaY * settings.dragRotationSpeed
    );
  });

  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(eventName, event => {
      if (drag?.id === event.pointerId) drag = null;
    });
  }

  canvas.addEventListener('wheel', event => {
    event.preventDefault();

    let deltaY = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) deltaY *= 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      deltaY *= Math.max(1, canvas.clientHeight);
    }

    state.distance = clampDistance(
      state.distance * Math.exp(deltaY * settings.zoomSpeed)
    );
    debounceAction();
  }, { passive: false });

  canvas.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    const step = settings.rotationStep;

    if (event.key === 'Home') {
      event.preventDefault();
      home();
      state.actions++;
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      state.distance = clampDistance(state.distance / 1.12);
      debounceAction();
      return;
    }

    if (event.key === '-') {
      event.preventDefault();
      state.distance = clampDistance(state.distance * 1.12);
      debounceAction();
      return;
    }

    const isPanKey =
      ['w', 'a', 's', 'd'].includes(key) ||
      (event.shiftKey && event.key.startsWith('Arrow'));

    if (isPanKey) {
      event.preventDefault();

      let horizontal = 0;
      let vertical = 0;

      if (key === 'a' || event.key === 'ArrowLeft') horizontal = -1;
      if (key === 'd' || event.key === 'ArrowRight') horizontal = 1;
      if (key === 'w' || event.key === 'ArrowUp') vertical = 1;
      if (key === 's' || event.key === 'ArrowDown') vertical = -1;

      const viewportHeight =
        2 * state.distance * Math.tan(state.fov * Math.PI / 360);
      panTarget(horizontal, vertical, viewportHeight * settings.panStep);
      debounceAction();
      return;
    }

    if (event.key === 'ArrowLeft') {
      state.yaw = wrapAngle(state.yaw - step);
    } else if (event.key === 'ArrowRight') {
      state.yaw = wrapAngle(state.yaw + step);
    } else if (event.key === 'ArrowUp') {
      state.pitch = clampPitch(state.pitch + step);
    } else if (event.key === 'ArrowDown') {
      state.pitch = clampPitch(state.pitch - step);
    } else {
      return;
    }

    event.preventDefault();
    debounceAction();
  });

  function camera() {
    const cosPitch = Math.cos(state.pitch);
    const sinPitch = Math.sin(pitch = state.pitch);
    const cosYaw = Math.cos(state.yaw);
    const sinYaw = Math.sin(state.yaw);

    const offset = [
      state.distance * cosPitch * sinYaw,
      state.distance * sinPitch,
      state.distance * cosPitch * cosYaw
    ];

    return {
      eye: state.target.map((value, index) => value + offset[index]),
      target: [...state.target],
      up: [0, 1, 0]
    };
  }

  home();
  return { state, home, camera };
};
