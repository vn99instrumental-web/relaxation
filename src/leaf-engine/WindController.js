import { perlin3 } from './noise'
import { LEAF_CONFIG, WIND_PRESETS } from './config'

const clamp01to100 = (v) => Math.min(100, Math.max(0, Number(v) || 0))
const rand = (a, b) => a + Math.random() * (b - a)

// Điều khiển gió: Wind = gió nền + dao động chậm + gust (giật) + turbulence.
// Hướng đổi TỪ TỪ (noise), gust có ramp lên/xuống, có lift & luồng dọc.
// Cung cấp lực gió tại từng điểm + các chỉ số hiện thời (cho emitter & debug).
export class WindController {
  constructor() {
    const w = LEAF_CONFIG.wind
    this.t = 0
    this.strength = 1        // hệ số từ thanh Tốc độ (0.4 .. 1.6)
    this.music = 0           // musicIntensity 0..1 (chuẩn bị cho music-reactive)

    // Tham số "tính cách" gió (preset ghi đè các giá trị này)
    this.baseWind = w.baseWind
    this.turbulence = w.turbulence
    this.gustRange = [w.gust.minStrength, w.gust.maxStrength]
    this.spawnScale = 1      // emitter đọc giá trị này (mật độ theo preset)

    // Trạng thái động
    this.dir = 0.15          // hướng gió (radian, quanh trục ngang)
    this.dirOverride = null  // nếu weather/UI ép hướng (radian) thì bám theo
    this.speed = this.baseWind

    // Gust envelope (ramp lên đỉnh rồi ramp xuống)
    this.gustVal = 0
    this.gustTimer = rand(w.gust.minInterval, w.gust.maxInterval)
    this.gustPhase = 'idle'  // idle | up | down
    this.gustPeak = 0
    this.gustElapsed = 0

    // Weather ngoài (chuẩn bị cho Real Weather API) — null nghĩa là tự mô phỏng
    this.weather = null
  }

  // --- API điều khiển (UI / weather / nhạc) ---
  setStrength(slider0to100) { this.strength = 0.4 + (clamp01to100(slider0to100) / 100) * 1.2 } // 0.4..1.6
  setBase(slider0to100) { this.setStrength(slider0to100) } // giữ tương thích tên cũ (Mưa gọi)
  setMusicIntensity(v) { this.music = Math.min(1, Math.max(0, Number(v) || 0)) }
  setDirection(deg) { this.dirOverride = (Number(deg) || 0) * Math.PI / 180 }
  setPreset(name) {
    const p = WIND_PRESETS[name] || WIND_PRESETS.breeze
    this.baseWind = p.baseWind
    this.turbulence = p.turbulence
    this.gustRange = p.gustStrength.slice()
    this.spawnScale = p.spawnScale
  }
  // Nhận số liệu thời tiết thật sau này: { windSpeed(m/s), windDirection(deg), windGust(m/s) }
  setWeather(data) {
    if (!data) { this.weather = null; return }
    this.weather = data
    if (typeof data.windDirection === 'number') this.setDirection(data.windDirection)
    if (typeof data.windSpeed === 'number') this.baseWind = Math.min(1.4, data.windSpeed / 12) // ~0..1.4
  }

  update(dt) {
    const cfg = LEAF_CONFIG.wind
    this.t += dt
    const t = this.t

    // Hướng gió trôi chậm theo noise tần số thấp (hoặc bám hướng bị ép)
    const target = this.dirOverride != null
      ? this.dirOverride
      : perlin3(t * cfg.directionDriftSpeed, 11.3, 0) * 0.9
    this.dir += (target - this.dir) * Math.min(1, dt * 0.25)

    // Dao động chậm của tốc độ nền
    const wobble = (1 - cfg.windVariation) + cfg.windVariation * (perlin3(t * 0.05, 4.1, 0) * 0.5 + 0.5)

    // --- Gust envelope: idle -> up (ramp tới đỉnh) -> down (giảm dần) ---
    if (this.gustPhase === 'idle') {
      this.gustTimer -= dt * (1 + this.music * 0.5) // nhạc mạnh -> gust dày hơn
      if (this.gustTimer <= 0) {
        this.gustPhase = 'up'; this.gustElapsed = 0
        this.gustPeak = rand(this.gustRange[0], this.gustRange[1]) * (1 + this.music * 0.2)
      }
    } else if (this.gustPhase === 'up') {
      this.gustElapsed += dt
      const k = Math.min(1, this.gustElapsed / cfg.gust.rampUp)
      this.gustVal = this.gustPeak * (k * k * (3 - 2 * k)) // smoothstep lên
      if (k >= 1) { this.gustPhase = 'down'; this.gustElapsed = 0 }
    } else if (this.gustPhase === 'down') {
      this.gustElapsed += dt
      const k = Math.min(1, this.gustElapsed / cfg.gust.rampDown)
      this.gustVal = this.gustPeak * (1 - (k * k * (3 - 2 * k))) // smoothstep xuống
      if (k >= 1) {
        this.gustVal = 0; this.gustPhase = 'idle'
        this.gustTimer = rand(cfg.gust.minInterval, cfg.gust.maxInterval)
      }
    }

    const base = this.baseWind * this.strength
    this.speed = base * wobble + this.gustVal * base
  }

  // Lực gió (vector 3D) tại điểm (x,y,z): gió nền theo hướng + turbulence + lift.
  force(x, y, z, out) {
    const cfg = LEAF_CONFIG.wind
    const s = this.speed
    const turb = this.turbulence * (1 + this.music * 0.15)
    const dirX = Math.cos(this.dir)
    // turbulence cục bộ theo vị trí + thời gian (2 lá gần nhau vẫn khác nhau)
    const nx = perlin3(x * 0.15, y * 0.15, this.t * 0.3)
    const ny = perlin3(x * 0.15 + 5.2, y * 0.15, this.t * 0.3)
    const nz = perlin3(x * 0.12, y * 0.12 + 9.1, this.t * 0.25)
    const lift = perlin3(x * 0.1 + 2.7, y * 0.08, this.t * 0.2)
    out.x = dirX * s * 3.4 + nx * s * 1.6 * turb
    out.y = ny * s * cfg.verticalAirMovement + Math.max(0, lift) * s * cfg.lift * 0.6
    out.z = nz * s * 1.0 * turb
    return out
  }

  // --- chỉ số đọc ra (emitter + debug) ---
  get magnitude() { return this.speed }
  get windSpeed() { return this.speed }
  get windDirectionDeg() { return (this.dir * 180 / Math.PI) }
  get gust() { return this.gustVal }
  get gustPeakNow() { return this.gustPhase !== 'idle' ? this.gustPeak : 0 }
}
