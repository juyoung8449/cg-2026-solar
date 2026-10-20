# 6주차 실습

`task1.html`은 TODO 1~5(색상 텍스처, 직접광 PBR, ARM 맵, normal map, 환경 반사)를 적용한 완성 단계입니다.
재질 선택 메뉴에서 나무, 녹슨 금속, 돌의 재질 특성을 비교할 수 있습니다.

`task2.html`에서는 UV가 포함된 구 메시를 행성에 사용하고, week5의 절차적 태양 셰이더를 가져와 태양과의 거리를 슬라이더로 조절하면서 행성은 제자리에서 자전하게 그립니다. 가까운 구간에는 `rocky_terrain_02_4k`, 먼 구간에는 `gravelly_sand_4k` 재질이 섞이고, 가까울수록 물과 반사가 증가합니다. 주위 먼지 집적도 슬라이더는 별도 고리 메시를 조절하며, 결과 메뉴에서 PBR 재질, 물·대륙 분포, 행성 고리 마스크를 확인할 수 있습니다.

두 새 에셋의 색상 JPG와 변위 PNG를 사용합니다. 제공된 노멀·러프니스 EXR은 브라우저의 기본 이미지 로더가 지원하지 않고 별도 ARM 맵은 포함되어 있지 않아, 셰이더에서 변위로 노멀을 재구성하고 AO/roughness/metallic 기본값으로 ARM 텍스처를 만듭니다.

VS Code Live Server 또는 `python -m http.server`로 `task1.html`이나 `task2.html`을 엽니다.

텍스처: Poly Haven CC0 (https://polyhaven.com/license).
assets/week06/sources.json에 각 파일 출처가 있습니다. 환경 이미지는 LDR 미리보기입니다.
