import { LEAF_CONFIG } from './config'

const rand = (a, b) => a + Math.random() * (b - a)
const REF_WIND = 0.45 // gió tham chiếu (ứng với baseRate)

// Số sự kiện trong 1 khung theo phân phối Poisson (thuật toán Knuth).
// Nhờ vậy số lá KHÔNG cố định: cùng một mức gió, mỗi giây ra số lá khác nhau.
function poisson(lambda) {
  if (lambda <= 0) return 0
  if (lambda > 20) {                       // λ lớn -> xấp xỉ chuẩn cho nhẹ máy
    const g = Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(6.283 * Math.random())
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * g))
  }
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= Math.random() } while (p > L)
  return k - 1
}

// Bộ phát lá: quyết định KHI NÀO và BAO NHIÊU lá xuất hiện, dựa trên gió +
// "lượng lá còn có thể tách khỏi cây" (leafAvailability) để tránh spam vô hạn.
export class LeafEmitter {
  constructor() {
    this.availability = 1   // 0..1 — lượng lá sẵn sàng rời cây
    this.lastLambda = 0     // (debug) λ khung gần nhất
  }

  reset() { this.availability = 1 }

  // Trả về SỐ LÁ cần sinh trong khung này (số nguyên, thường 0/1/2…).
  sample(dt, wind) {
    const e = LEAF_CONFIG.emit
    const wf = Math.pow(Math.max(0, wind.windSpeed) / REF_WIND, e.windExponent) // gió mạnh -> nhiều
    const gustMul = wind.gust > 0.01 ? 1 + (e.gustBurst - 1) * Math.min(1, wind.gust) : 1
    const scale = wind.spawnScale || 1
    const lambda = e.baseRate * scale * wf * this.availability * gustMul * dt
    this.lastLambda = lambda / Math.max(1e-6, dt) // ~ lá/giây (cho debug)
    const n = poisson(lambda)

    // Cập nhật availability: hồi phục dần, hao theo số lá đã sinh + theo gust.
    const a = e.availability
    this.availability += a.recovery * dt * (1 - this.availability)
    this.availability -= n * a.consumption
    if (wind.gust > 0.3) this.availability -= a.gustCost * wind.gust * dt
    this.availability = Math.max(a.floor, Math.min(1, this.availability))
    return n
  }

  // Vị trí spawn thiên theo HƯỚNG GIÓ: lá bay VÀO màn hình từ phía đầu gió
  // (một phần ngoài viewport để vào tự nhiên). hw/hh = nửa bề rộng/cao khung ở độ sâu z.
  spawnPosition(wind, hw, hh) {
    const dirX = Math.cos(wind.windDirectionDeg * Math.PI / 180)
    const fromSide = Math.random() < Math.min(0.6, Math.abs(dirX) * 0.75)
    if (fromSide) {
      // gió thổi sang phải (dirX>0) -> vào từ biên TRÁI; ngược lại vào từ PHẢI
      const px = (dirX > 0 ? -1 : 1) * hw * rand(1.0, 1.18)
      const py = rand(-hh * 0.2, hh * 1.0)
      return { px, py }
    }
    // còn lại rơi từ phía trên, lệch nhẹ ngược hướng gió
    const px = rand(-hw * 1.05, hw * 1.05) - dirX * hw * 0.25
    const py = hh + rand(0.3, 3)
    return { px, py }
  }
}
