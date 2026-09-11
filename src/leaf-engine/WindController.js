import { perlin3 } from './noise'

// Điều khiển gió: hướng đổi TỪ TỪ, tốc độ đổi theo thời gian, có random GUST,
// và turbulence bằng noise. Cung cấp lực gió tại từng điểm + tốc độ hiện thời
// (để điều tiết sinh lá).
export class WindController {
  constructor() {
    this.t = 0
    this.base = 0.4        // cường độ nền (0..1) — map từ thanh trượt tốc độ
    this.dir = 0.15        // hướng gió hiện tại (rad, quanh trục ngang)
    this.speed = 0.4       // tốc độ hiện thời (0..~1.6)
    this.gust = 0          // xung gió tức thời (giảm dần)
    this.gustTimer = 3
  }

  // slider 0..100 -> cường độ nền 0.15..1.1
  setBase(slider01to100) {
    const s = Math.min(100, Math.max(0, Number(slider01to100) || 0)) / 100
    this.base = 0.15 + s * 0.95
  }

  update(dt) {
    this.t += dt
    const t = this.t
    // Hướng gió trôi chậm theo noise tần số thấp (đổi từ từ)
    const targetDir = perlin3(t * 0.02, 11.3, 0) * 0.9   // ~[-0.9,0.9] rad
    this.dir += (targetDir - this.dir) * Math.min(1, dt * 0.25)
    // Tốc độ nền dao động theo thời gian
    const wobble = 0.55 + 0.45 * (perlin3(t * 0.05, 4.1, 0) * 0.5 + 0.5)
    // Gust ngẫu nhiên
    this.gustTimer -= dt
    if (this.gustTimer <= 0) {
      this.gust = Math.max(this.gust, 0.4 + Math.random() * 0.8)
      this.gustTimer = 4 + Math.random() * 9
    }
    this.gust *= Math.exp(-dt * 0.7)                       // gust tắt dần
    this.speed = this.base * wobble + this.gust * this.base
  }

  // Lực gió (vector 3D) tại điểm (x,y,z) — gió nền theo hướng + turbulence noise.
  force(x, y, z, out) {
    const s = this.speed
    const dirX = Math.cos(this.dir)
    // turbulence
    const nx = perlin3(x * 0.15, y * 0.15, this.t * 0.3)
    const ny = perlin3(x * 0.15 + 5.2, y * 0.15, this.t * 0.3)
    const nz = perlin3(x * 0.12, y * 0.12 + 9.1, this.t * 0.25)
    out.x = dirX * s * 3.4 + nx * s * 1.6
    out.y = ny * s * 0.9                    // gió chỉ nhiễu nhẹ theo chiều dọc
    out.z = nz * s * 1.0
    return out
  }

  get magnitude() { return this.speed }
}
