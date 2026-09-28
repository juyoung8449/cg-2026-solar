<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Improved Solar System - Diagonal Control</title>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background-color: #000;
        }
        canvas {
            display: block;
        }
    </style>
</head>
<body>

<!-- Three.js 라이브러리 (사용 중인 라이브러리 경로에 맞게 유지) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<script>
    // 1. 기본 Scene, Camera, Renderer 설정
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 임시 메쉬 (태양계/오브젝트 예시)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    // ==========================================
    // 2. 대각선 마우스 이동 핵심 구현 로직
    // ==========================================
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    // 회전 계산 시 YXZ 순서를 지정해야 대각선으로 움직일 때 화면이 꼬이지 않습니다.
    cube.rotation.reorder('YXZ'); // 카메라를 직접 돌리신다면 camera.rotation.reorder('YXZ'); 로 변경

    const sensitivity = 0.005; // 마우스 감도

    window.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // 가로(X), 세로(Y) 이동량 동시에 계산
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        // X축 이동 -> Y축 회전(좌우)
        // Y축 이동 -> X축 회전(상하)
        // 대각선 이동 시 deltaX와 deltaY가 동시에 존재하므로 부드럽게 대각선으로 회전합니다.
        cube.rotation.y += deltaX * sensitivity;
        cube.rotation.x += deltaY * sensitivity;

        // 상하 회전 각도 제한 (화면이 뒤집히는 것 방지)
        const maxPitch = Math.PI / 2 - 0.05;
        cube.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, cube.rotation.x));

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // 창 크기 변경 대응
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 애니메이션 루프
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
</script>
</body>
</html>
