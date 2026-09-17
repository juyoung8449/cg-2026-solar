깃허브 Readme나 과제 제출 보고서에 그대로 복사해서 붙여넣을 수 있도록 깔끔하게 정리해 드립니다.

---

# 📌 WebGL 행렬 변환 순서에 따른 자전 및 공전 구현 보고서

## 1. 개요

3D 그래픽스에서 정점(Vertex) 위치 벡터에 변환 행렬을 곱할 때, 행렬 연산의 적용 순서에 따라 물체의 최종 위치 및 움직임 형태(자전 vs 공전)가 어떻게 변화하는지 비교·분석한다.

---

## 2. 핵심 원리: 행렬과 벡터 곱의 "오른쪽부터 적용"

3D 공간의 정점 위치 벡터 $\mathbf{p}$에 변환 행렬을 곱할 때의 기본 수식은 다음과 같다.

$$\mathbf{p}' = \mathbf{M} \cdot \mathbf{p}$$

두 개의 변환 행렬 $A$와 $B$를 곱하여 하나의 Model 행렬을 구성할 때 연산 순서는 아래와 같이 전개된다.

$$\mathbf{p}' = (A \cdot B) \cdot \mathbf{p} = A \cdot (B \cdot \mathbf{p})$$

* **연산 순서:** 괄호의 결합 법칙에 의해 정점 벡터 $\mathbf{p}$와 **가장 가까운 오른쪽 행렬 $B$가 먼저 적용**된 후, 그 결과에 **왼쪽 행렬 $A$가 순차적으로 적용**된다.

---

## 3. 연산 순서에 따른 동작 비교

### ① 제자리 회전 (자전, Rotation)

* **코드:**
```javascript
const model = M4.multiply(M4.translate(0, 1.9, 0), M4.rotateY(time * 0.8));

```


* **수식:** $\mathbf{Model} = \text{Translate} \cdot \text{Rotate}$
* **적용 순서:** $\text{Rotate(회전)} \rightarrow \text{Translate(이동)}$
* **원리 설명:**
1. 원점에 있는 구체 자체에 오른쪽의 **회전 변환($\text{Rotate}$)이 먼저 적용**되어 중심축을 기준으로 제자리에서 돈다.
2. 회전된 상태의 구체가 왼쪽의 **이동 변환($\text{Translate}$)에 의해 위($Y = 1.9$)로 이동**한다.
3. 결과적으로 구체는 높이 $1.9$ 지점에서 제자리 회전하는 **자전** 운동을 보인다.



---

### ② 궤도 회전 (공전, Revolution)

* **코드:**
```javascript
const model = M4.multiply(M4.rotateY(time * 0.8), M4.translate(0, 1.9, 0));

```


* **수식:** $\mathbf{Model} = \text{Rotate} \cdot \text{Translate}$
* **적용 순서:** $\text{Translate(이동)} \rightarrow \text{Rotate(회전)}$
* **원리 설명:**
1. 오른쪽의 **이동 변환($\text{Translate}$)이 먼저 적용**되어 구체가 원점에서 위($Y = 1.9$)로 이동하며 회전 중심축으로부터 이격된다.
2. 축에서 떨어진 상태에서 왼쪽의 **회전 변환($\text{Rotate}$)이 적용**되어, 원점(Y축)을 기준으로 구체 전체를 돌린다.
3. 결과적으로 구체는 중심축과의 거리를 유지한 채 큰 원을 그리며 도는 **공전** 운동을 보인다.



---

## 4. 요약 및 결론

* Matrix-Vector 곱셈의 특성상 **오른쪽에 위치한 변환이 먼저 수행**된다.
* 이동 후 회전을 적용($\text{Rotate} \cdot \text{Translate}$)하면 물체가 회전축으로부터 떨어진 상태로 회전하므로 **공전 효과**가 발생한다.






# 8단계 코드
#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;

uniform float uTime;
out vec4 fragColor;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.45, 0.8, 0.35));

  float diff = max(dot(N, L), 0.0);
  float toonDiff = floor(diff * 4.0) / 4.0; // 계단식 음영 적용

  fragColor = vec4(vColor * (0.3 + 0.7 * toonDiff), 1.0);
}
