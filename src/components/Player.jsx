import { useState } from 'react'
import { parseYouTube, videoThumb } from '../lib/youtube'

// Trình phát nhạc: ô dán link YouTube, hàng chờ, điều khiển phát.
// props từ App: yt (hook), queue, index, onAdd, onSelect, onRemove, onNext, onPrev, ytVolume, setYtVolume
export default function Player({
  yt, queue, index, onAdd, onSelect, onRemove, onNext, onPrev, ytVolume, setYtVolume, presets, onLoadPreset,
}) {
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    const parsed = parseYouTube(input)
    if (!parsed) {
      setErr('Link YouTube không hợp lệ. Dán link video hoặc link playlist nhé.')
      return
    }
    onAdd(parsed)
    setInput('')
  }

  return (
    <section className="panel player">
      <header className="panel__head">
        <h2>🎧 Nhạc</h2>
        <span className="muted">{queue.length} bài trong hàng chờ</span>
      </header>

      {/* Màn hình video (có thể thu nhỏ). Player YT gắn vào #yt-frame */}
      <div className="player__screen">
        <div id="yt-frame" />
        {!yt.current && <div className="player__placeholder">Dán link YouTube để bắt đầu…</div>}
        {yt.buffering && <div className="player__loading">đang tải…</div>}
      </div>

      <div className="player__now">
        <div className="player__title" title={yt.nowTitle}>
          {yt.nowTitle || (yt.current ? 'Đang phát…' : 'Chưa có bài nào')}
        </div>
        <div className="player__controls">
          <button className="ctrl" onClick={onPrev} title="Bài trước" disabled={!queue.length}>⏮</button>
          <button className="ctrl ctrl--main" onClick={yt.toggle} title="Phát/Dừng" disabled={!yt.current}>
            {yt.playing ? '⏸' : '▶'}
          </button>
          <button className="ctrl" onClick={onNext} title="Bài sau" disabled={!queue.length}>⏭</button>
          <label className="player__vol">
            🔊
            <input
              type="range" min="0" max="100" value={ytVolume}
              onChange={(e) => setYtVolume(Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      <form className="player__add" onSubmit={submit}>
        <input
          type="text"
          placeholder="Dán link YouTube (video hoặc playlist)…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Thêm</button>
      </form>
      {err && <div className="form-err">{err}</div>}

      {presets?.length > 0 && (
        <div className="player__presets">
          <span className="muted">Gợi ý:</span>
          {presets.map((p) => (
            <button key={p.playlistId || p.videoId} className="chip" onClick={() => onLoadPreset(p)}>
              {p.title}
            </button>
          ))}
        </div>
      )}

      <ul className="queue">
        {queue.map((t, i) => (
          <li key={t.key} className={`queue__item ${i === index ? 'is-current' : ''}`}>
            <button className="queue__play" onClick={() => onSelect(i)}>
              {t.kind === 'playlist' ? (
                <span className="queue__thumb queue__thumb--list">☰</span>
              ) : (
                <img className="queue__thumb" src={videoThumb(t.videoId, 'default')} alt="" loading="lazy" />
              )}
              <span className="queue__label">
                <span className="queue__name">{t.title || (t.kind === 'playlist' ? 'Playlist' : 'Video')}</span>
                <span className="queue__kind">{t.kind === 'playlist' ? 'playlist YouTube' : 'video'}</span>
              </span>
            </button>
            <button className="queue__remove" onClick={() => onRemove(i)} title="Xóa">✕</button>
          </li>
        ))}
        {queue.length === 0 && <li className="queue__empty">Hàng chờ trống — thử một gợi ý hoặc dán link.</li>}
      </ul>
    </section>
  )
}
