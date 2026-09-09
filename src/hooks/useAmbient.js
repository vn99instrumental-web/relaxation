import { useEffect, useRef, useCallback, useState } from 'react'

// Bộ trộn âm thanh nền tổng hợp bằng Web Audio (không cần file):
//   - rain  : tiếng mưa phùn (noise + lọc + rung nhẹ biên độ)
//   - wind  : tiếng gió/sương (brown noise lọc dải, LFO chậm)
//   - birds : tiếng chim hót (chuỗi chirp ngẫu nhiên)
//   - drops : giọt nước lộp bộp thưa (điểm nhấn khi mưa)
//
// Mọi thứ chạy realtime trong trình duyệt; mỗi kênh có âm lượng riêng.

function makeNoiseBuffer(ctx, seconds = 3, type = 'white') {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  if (type === 'brown') {
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    }
  } else {
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  return buf
}

export function useAmbient() {
  const ctxRef = useRef(null)
  const nodesRef = useRef(null)
  const birdTimerRef = useRef(null)
  const dropTimerRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [levels, setLevels] = useState({ master: 0.7, rain: 0.0, wind: 0.0, birds: 0.0, drops: 0.0 })
  const levelsRef = useRef(levels)
  levelsRef.current = levels

  const build = useCallback(() => {
    if (ctxRef.current) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    ctxRef.current = ctx

    const master = ctx.createGain()
    master.gain.value = levelsRef.current.master
    master.connect(ctx.destination)

    // ---- RAIN: white noise -> lowpass -> rung biên độ nhẹ ----
    const rainSrc = ctx.createBufferSource()
    rainSrc.buffer = makeNoiseBuffer(ctx, 3, 'white')
    rainSrc.loop = true
    const rainLP = ctx.createBiquadFilter()
    rainLP.type = 'lowpass'
    rainLP.frequency.value = 2600
    rainLP.Q.value = 0.6
    const rainHP = ctx.createBiquadFilter()
    rainHP.type = 'highpass'
    rainHP.frequency.value = 420
    const rainGain = ctx.createGain()
    rainGain.gain.value = 0
    // quét nhẹ tần số cắt để mưa nghe "dày - mỏng" tự nhiên
    const rainCutLFO = ctx.createOscillator()
    rainCutLFO.frequency.value = 0.13
    const rainCutGain = ctx.createGain()
    rainCutGain.gain.value = 600
    rainCutLFO.connect(rainCutGain)
    rainCutGain.connect(rainLP.frequency)
    rainCutLFO.start()
    // rung biên độ để nghe như mưa "thở"
    const rainLFO = ctx.createOscillator()
    rainLFO.frequency.value = 0.24
    const rainLFOGain = ctx.createGain()
    rainLFOGain.gain.value = 0.05
    rainLFO.connect(rainLFOGain)
    rainLFOGain.connect(rainGain.gain)
    rainSrc.connect(rainHP)
    rainHP.connect(rainLP)
    rainLP.connect(rainGain)
    rainGain.connect(master)
    rainSrc.start()
    rainLFO.start()

    // ---- WIND / SƯƠNG: brown noise -> bandpass quét chậm ----
    const windSrc = ctx.createBufferSource()
    windSrc.buffer = makeNoiseBuffer(ctx, 4, 'brown')
    windSrc.loop = true
    const windBP = ctx.createBiquadFilter()
    windBP.type = 'bandpass'
    windBP.frequency.value = 600
    windBP.Q.value = 0.8
    const windGain = ctx.createGain()
    windGain.gain.value = 0
    const windLFO = ctx.createOscillator()
    windLFO.frequency.value = 0.08
    const windLFOGain = ctx.createGain()
    windLFOGain.gain.value = 300
    windLFO.connect(windLFOGain)
    windLFOGain.connect(windBP.frequency)
    windSrc.connect(windBP)
    windBP.connect(windGain)
    windGain.connect(master)
    windSrc.start()
    windLFO.start()

    // ---- BIRDS: kênh khuếch đại, chirp tạo động ----
    const birdGain = ctx.createGain()
    birdGain.gain.value = 0
    const birdReverb = ctx.createBiquadFilter()
    birdReverb.type = 'lowpass'
    birdReverb.frequency.value = 7000
    birdReverb.connect(birdGain)
    birdGain.connect(master)

    // ---- DROPS: giọt nước riêng lẻ ----
    const dropGain = ctx.createGain()
    dropGain.gain.value = 0
    dropGain.connect(master)

    nodesRef.current = { master, rainGain, windGain, birdGain, birdReverb, dropGain }

    // Lập lịch chirp chim ngẫu nhiên
    const scheduleBird = () => {
      const l = levelsRef.current.birds
      if (l > 0.001) chirp(ctx, nodesRef.current.birdReverb, l)
      birdTimerRef.current = setTimeout(scheduleBird, 600 + Math.random() * 2600)
    }
    scheduleBird()

    // Lập lịch giọt nước ngẫu nhiên
    const scheduleDrop = () => {
      const l = levelsRef.current.drops
      if (l > 0.001) waterDrop(ctx, nodesRef.current.dropGain, l)
      dropTimerRef.current = setTimeout(scheduleDrop, 300 + Math.random() * 1400)
    }
    scheduleDrop()
  }, [])

  const applyLevels = useCallback((next) => {
    const n = nodesRef.current
    const ctx = ctxRef.current
    if (!n || !ctx) return
    const t = ctx.currentTime
    const ramp = (param, val) => param.setTargetAtTime(val, t, 0.15)
    ramp(n.master.gain, next.master)
    ramp(n.rainGain.gain, next.rain * 0.9)
    ramp(n.windGain.gain, next.wind * 0.8)
    ramp(n.birdGain.gain, next.birds * 0.9)
    ramp(n.dropGain.gain, next.drops)
  }, [])

  const setLevel = useCallback((key, value) => {
    setLevels((prev) => {
      const next = { ...prev, [key]: value }
      applyLevels(next)
      return next
    })
  }, [applyLevels])

  const start = useCallback(async () => {
    build()
    try { await ctxRef.current.resume() } catch { /* ignore */ }
    applyLevels(levelsRef.current)
    setStarted(true)
  }, [build, applyLevels])

  const stop = useCallback(async () => {
    try { await ctxRef.current?.suspend() } catch { /* ignore */ }
    setStarted(false)
  }, [])

  useEffect(() => {
    return () => {
      clearTimeout(birdTimerRef.current)
      clearTimeout(dropTimerRef.current)
      try { ctxRef.current?.close() } catch { /* ignore */ }
    }
  }, [])

  return { started, levels, setLevel, start, stop }
}

// Một tiếng chim hót: 1-3 nốt quét tần số nhanh.
function chirp(ctx, dest, amp) {
  const t0 = ctx.currentTime + 0.01
  const notes = 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < notes; i++) {
    const start = t0 + i * (0.06 + Math.random() * 0.05)
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    const g = ctx.createGain()
    const base = 2200 + Math.random() * 1800
    osc.frequency.setValueAtTime(base, start)
    osc.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), start + 0.05)
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, start + 0.11)
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(0.12 * amp, start + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.14)
    osc.connect(g)
    g.connect(dest)
    osc.start(start)
    osc.stop(start + 0.16)
  }
}

// Một giọt nước "tưng": xung ngắn qua bandpass cộng hưởng.
function waterDrop(ctx, dest, amp) {
  const t0 = ctx.currentTime + 0.01
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  const g = ctx.createGain()
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  const f = 900 + Math.random() * 1400
  bp.frequency.value = f
  bp.Q.value = 6
  osc.frequency.setValueAtTime(f * 1.4, t0)
  osc.frequency.exponentialRampToValueAtTime(f * 0.7, t0 + 0.08)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(0.25 * amp, t0 + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
  osc.connect(bp)
  bp.connect(g)
  g.connect(dest)
  osc.start(t0)
  osc.stop(t0 + 0.14)
}
