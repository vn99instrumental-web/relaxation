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
  const warbleTimerRef = useRef(null)
  const dropTimerRef = useRef(null)
  const [started, setStarted] = useState(false)
  // master giữ cố định bên trong (không còn thanh "âm tổng")
  const [levels, setLevels] = useState({ master: 0.85, rain: 0.0, stream: 0.0, wind: 0.0, birds: 0.0, warble: 0.0, drops: 0.0 })
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

    // ---- SUỐI: noise sáng hơn mưa + bandpass "róc rách" quét chậm ----
    const streamSrc = ctx.createBufferSource()
    streamSrc.buffer = makeNoiseBuffer(ctx, 4, 'white')
    streamSrc.loop = true
    const streamHP = ctx.createBiquadFilter()
    streamHP.type = 'highpass'; streamHP.frequency.value = 700
    const streamLP = ctx.createBiquadFilter()
    streamLP.type = 'lowpass'; streamLP.frequency.value = 3600; streamLP.Q.value = 0.5
    const streamBP = ctx.createBiquadFilter() // tiếng "róc rách"
    streamBP.type = 'bandpass'; streamBP.frequency.value = 1500; streamBP.Q.value = 1.4
    const streamBPGain = ctx.createGain(); streamBPGain.gain.value = 0.6
    const streamBabbleLFO = ctx.createOscillator(); streamBabbleLFO.frequency.value = 0.7
    const streamBabbleGain = ctx.createGain(); streamBabbleGain.gain.value = 700
    streamBabbleLFO.connect(streamBabbleGain); streamBabbleGain.connect(streamBP.frequency); streamBabbleLFO.start()
    const streamGain = ctx.createGain(); streamGain.gain.value = 0
    streamSrc.connect(streamHP); streamHP.connect(streamLP)
    streamLP.connect(streamGain)                 // dòng chảy nền
    streamLP.connect(streamBP); streamBP.connect(streamBPGain); streamBPGain.connect(streamGain) // róc rách
    streamGain.connect(master)
    streamSrc.start()

    // ---- CHIM THÁNH THÓT: chuỗi nốt huýt trong trẻo ----
    const warbleGain = ctx.createGain(); warbleGain.gain.value = 0
    const warbleFilter = ctx.createBiquadFilter()
    warbleFilter.type = 'lowpass'; warbleFilter.frequency.value = 8000
    warbleFilter.connect(warbleGain); warbleGain.connect(master)

    // ---- Không gian rừng: vọng nhẹ có phản hồi (đặt tiếng chim vào chiều sâu) ----
    const birdEcho = ctx.createDelay(0.6); birdEcho.delayTime.value = 0.21
    const birdEchoLP = ctx.createBiquadFilter(); birdEchoLP.type = 'lowpass'; birdEchoLP.frequency.value = 3000
    const birdEchoFb = ctx.createGain(); birdEchoFb.gain.value = 0.3
    const birdEchoWet = ctx.createGain(); birdEchoWet.gain.value = 0.32
    birdEcho.connect(birdEchoLP); birdEchoLP.connect(birdEchoFb); birdEchoFb.connect(birdEcho)
    birdEchoLP.connect(birdEchoWet); birdEchoWet.connect(master)
    birdReverb.connect(birdEcho); warbleFilter.connect(birdEcho) // gửi cả 2 kênh chim vào vọng

    // ---- DROPS: giọt nước riêng lẻ ----
    const dropGain = ctx.createGain()
    dropGain.gain.value = 0
    dropGain.connect(master)

    nodesRef.current = { master, rainGain, windGain, birdGain, birdReverb, streamGain, warbleGain, warbleFilter, dropGain }

    // Lập lịch chirp chim ngẫu nhiên
    const scheduleBird = () => {
      const l = levelsRef.current.birds
      if (l > 0.001) chirp(ctx, nodesRef.current.birdReverb, l)
      birdTimerRef.current = setTimeout(scheduleBird, 600 + Math.random() * 2600)
    }
    scheduleBird()

    // Lập lịch tiếng chim thánh thót (chuỗi nốt du dương)
    const scheduleWarble = () => {
      const l = levelsRef.current.warble
      if (l > 0.001) warble(ctx, nodesRef.current.warbleFilter, l)
      warbleTimerRef.current = setTimeout(scheduleWarble, 1400 + Math.random() * 3600)
    }
    scheduleWarble()

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
    ramp(n.streamGain.gain, next.stream * 0.8)
    ramp(n.windGain.gain, next.wind * 0.8)
    ramp(n.birdGain.gain, next.birds * 0.9)
    ramp(n.warbleGain.gain, next.warble * 0.9)
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
      clearTimeout(warbleTimerRef.current)
      clearTimeout(dropTimerRef.current)
      try { ctxRef.current?.close() } catch { /* ignore */ }
    }
  }, [])

  return { started, levels, setLevel, start, stop }
}

// Một "âm tiết" chim: sóng mang + điều tần (FM) tạo độ líu ríu đặc trưng,
// cao độ luyến theo đường cong, bao biên độ đánh nhanh–tắt mềm, lọc formant.
function birdSyllable(ctx, dest, t, f0, dur, amp, opts = {}) {
  const osc = ctx.createOscillator(); osc.type = opts.type || 'triangle'
  const g = ctx.createGain()
  const f = osc.frequency
  // FM: bộ điều tần nhanh -> tạo rung/líu như cổ họng chim
  const mod = ctx.createOscillator(); mod.type = 'sine'
  mod.frequency.value = opts.trill || (60 + Math.random() * 80)
  const modG = ctx.createGain(); modG.gain.value = f0 * (opts.trillDepth ?? 0.05)
  mod.connect(modG); modG.connect(f)
  // đường cong cao độ (contour) — chim thật hiếm khi giữ 1 nốt phẳng
  const c = opts.contour || 'updown'
  f.setValueAtTime(f0, t)
  if (c === 'up') f.exponentialRampToValueAtTime(f0 * 1.6, t + dur)
  else if (c === 'down') f.exponentialRampToValueAtTime(f0 * 0.6, t + dur)
  else if (c === 'updown') { f.exponentialRampToValueAtTime(f0 * 1.5, t + dur * 0.4); f.exponentialRampToValueAtTime(f0 * 0.82, t + dur) }
  else if (c === 'downup') { f.exponentialRampToValueAtTime(f0 * 0.68, t + dur * 0.5); f.exponentialRampToValueAtTime(f0 * 1.2, t + dur) }
  // bao biên độ
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(amp, t + 0.008)
  g.gain.setTargetAtTime(0.0001, t + dur * 0.55, dur * 0.28)
  // lọc formant nhẹ cho ấm, bớt "điện tử"
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f0 * 1.5; bp.Q.value = 0.9
  osc.connect(bp); bp.connect(g); g.connect(dest)
  const end = t + dur + 0.06
  mod.start(t); osc.start(t); mod.stop(end); osc.stop(end)
}

// Tiếng chíp ngắn: 1-4 âm tiết, cao độ luyến ngẫu nhiên, có lúc "chíp chíp".
function chirp(ctx, dest, amp) {
  const base = 1900 + Math.random() * 1700
  const n = 1 + Math.floor(Math.random() * 4)
  const contours = ['up', 'updown', 'down', 'downup']
  let t = ctx.currentTime + 0.02
  for (let i = 0; i < n; i++) {
    const f0 = base * (0.9 + Math.random() * 0.35)
    const dur = 0.05 + Math.random() * 0.06
    birdSyllable(ctx, dest, t, f0, dur, 0.12 * amp, {
      contour: contours[(Math.random() * contours.length) | 0],
      trill: 70 + Math.random() * 90, trillDepth: 0.04 + Math.random() * 0.05,
    })
    t += dur + 0.02 + Math.random() * 0.05
  }
}

// Tiếng chim thánh thót: một CÂU du dương 4-8 nốt, đi lên/xuống theo bậc,
// nốt dài thì ngân (trill chậm), có lúc ngắt nhịp — nghe như đang "hót".
function warble(ctx, dest, amp) {
  const scale = [1568, 1760, 1976, 2349, 2637, 3136, 3520] // G6..A7
  const n = 4 + Math.floor(Math.random() * 5)
  let t = ctx.currentTime + 0.03
  let idx = Math.floor(Math.random() * scale.length)
  for (let i = 0; i < n; i++) {
    idx = Math.max(0, Math.min(scale.length - 1, idx + (Math.floor(Math.random() * 3) - 1))) // bước ±1 bậc
    const f0 = scale[idx]
    const long = Math.random() < 0.4
    const dur = (0.09 + Math.random() * 0.09) * (long ? 1.6 : 1)
    birdSyllable(ctx, dest, t, f0, dur, 0.13 * amp, {
      contour: long ? 'updown' : ['up', 'down', 'downup'][(Math.random() * 3) | 0],
      trill: long ? 22 + Math.random() * 16 : 90 + Math.random() * 60,
      trillDepth: long ? 0.03 : 0.02,
    })
    t += dur * (0.75 + Math.random() * 0.5) + (Math.random() < 0.2 ? 0.12 : 0) // đôi lúc lấy hơi
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
