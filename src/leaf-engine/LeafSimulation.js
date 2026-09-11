import * as THREE from 'three'

const LEAF_TILES = [[0, 0.5], [0.5, 0.5]]   // 2 kiểu lá (nửa trên atlas)
const PETAL_TILES = [[0, 0], [0.5, 0]]      // 2 kiểu cánh hoa (nửa dưới)
const GRAV = 1.5
const AIRDRAG = 0.7
const rand = (a, b) => a + Math.random() * (b - a)

// Quản lý "hồ bơi" lá: spawn theo gió, tích phân vật lý, tái sử dụng khi ra khỏi
// khung. Ghi thẳng vào InstancedMesh (matrix) + thuộc tính instance (uv, alpha).
export class LeafSimulation {
  constructor({ mesh, uvArray, alphaArray, wind, max }) {
    this.mesh = mesh
    this.uv = uvArray
    this.alpha = alphaArray
    this.wind = wind
    this.max = max
    this.mode = 'leaves'
    this.spawnAcc = 0
    // trạng thái từng lá
    this.leaves = Array.from({ length: max }, () => ({
      active: false, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0,
      size: 1, drag: 1, spin: 0, flutter: 0,
      axis: new THREE.Vector3(), quat: new THREE.Quaternion(),
      tile: LEAF_TILES[0], alpha: 0, targetAlpha: 1,
    }))
    // bounds (perspective)
    this.camZ = 14; this.tanHalf = Math.tan((45 * Math.PI / 180) / 2); this.aspect = 1
    // tạm cho tính toán
    this._m = new THREE.Matrix4(); this._s = new THREE.Vector3()
    this._q = new THREE.Quaternion(); this._f = { x: 0, y: 0, z: 0 }
  }

  setMode(mode) { this.mode = mode }
  setBounds(camZ, fovRad, aspect) { this.camZ = camZ; this.tanHalf = Math.tan(fovRad / 2); this.aspect = aspect }

  halfH(z) { return this.tanHalf * (this.camZ - z) }

  tileForMode() {
    if (this.mode === 'leaves') return LEAF_TILES[(Math.random() * 2) | 0]
    if (this.mode === 'petals') return PETAL_TILES[(Math.random() * 2) | 0]
    return (Math.random() < 0.5 ? LEAF_TILES : PETAL_TILES)[(Math.random() * 2) | 0]
  }

  spawn(l) {
    const z = rand(-2, 8)                     // gần camera hơn -> lớn hơn (phối cảnh)
    const hh = this.halfH(z), hw = hh * this.aspect
    l.active = true
    l.pz = z
    l.px = rand(-hw * 1.05, hw * 1.05)
    l.py = hh + rand(0.4, 3)
    l.vx = rand(-0.2, 0.2); l.vy = -rand(0.5, 1.2); l.vz = rand(-0.1, 0.1)
    l.size = rand(0.4, 1.15) * (z > 5 ? 1.15 : 1)  // dải gần: to hơn chút
    l.drag = rand(0.5, 1.7)                    // độ cản gió (lá nhẹ bay nhiều hơn)
    l.spin = rand(-2.2, 2.2)
    l.flutter = rand(1.5, 3.5)
    l.axis.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize()
    l.quat.setFromEuler(new THREE.Euler(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)))
    l.tile = this.tileForMode()
    l.alpha = 0; l.targetAlpha = 1
    // dải gần mờ nhẹ (giả blur cận cảnh)
    if (z > 5) l.targetAlpha = 0.6
  }

  update(dt, cap, t) {
    const wind = this.wind
    // số lá muốn có: theo tốc độ gió (mạnh -> nhiều), giới hạn bởi cap (hiệu năng)
    const rate = 2 + wind.magnitude * 11
    this.spawnAcc += dt * rate
    let active = 0
    for (const l of this.leaves) if (l.active) active++

    for (let i = 0; i < this.max; i++) {
      const l = this.leaves[i]
      if (!l.active) {
        if (this.spawnAcc >= 1 && active < cap) { this.spawn(l); this.spawnAcc -= 1; active++ }
        else { this.alpha[i] = 0; continue }
      }
      // lực gió tại vị trí
      wind.force(l.px, l.py, l.pz, this._f)
      const ax = this._f.x * l.drag
      const ay = -GRAV + this._f.y * l.drag
      const az = this._f.z * l.drag * 0.6
      l.vx += ax * dt; l.vy += ay * dt; l.vz += az * dt
      const damp = 1 - AIRDRAG * dt
      l.vx *= damp; l.vy *= damp; l.vz *= damp
      l.px += l.vx * dt; l.py += l.vy * dt; l.pz += l.vz * dt

      // xoay: quay quanh trục riêng + rung theo gió
      const spin = l.spin + wind.magnitude * l.flutter * 0.3
      this._q.setFromAxisAngle(l.axis, spin * dt)
      l.quat.multiply(this._q).normalize()

      // fade + biên
      const hh = this.halfH(l.pz), hw = hh * this.aspect
      if (l.py < -hh - 2 || Math.abs(l.px) > hw * 1.5) l.targetAlpha = 0
      l.alpha += (l.targetAlpha - l.alpha) * Math.min(1, dt * 2.2)
      if (l.targetAlpha === 0 && l.alpha < 0.03) { l.active = false; this.alpha[i] = 0; continue }

      // ghi instance
      this._s.setScalar(l.size)
      this._m.compose(TMP_POS.set(l.px, l.py, l.pz), l.quat, this._s)
      this.mesh.setMatrixAt(i, this._m)
      this.uv[i * 2] = l.tile[0]; this.uv[i * 2 + 1] = l.tile[1]
      this.alpha[i] = l.alpha
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

const TMP_POS = new THREE.Vector3()
