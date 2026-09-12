import * as THREE from 'three'

const rand = (a, b) => a + Math.random() * (b - a)

// Thông số riêng cho từng kiểu: mưa rào (streak dài, nhanh) & mưa phùn (hạt li ti,
// chậm, mờ, bay lất phất theo gió). Giữ cùng một bộ máy để nhẹ máy.
const VARIANTS = {
  rain: {
    lenMin: 0.55, lenMax: 1.2, widMin: 0.016, widMax: 0.034,
    vyMin: 9, vyMax: 15, vyGain: 0.6, near: 1.35,
    alphaNear: 0.42, alphaMin: 0.52, alphaMax: 0.85,
    rateBase: 60, rateWind: 30, windPush: 0.4, drift: 0, sway: 0,
  },
  drizzle: {
    // hạt ngắn & mảnh hơn nhiều, rơi chậm, mờ -> cảm giác sương mưa lất phất
    lenMin: 0.12, lenMax: 0.26, widMin: 0.009, widMax: 0.016,
    vyMin: 3.2, vyMax: 5.6, vyGain: 0.2, near: 1.15,
    alphaNear: 0.15, alphaMin: 0.18, alphaMax: 0.34,
    rateBase: 190, rateWind: 46, windPush: 0.95, drift: 0.55, sway: 0.9,
  },
}

// Mô phỏng mưa: các vệt mảnh rơi nhanh, gần thẳng đứng, hơi xiên theo gió.
// Ghi thẳng vào InstancedMesh (matrix: vị trí + nghiêng + kích thước) và mảng alpha.
export class RainSimulation {
  constructor({ mesh, alphaArray, wind, max, variant = 'rain' }) {
    this.mesh = mesh
    this.alpha = alphaArray
    this.wind = wind
    this.max = max
    this.variant = VARIANTS[variant] ? variant : 'rain'
    this.spawnAcc = 0
    this.intensity = 1   // cường độ mưa (từ thanh tốc độ)
    this.sizeScale = 1   // kích thước hạt (từ thanh kích thước)
    this.drops = Array.from({ length: max }, () => ({
      active: false, px: 0, py: 0, pz: 0, vx: 0, vy: 0, phase: 0,
      len: 1, wid: 0.02, tilt: 0, alpha: 0, targetAlpha: 1,
    }))
    this.camZ = 14; this.tanHalf = Math.tan((45 * Math.PI / 180) / 2); this.aspect = 1
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3()
    this._pos = new THREE.Vector3(); this._axisZ = new THREE.Vector3(0, 0, 1)
    this._f = { x: 0, y: 0, z: 0 }
  }

  setVariant(v) { if (VARIANTS[v]) this.variant = v }
  setIntensity(v) { this.intensity = v }
  setSizeScale(v) { this.sizeScale = v }
  setBounds(camZ, fovRad, aspect) { this.camZ = camZ; this.tanHalf = Math.tan(fovRad / 2); this.aspect = aspect }
  halfH(z) { return this.tanHalf * (this.camZ - z) }

  spawn(d) {
    const V = VARIANTS[this.variant]
    const z = rand(-2, 7)
    const hh = this.halfH(z), hw = hh * this.aspect
    const near = z > 5
    d.active = true
    d.pz = z
    d.px = rand(-hw * 1.1, hw * 1.1)
    d.py = hh + rand(0.3, 4)
    d.phase = rand(0, Math.PI * 2)
    d.len = rand(V.lenMin, V.lenMax) * (near ? V.near : 1) * (0.8 + 0.5 * this.intensity) * this.sizeScale
    d.wid = rand(V.widMin, V.widMax) * (near ? 1.4 : 1) * this.sizeScale
    d.vy = -rand(V.vyMin, V.vyMax) * (0.7 + V.vyGain * this.intensity)
    d.vx = 0
    d.tilt = 0
    d.alpha = 0
    d.targetAlpha = near ? V.alphaNear : rand(V.alphaMin, V.alphaMax)
  }

  update(dt, cap, t) {
    const wind = this.wind
    const V = VARIANTS[this.variant]
    const rate = (V.rateBase + wind.magnitude * V.rateWind) * this.intensity
    this.spawnAcc += dt * rate
    let active = 0
    for (const d of this.drops) if (d.active) active++

    for (let i = 0; i < this.max; i++) {
      const d = this.drops[i]
      if (!d.active) {
        if (this.spawnAcc >= 1 && active < cap) { this.spawn(d); this.spawnAcc -= 1; active++ }
        else { this.alpha[i] = 0; continue }
      }
      // gió đẩy ngang; mưa phùn nhẹ nên bị cuốn nhiều hơn, lại thêm chút lất phất
      wind.force(d.px, d.py, d.pz, this._f)
      const drift = V.sway ? Math.sin(t * 1.6 + d.phase) * V.sway : 0
      d.vx += (this._f.x * V.windPush + drift - d.vx) * Math.min(1, dt * 3)
      d.px += (d.vx + V.drift * this._f.x) * dt
      d.py += d.vy * dt
      d.tilt = Math.atan2(d.vx, -d.vy)   // nghiêng theo hướng rơi

      const hh = this.halfH(d.pz), hw = hh * this.aspect
      if (d.py < -hh - 1 || Math.abs(d.px) > hw * 1.5) d.targetAlpha = 0
      d.alpha += (d.targetAlpha - d.alpha) * Math.min(1, dt * 6)
      if (d.targetAlpha === 0 && d.alpha < 0.02) { d.active = false; this.alpha[i] = 0; continue }

      this._q.setFromAxisAngle(this._axisZ, d.tilt)
      this._s.set(d.wid, d.len, 1)
      this._m.compose(this._pos.set(d.px, d.py, d.pz), this._q, this._s)
      this.mesh.setMatrixAt(i, this._m)
      this.alpha[i] = d.alpha
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }
}
