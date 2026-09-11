import * as THREE from 'three'

// Vật liệu cho InstancedMesh: mỗi lá lấy 1 ô trong atlas 2x2 (instanceUvOffset)
// và có độ mờ riêng (instanceAlpha) — dùng cho fade in/out + gợi chiều sâu.
// Biến đổi vị trí/xoay/kích thước lấy từ instanceMatrix (ShaderMaterial tự có).
export function createLeafMaterial(texture, tileSize = [0.5, 0.5]) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      tileSize: { value: new THREE.Vector2(tileSize[0], tileSize[1]) },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      uniform vec2 tileSize;
      attribute vec2 instanceUvOffset;
      attribute float instanceAlpha;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vUv = uv * tileSize + instanceUvOffset;
        vAlpha = instanceAlpha;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D map;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vec4 t = texture2D(map, vUv);
        float a = t.a * vAlpha;
        if (a < 0.02) discard;
        gl_FragColor = vec4(t.rgb, a);
      }
    `,
  })
}
