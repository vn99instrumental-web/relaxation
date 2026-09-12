import * as THREE from 'three'

// Vật liệu cho mưa: mỗi hạt là 1 vệt mảnh. Không dùng ảnh — vẽ thẳng bằng shader:
// sáng ở giữa, mờ dần hai đầu (như vệt nước chuyển động). Độ mờ riêng từng hạt.
export function createRainMaterial(variant = 'rain') {
  // Mưa phùn hơi xám-lam & mờ hơn để giống màn sương lất phất.
  const color = variant === 'drizzle'
    ? new THREE.Color(0.84, 0.89, 0.97)
    : new THREE.Color(0.80, 0.86, 0.96)
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: color } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute float instanceAlpha;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vUv = uv;
        vAlpha = instanceAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 color;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        // dọc theo vệt: mờ dần ở hai đầu; ngang: sáng ở lõi, tắt ở mép
        float along = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
        float across = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
        float a = along * across * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(color, a);
      }
    `,
  })
}
