아래 코드는 기존 기능에 조작 안내, 키보드 포커스, 두 손가락 확대·축소/이동, 마우스 커서 기준 확대·축소, 회전 제한, 상태 변경 콜백, 이벤트 정리 기능을 추가한 버전입니다.

```javascript
// ...existing code...
window.InspectionControls = function(canvas, options = {}) {
  const initialTarget = options.target ?? [3, 3, 0];
  const initialDistance = options.distance ?? 30;
  const fov = options.fov ?? 45;
  const minDistance = options.minDistance ?? 0.12;
  const maxDistance = options.maxDistance ?? 100;
  const maxPitch = options.maxPitch ?? Math.PI * 0.48;

  const normalize = v => {
    const n = Math.hypot(...v) || 1;
    return v.map(x => x / n);
  };

  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];

  const mul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];

  const rotate = (q, v) =>
    mul(mul(q, [...v, 0]), [-q[0], -q[1], -q[2], q[3]]).slice(0, 3);

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

  const state = {
    target: [...initialTarget],
    distance: initialDistance,
    rotation: [0, 0, 0, 1],
    fov,
    actions: 0
  };

  // 위아래 회전 각도를 제한하고 화면의 수평을 유지합니다.
  function constrainRotation(q) {
    const direction = rotate(q, [0, 0, 1]);
    const pitch = clamp(Math.asin(clamp(direction[1], -1, 1)), -maxPitch, maxPitch);
    const yaw = Math.atan2(direction[0], direction[2]);

    const yawRotation = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
    const pitchRotation = [Math.sin(-pitch / 2), 0, 0, Math.cos(pitch / 2)];

    return normalize(mul(yawRotation, pitchRotation));
  }

  function resetState() {
    state.target = [...initialTarget];
    state.distance = initialDistance;

    const yaw = [0, Math.sin(0.3), 0, Math.cos(0.3)];
    const pitch = [Math.sin(-0.22), 0, 0, Math.cos(0.22)];
    state.rotation = constrainRotation(mul(yaw, pitch));
  }

  function camera() {
    const offset = rotate(state.rotation, [0, 0, state.distance]);

    return {
      eye: state.target.map((v, i) => v + offset[i]),
      target: [...state.target],
      up: rotate(state.rotation, [0, 1, 0])
    };
  }

  function notify() {
    options.onChange?.(camera(), state);
  }

  const originalTouchAction = canvas.style.touchAction;
  const originalTabindex = canvas.getAttribute('tabindex');
  const originalAriaLabel = canvas.getAttribute('aria-label');

  canvas.style.touchAction = 'none';

  if (!canvas.hasAttribute('tabindex')) {
    canvas.setAttribute('tabindex', '0');
  }
  if (!canvas.hasAttribute('aria-label')) {
    canvas.setAttribute('aria-label', '3D 장면. 방향키로 회전, Home 키로 초기화');
  }

  const help = options.showHelp === false
    ? null
    : canvas.ownerDocument.createElement('div');

  if (help) {
    help.textContent =
      '드래그: 회전 · Shift/오른쪽 드래그: 이동 · 휠: 확대/축소 · Home: 초기화 · 터치: 한 손가락 회전, 두 손가락 이동/확대';
    help.style.cssText = 'font-size:12px; opacity:.75; margin-top:4px;';
    canvas.insertAdjacentElement('afterend', help);
  }

  const abortController = new AbortController();
  const listenerOptions = { signal: abortController.signal };
  const pointers = new Map();

  let gesture = null;
  let destroyed = false;

  function pointFromEvent(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function sphere(point) {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(1, Math.min(rect.width, rect.height));
    const x = (2 * (point.x - rect.left) - rect.width) / size;
    const y = (rect.height - 2 * (point.y - rect.top)) / size;
    const d = x * x + y * y;

    return d <= 1
      ? [x, y, Math.sqrt(1 - d)]
      : normalize([x, y, 0]);
  }

  function rebaseGesture() {
    const entries = [...pointers.entries()];

    if (entries.length === 1) {
      const [id, pointer] = entries[0];
      gesture = {
        mode: pointer.pan ? 'pan' : 'rotate',
        id,
        point: sphere(pointer),
        x: pointer.x,
        y: pointer.y,
        rotation: [...state.rotation],
        target: [...state.target]
      };
      return;
    }

    if (entries.length === 2) {
      const [a, b] = entries.map(([, pointer]) => pointer);
      gesture = {
        mode: 'pinch',
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        separation: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        distance: state.distance,
        rotation: [...state.rotation],
        target: [...state.target]
      };
      return;
    }

    gesture = null;
  }

  function panTarget(target, rotation, dx, dy, distance) {
    const rect = canvas.getBoundingClientRect();
    const unit = 2 * distance * Math.tan(state.fov * Math.PI / 360) /
      Math.max(1, rect.height);
    const right = rotate(rotation, [1, 0, 0]);
    const up = rotate(rotation, [0, 1, 0]);

    return target.map((value, i) =>
      value - dx * unit * right[i] + dy * unit * up[i]
    );
  }

  function zoomAt(clientX, clientY, factor) {
    const rect = canvas.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const right = rotate(state.rotation, [1, 0, 0]);
    const up = rotate(state.rotation, [0, 1, 0]);
    const oldUnit = 2 * state.distance * Math.tan(state.fov * Math.PI / 360) /
      Math.max(1, rect.height);
    const anchor = state.target.map((value, i) =>
      value + dx * oldUnit * right[i] - dy * oldUnit * up[i]
    );

    state.distance = clamp(state.distance * factor, minDistance, maxDistance);

    const newUnit = 2 * state.distance * Math.tan(state.fov * Math.PI / 360) /
      Math.max(1, rect.height);

    state.target = anchor.map((value, i) =>
      value - dx * newUnit * right[i] + dy * newUnit * up[i]
    );
  }

  canvas.addEventListener('contextmenu', event => event.preventDefault(), listenerOptions);

  canvas.addEventListener('pointerdown', event => {
    if (pointers.size >= 2 || (event.pointerType === 'mouse' && ![0, 2].includes(event.button))) {
      return;
    }

    pointers.set(event.pointerId, {
      ...pointFromEvent(event),
      pan: event.shiftKey || event.button === 2
    });

    state.actions++;
    rebaseGesture();

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // 브라우저가 포인터 캡처를 지원하지 않으면 계속 진행합니다.
    }
  }, listenerOptions);

  canvas.addEventListener('pointermove', event => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer || !gesture) return;

    const previousX = pointer.x;
    const previousY = pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    if (gesture.mode === 'rotate') {
      const current = sphere(pointer);
      const dot = current.reduce((sum, value, i) => sum + value * gesture.point[i], 0);
      let delta = [...cross(current, gesture.point), 1 + dot];

      if (Math.hypot(...delta) < 1e-7) {
        const axis = normalize(cross(
          current,
          Math.abs(current[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
        ));
        delta = [...axis, 0];
      }

      state.rotation = constrainRotation(
        mul(gesture.rotation, normalize(delta))
      );
    } else if (gesture.mode === 'pan') {
      state.target = panTarget(
        gesture.target,
        gesture.rotation,
        event.clientX - gesture.x,
        event.clientY - gesture.y,
        state.distance
      );
    } else if (gesture.mode === 'pinch') {
      const entries = [...pointers.values()];
      if (entries.length !== 2) return;

      const [a, b] = entries;
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const separation = Math.hypot(a.x - b.x, a.y - b.y) || 1;

      state.distance = clamp(
        gesture.distance * gesture.separation / separation,
        minDistance,
        maxDistance
      );

      state.rotation = gesture.rotation;
      state.target = panTarget(
        gesture.target,
        gesture.rotation,
        center.x - gesture.center.x,
        center.y - gesture.center.y,
        gesture.distance
      );
    }

    // 좌표가 실제로 바뀐 경우에만 변경을 알립니다.
    if (previousX !== pointer.x || previousY !== pointer.y) {
      notify();
    }
  }, listenerOptions);

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    rebaseGesture();
  }

  canvas.addEventListener('pointerup', endPointer, listenerOptions);
  canvas.addEventListener('pointercancel', endPointer, listenerOptions);
  canvas.addEventListener('lostpointercapture', endPointer, listenerOptions);

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, Math.exp(event.deltaY * 0.001));
    state.actions++;
    notify();
  }, { ...listenerOptions, passive: false });

  canvas.addEventListener('keydown', event => {
    const zoomInKeys = ['+', '=', ']'];
    const zoomOutKeys = ['-', '_', '['];
    const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

    if (!arrowKeys.includes(event.key) &&
        !zoomInKeys.includes(event.key) &&
        !zoomOutKeys.includes(event.key) &&
        event.key !== 'Home') {
      return;
    }

    event.preventDefault();
    state.actions++;

    if (event.key === 'Home') {
      home();
      return;
    }

    if (zoomInKeys.includes(event.key)) {
      zoomAt(
        canvas.getBoundingClientRect().left + canvas.clientWidth / 2,
        canvas.getBoundingClientRect().top + canvas.clientHeight / 2,
        1 / 1.12
      );
    } else if (zoomOutKeys.includes(event.key)) {
      zoomAt(
        canvas.getBoundingClientRect().left + canvas.clientWidth / 2,
        canvas.getBoundingClientRect().top + canvas.clientHeight / 2,
        1.12
      );
    } else if (event.shiftKey) {
      const step = 20;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      state.target = panTarget(state.target, state.rotation, dx, dy, state.distance);
    } else {
      const yaw = event.key === 'ArrowLeft' ? 0.06 :
        event.key === 'ArrowRight' ? -0.06 : 0;
      const pitch = event.key === 'ArrowUp' ? 0.06 :
        event.key === 'ArrowDown' ? -0.06 : 0;

      state.rotation = constrainRotation(
        mul(state.rotation, normalize([pitch, yaw, 0, 1]))
      );
    }

    notify();
  }, listenerOptions);

  function home() {
    pointers.clear();
    gesture = null;
    resetState();
    notify();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;

    for (const pointerId of pointers.keys()) {
      try {
        canvas.releasePointerCapture(pointerId);
      } catch {
        // 이미 해제된 포인터는 무시합니다.
      }
    }

    pointers.clear();
    abortController.abort();
    help?.remove();

    canvas.style.touchAction = originalTouchAction;

    if (originalTabindex === null) canvas.removeAttribute('tabindex');
    else canvas.setAttribute('tabindex', originalTabindex);

    if (originalAriaLabel === null) canvas.removeAttribute('aria-label');
    else canvas.setAttribute('aria-label', originalAriaLabel);
  }

  resetState();
  return { state, home, camera, destroy };
};
// ...existing code...
```

`options.onChange(camera, state)`에서 렌더링을 갱신하면 됩니다. 관성 회전은 조작 예측성을 우선해 이 버전에는 넣지 않았습니다.
