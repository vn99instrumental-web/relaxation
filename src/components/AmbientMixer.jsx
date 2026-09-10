import { useEffect, useRef, useState } from 'react'

// Bộ trộn không gian: (1) tiếng tổng hợp bằng Web Audio,
// (2) file âm thanh thật do bạn tải lên (phát lặp, offline).
const CHANNELS = [
  { key: 'rain', label: 'Mưa phùn', icon: '☂' },
  { key: 'wind', label: 'Gió / sương', icon: '≈' },
  { key: 'birds', label: 'Chim hót', icon: '❧' },
  { key: 'drops', label: 'Giọt nước', icon: '❍' },
]

export default function AmbientMixer({ ambient }) {
  const { started, levels, setLevel, start, stop } = ambient

  // ---- Âm thanh thật do người dùng tải lên ----
  const [tracks, setTracks] = useState([]) // {id, name, volume, playing}
  const audiosRef = useRef(new Map()) // id -> HTMLAudioElement
  const fileRef = useRef(null)

  useEffect(() => {
    const audios = audiosRef.current
    return () => {
      // dọn dẹp khi rời trang
      for (const a of audios.values()) {
        try { a.pause(); URL.revokeObjectURL(a.src) } catch { /* ignore */ }
      }
    }
  }, [])

  const addFiles = (fileList) => {
    const files = Array.from(fileList || [])
    const added = []
    for (const f of files) {
      if (!f.type.startsWith('audio')) continue
      const id = `u${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const url = URL.createObjectURL(f)
      const audio = new Audio(url)
      audio.loop = true
      audio.volume = 0.6
      audio.play().catch(() => { /* cần thao tác người dùng — nút play sẽ xử lý */ })
      audiosRef.current.set(id, audio)
      added.push({ id, name: f.name.replace(/\.[^.]+$/, ''), volume: 0.6, playing: true })
    }
    if (added.length) setTracks((t) => [...t, ...added])
  }

  const setTrackVol = (id, v) => {
    const a = audiosRef.current.get(id)
    if (a) a.volume = v
    setTracks((t) => t.map((x) => (x.id === id ? { ...x, volume: v } : x)))
  }
  const toggleTrack = (id) => {
    const a = audiosRef.current.get(id)
    if (!a) return
    let playing
    if (a.paused) { a.play().catch(() => {}); playing = true }
    else { a.pause(); playing = false }
    setTracks((t) => t.map((x) => (x.id === id ? { ...x, playing } : x)))
  }
  const removeTrack = (id) => {
    const a = audiosRef.current.get(id)
    if (a) { try { a.pause(); URL.revokeObjectURL(a.src) } catch { /* ignore */ } }
    audiosRef.current.delete(id)
    setTracks((t) => t.filter((x) => x.id !== id))
  }

  return (
    <section className="pane mixer">
      <header className="pane__head">
        <h2>Pha không gian</h2>
        <button className={`toggle ${started ? 'is-on' : ''}`} onClick={started ? stop : start}>
          {started ? 'Đang bật' : 'Bật tiếng'}
        </button>
      </header>

      {!started && (
        <p className="mixer__hint">Nhấn “Bật tiếng” rồi kéo các thanh để pha trộn không gian của riêng bạn.</p>
      )}

      <div className="mixer__rows">
        <div className="mixer__row mixer__row--master">
          <span className="mixer__label">◐ Tổng</span>
          <input type="range" min="0" max="1" step="0.01" value={levels.master}
            onChange={(e) => setLevel('master', Number(e.target.value))} />
        </div>
        {CHANNELS.map((c) => (
          <div className="mixer__row" key={c.key}>
            <span className="mixer__label">{c.icon} {c.label}</span>
            <input type="range" min="0" max="1" step="0.01" value={levels[c.key]}
              onChange={(e) => setLevel(c.key, Number(e.target.value))} disabled={!started} />
          </div>
        ))}
      </div>

      {/* Âm thanh thật do bạn tải lên */}
      <div className="mixer__user">
        <div className="queue__head">
          <span className="muted">Âm thanh của bạn (file thật)</span>
          <button className="link-btn" onClick={() => fileRef.current?.click()}>+ Tải lên</button>
        </div>
        <input ref={fileRef} type="file" accept="audio/*" multiple hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />

        {tracks.length === 0 ? (
          <p className="mixer__hint mixer__hint--sm">
            Tải file mưa/chim/piano… (mp3, wav) để phát lặp — âm thanh thu thật, không cần mạng.
          </p>
        ) : (
          <div className="mixer__rows">
            {tracks.map((tk) => (
              <div className="mixer__row mixer__row--user" key={tk.id}>
                <button className="mini-btn" onClick={() => toggleTrack(tk.id)} title="Phát/Dừng">
                  {tk.playing ? '❚❚' : '►'}
                </button>
                <span className="mixer__label mixer__label--user" title={tk.name}>{tk.name}</span>
                <input type="range" min="0" max="1" step="0.01" value={tk.volume}
                  onChange={(e) => setTrackVol(tk.id, Number(e.target.value))} />
                <button className="queue__remove" onClick={() => removeTrack(tk.id)} title="Xóa">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
