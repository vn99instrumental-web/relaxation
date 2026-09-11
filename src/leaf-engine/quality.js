// Dò khả năng thiết bị -> hồ sơ chất lượng cho LeafEngine.
export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')))
  } catch { return false }
}

export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// Chọn tier theo RAM, số nhân CPU, cảm ứng, kích thước màn hình.
export function pickProfile() {
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  const touch = matchMedia('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 620
  const dpr = window.devicePixelRatio || 1

  let tier = 'high'
  if (touch || small) tier = 'mid'
  if (mem <= 3 || cores <= 4 || (touch && small)) tier = 'low'

  const P = {
    high: { maxLeaves: 140, dpr: Math.min(2, dpr), antialias: true, blur: true },
    mid: { maxLeaves: 70, dpr: Math.min(1.5, dpr), antialias: true, blur: false },
    low: { maxLeaves: 34, dpr: Math.min(1.25, dpr), antialias: false, blur: false },
  }
  return { tier, ...P[tier] }
}

// Bộ tự điều tiết: theo dõi thời gian khung, giảm/khôi phục số lá hoạt động.
export function makeAdaptive(maxLeaves) {
  let ema = 16              // ms/khung trung bình động
  let cap = maxLeaves       // trần lá hoạt động hiện thời
  let cooldown = 0
  return {
    get cap() { return Math.round(cap) },
    tick(deltaMs) {
      ema = ema * 0.9 + Math.min(100, deltaMs) * 0.1
      cooldown -= deltaMs
      if (cooldown > 0) return
      if (ema > 26 && cap > 12) { cap *= 0.85; cooldown = 1200 }       // ~<38fps: giảm
      else if (ema < 15 && cap < maxLeaves) { cap = Math.min(maxLeaves, cap + 6); cooldown = 1500 } // dư sức: tăng
    },
  }
}
