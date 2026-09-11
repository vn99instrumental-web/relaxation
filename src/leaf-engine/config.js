// ╔══════════════════════════════════════════════════════════════════╗
// ║  BẢNG ĐIỀU KHIỂN TRUNG TÂM CỦA HIỆU ỨNG LÁ / HOA / MƯA            ║
// ║  Chỉ cần sửa các số trong file này để tinh chỉnh — không phải     ║
// ║  đụng vào các file logic khác.                                    ║
// ╚══════════════════════════════════════════════════════════════════╝
export const LEAF_CONFIG = {
  // ---- GIÓ ----
  wind: {
    baseWind: 0.45,            // cường độ gió nền (0..1) khi thanh Tốc độ ở giữa
    windVariation: 0.45,       // biên dao động CHẬM của tốc độ gió (0..1)
    directionDriftSpeed: 0.02, // tốc độ ĐỔI HƯỚNG gió (nhỏ = đổi càng chậm)
    turbulence: 1.0,           // hệ số nhiễu cục bộ (local turbulence)
    lift: 0.9,                 // lực NÂNG (thỉnh thoảng đẩy lá lên nhẹ)
    verticalAirMovement: 0.35, // luồng khí theo chiều dọc
    gust: {                    // GIÓ GIẬT
      minInterval: 4,          // giây — khoảng cách tối thiểu giữa 2 đợt gust
      maxInterval: 13,         // giây — tối đa
      minStrength: 0.4,        // biên độ gust nhỏ nhất
      maxStrength: 1.1,        // biên độ gust lớn nhất
      rampUp: 0.8,             // giây tăng dần tới đỉnh
      rampDown: 2.6,           // giây giảm dần về 0
    },
  },

  // ---- SINH LÁ (xác suất, kiểu Poisson) ----
  emit: {
    baseRate: 3.0,             // TB lá/giây ở gió tham chiếu (λ gốc của Poisson)
    windExponent: 1.7,         // λ tỉ lệ với windSpeed^exp (gió mạnh -> nhiều hơn)
    gustBurst: 1.9,            // nhân λ khi đang ở đỉnh gust (tạo cụm lá)
    availability: {            // "lượng lá còn có thể tách khỏi cây"
      recovery: 0.18,          // hồi phục mỗi giây
      consumption: 0.010,      // hao mỗi chiếc lá được sinh ra
      gustCost: 0.10,          // hao thêm khi có gust mạnh
      floor: 0.12,             // sàn — không bao giờ cạn hẳn
    },
  },

  // ---- VẬT LÝ TỪNG CHIẾC LÁ ----
  leaf: {
    gravity: 1.5,              // trọng lực
    airDrag: 0.7,             // cản không khí (giảm tốc)
    flutter: [1.5, 3.5],       // biên độ chao/rung (min,max)
    spin: [-2.2, 2.2],         // tốc độ xoay quanh trục (min,max)
    drag: [0.5, 1.7],          // độ nhạy gió mỗi lá (min,max)
    size: [0.4, 1.15],         // kích thước cơ bản (min,max)
    nearBand: 5,               // z > giá trị này => lá "cận cảnh"
    nearScale: 1.15,           // lá cận cảnh to hơn
    nearAlpha: 0.6,            // lá cận cảnh mờ hơn (giả blur)
  },

  // ---- HIỆU NĂNG (3 mức chất lượng) ----
  performance: {
    high:   { maxLeaves: 180, dpr: 2,    antialias: true },
    medium: { maxLeaves: 100, dpr: 1.5,  antialias: true },
    low:    { maxLeaves: 50,  dpr: 1.25, antialias: false },
    mobileScale: 0.55,        // nhân trần lá trên thiết bị cảm ứng nhỏ
  },

  // ---- ATLAS TEXTURE (nhiều kiểu lá + cánh hoa trong 1 ảnh) ----
  atlas: {
    url: 'leaves/leaf-atlas-v2.webp',
    cols: 4, rows: 2,                                   // lưới ô
    // Vị trí ô [cột, hàng] — hàng 0 là hàng TRÊN của ảnh
    leafTiles: [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [3, 1]], // 6 kiểu lá
    petalTiles: [[0, 1], [1, 1]],                                // 2 kiểu cánh hoa
  },
}

// ---- PRESET GIÓ (đặt sẵn "tính cách" gió; UI đổi nhanh, sau nối weather) ----
export const WIND_PRESETS = {
  calm:   { label: 'Lặng gió', baseWind: 0.16, turbulence: 0.7, gustStrength: [0.15, 0.45], spawnScale: 0.4 },
  breeze: { label: 'Gió nhẹ',  baseWind: 0.40, turbulence: 1.0, gustStrength: [0.40, 0.90], spawnScale: 1.0 },
  windy:  { label: 'Gió mạnh', baseWind: 0.72, turbulence: 1.3, gustStrength: [0.60, 1.20], spawnScale: 1.8 },
  storm:  { label: 'Bão',      baseWind: 1.00, turbulence: 1.7, gustStrength: [0.90, 1.70], spawnScale: 3.0 },
}

export const PRESET_ORDER = ['calm', 'breeze', 'windy', 'storm']
