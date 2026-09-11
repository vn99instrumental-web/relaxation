import * as THREE from 'three'
import { LEAF_CONFIG } from './config'
import { LeafEmitter } from './LeafEmitter'

const rand = (a, b) => a + Math.random() * (b - a)

// Đổi danh sách ô [cột,hàng] trong config thành offset UV (góc dưới-trái mỗi ô).
// hàng 0 = hàng TRÊN của ảnh -> vOffset = 1-(row+1)*tileH.
function tilesToUV({ cols, rows }, list) {
  const tw = 1 / cols, th = 1 / rows
  return list.map(([c, r]) => [c * tw, 1 - (r + 1) * th])
}

// Quản lý "hồ bơi" lá: hỏi LeafEmitter xem sinh bao nhiêu (Poisson), tích phân
// vật lý theo config, tái sử dụng khi ra khỏi khung. Ghi thẳng vào InstancedMesh.
export class LeafSimulation {
  constructor({ mesh, uvArray, alphaArray, wind, max }) {
    this.mesh = mesh
    this.uv = uvArray
    this.alpha = alphaArray
    this.wind = wind
    this.max = max
    this.mode = 'leaves'
    this.sizeScale = 1
    this.emitter = new LeafEmitter()
    this.activeCount = 0

    const atlas = LEAF_CONFIG.atlas
    this.leafTiles = tilesToUV(atlas, atlas.leafTiles)
    this.petalTiles = tilesToUV(atlas, atlas.petalTiles)

    this.leaves = Array.from({ length: max }, () => ({
      active: false, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0,
      size: 1, drag: 1, spin: 0, flutter: 0,
      axis: new THREE.Vector3(), quat: new THREE.Quaternion(),
      tile: this.leafTiles[0], alpha: 0, targetAlpha: 1,
    }))
    // bounds (perspective)
    this.camZ = 14; this.tanHalf = Math.tan((45 * Math.PI / 180) / 2); this.aspect = 1
    this._m = new THREE.Matrix4(); this._s = new THREE.Vector3()
    this._q = new THREE.Quaternion(); this._f = { x: 0, y: 0, z: 0 }
  }

  setMode(mode) { this.mode = mode }
  setSizeScale(v) { this.sizeScale = v }
  setBounds(camZ, fovRad, aspect) { this.camZ = camZ; this.tanHalf = Math.tan(fovRad / 2); this.aspect = aspect }
  halfH(z) { return this.tanHalf * (this.camZ - z) }

  tileForMode() {
    const L = this.leafTiles, P = this.petalTiles
    const pickFrom = (a) => a[(Math.random() * a.length) | 0]
    if (this.mode === 'leaves') return pickFrom(L)
    if (this.mode === 'petals') return pickFrom(P)
    return Math.random() < 0.5 ? pickFrom(L) : pickFrom(P) // 'both'
  }

  spawn(l) {
    const cfg = LEAF_CONFIG.leaf
    const z = rand(-2, 8)                     // độ sâu Z khác nhau (phối cảnh)
    const hh = this.halfH(z), hw = hh * this.aspect
    const near = z > cfg.nearBand
    const pos = this.emitter.spawnPosition(this.wind, hw, hh) // vị trí theo hướng gió
    l.active = true
    l.pz = z
    l.px = pos.px
    l.py = pos.py
    l.vx = rand(-0.2, 0.2); l.vy = -rand(0.5, 1.2); l.vz = rand(-0.1, 0.1)
    l.size = rand(cfg.size[0], cfg.size[1]) * (near ? cfg.nearScale : 1) * this.sizeScale
    l.drag = rand(cfg.drag[0], cfg.drag[1])
    l.spin = rand(cfg.spin[0], cfg.spin[1])
    l.flutter = rand(cfg.flutter[0], cfg.flutter[1])
    l.axis.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize()
    l.quat.setFromEuler(new THREE.Euler(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)))
    l.tile = this.tileForMode()
    l.alpha = 0
    l.targetAlpha = near ? cfg.nearAlpha : 1   // lá cận cảnh mờ nhẹ (giả blur)
  }

  update(dt, cap, t) {
    const wind = this.wind
    const cfg = LEAF_CONFIG.leaf
    let active = 0
    for (const l of this.leaves) if (l.active) active++

    // Hỏi emitter: khung này sinh bao nhiêu lá (Poisson theo gió + availability)
    let toSpawn = this.emitter.sample(dt, wind)

    for (let i = 0; i < this.max; i++) {
      const l = this.leaves[i]
      if (!l.active) {
        if (toSpawn > 0 && active < cap) { this.spawn(l); toSpawn--; active++ }
        else { this.alpha[i] = 0; continue }
      }
      // lực gió tại vị trí (đã gồm turbulence + lift)
      wind.force(l.px, l.py, l.pz, this._f)
      const ax = this._f.x * l.drag
      const ay = -cfg.gravity + this._f.y * l.drag
      const az = this._f.z * l.drag * 0.6
      l.vx += ax * dt; l.vy += ay * dt; l.vz += az * dt
      const damp = 1 - cfg.airDrag * dt
      l.vx *= damp; l.vy *= damp; l.vz *= damp
      l.px += l.vx * dt; l.py += l.vy * dt; l.pz += l.vz * dt

      // xoay quanh trục riêng + rung theo gió
      const spin = l.spin + wind.magnitude * l.flutter * 0.3
      this._q.setFromAxisAngle(l.axis, spin * dt)
      l.quat.multiply(this._q).normalize()

      // fade + biên (recycle khi ra khỏi khung)
      const hh = this.halfH(l.pz), hw = hh * this.aspect
      if (l.py < -hh - 2 || Math.abs(l.px) > hw * 1.6) l.targetAlpha = 0
      l.alpha += (l.targetAlpha - l.alpha) * Math.min(1, dt * 2.2)
      if (l.targetAlpha === 0 && l.alpha < 0.03) { l.active = false; this.alpha[i] = 0; continue }

      // ghi instance
      this._s.setScalar(l.size)
      this._m.compose(TMP_POS.set(l.px, l.py, l.pz), l.quat, this._s)
      this.mesh.setMatrixAt(i, this._m)
      this.uv[i * 2] = l.tile[0]; this.uv[i * 2 + 1] = l.tile[1]
      this.alpha[i] = l.alpha
    }
    this.activeCount = active
    this.mesh.instanceMatrix.needsUpdate = true
  }
}

const TMP_POS = new THREE.Vector3()
