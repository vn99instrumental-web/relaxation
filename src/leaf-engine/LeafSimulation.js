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
    this.flutterScale = 1
    this.fallSpeedScale = 1
    this.emitter = new LeafEmitter()
    this.activeCount = 0

    const atlas = LEAF_CONFIG.atlas
    this.leafTiles = tilesToUV(atlas, atlas.leafTiles)
    this.petalTiles = tilesToUV(atlas, atlas.petalTiles)

    this.leaves = Array.from({ length: max }, () => ({
      active: false, px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0,
      kind: 'leaf', size: 1, drag: 1, spin: 0, flutter: 0, phase: 0, flutterFreq: 1,
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
  setFlutterScale(v) { this.flutterScale = Math.max(0, Number(v) || 0) }
  setFallSpeedScale(v) { this.fallSpeedScale = Math.max(0.3, Number(v) || 1) }
  setBounds(camZ, fovRad, aspect) { this.camZ = camZ; this.tanHalf = Math.tan(fovRad / 2); this.aspect = aspect }
  halfH(z) { return this.tanHalf * (this.camZ - z) }

  tileForKind(kind) {
    const L = this.leafTiles, P = this.petalTiles
    const pickFrom = (a) => a[(Math.random() * a.length) | 0]
    return kind === 'petal' ? pickFrom(P) : pickFrom(L)
  }

  spawn(l) {
    const kind = this.mode === 'petals' || (this.mode === 'both' && Math.random() < 0.52) ? 'petal' : 'leaf'
    const cfg = kind === 'petal' ? LEAF_CONFIG.petal : LEAF_CONFIG.leaf
    const z = rand(-2, 8)                     // độ sâu Z khác nhau (phối cảnh)
    const hh = this.halfH(z), hw = hh * this.aspect
    const near = z > cfg.nearBand
    const pos = this.emitter.spawnPosition(this.wind, hw, hh) // vị trí theo hướng gió
    l.active = true
    l.kind = kind
    l.pz = z
    l.px = pos.px
    l.py = pos.py
    l.vx = rand(-0.14, 0.14); l.vy = -rand(cfg.fallSpeed[0], cfg.fallSpeed[1]) * this.fallSpeedScale; l.vz = rand(-0.08, 0.08)
    l.size = rand(cfg.size[0], cfg.size[1]) * (near ? cfg.nearScale : 1) * this.sizeScale
    l.drag = rand(cfg.drag[0], cfg.drag[1])
    l.spin = rand(cfg.spin[0], cfg.spin[1])
    l.flutter = rand(cfg.flutter[0], cfg.flutter[1]) * this.flutterScale
    l.phase = rand(0, Math.PI * 2)
    l.flutterFreq = rand(kind === 'petal' ? 0.8 : 1.05, kind === 'petal' ? 1.7 : 2.15)
    l.axis.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize()
    l.quat.setFromEuler(new THREE.Euler(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28)))
    l.tile = this.tileForKind(kind)
    l.alpha = 0
    l.targetAlpha = near ? cfg.nearAlpha : 1   // lá cận cảnh mờ nhẹ (giả blur)
  }

  update(dt, cap, t) {
    const wind = this.wind
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
      const cfg = l.kind === 'petal' ? LEAF_CONFIG.petal : LEAF_CONFIG.leaf
      // lực gió tại vị trí (đã gồm turbulence + lift)
      wind.force(l.px, l.py, l.pz, this._f)
      const flutterWave = Math.sin(t * l.flutterFreq + l.phase)
      const ax = this._f.x * l.drag * cfg.windResponse + flutterWave * cfg.flutterForce * wind.magnitude
      const ay = -cfg.gravity * this.fallSpeedScale + this._f.y * l.drag + Math.cos(t * l.flutterFreq * 0.7 + l.phase) * cfg.flutterForce * 0.12
      const az = this._f.z * l.drag * 0.6
      l.vx += ax * dt; l.vy += ay * dt; l.vz += az * dt
      const damp = Math.max(0, 1 - cfg.airDrag * dt)
      l.vx *= damp; l.vy *= damp; l.vz *= damp
      l.px += l.vx * dt; l.py += l.vy * dt; l.pz += l.vz * dt

      // xoay quanh trục riêng + rung theo gió
      const spin = l.spin + wind.magnitude * l.flutter * (0.18 + Math.abs(flutterWave) * 0.2)
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
