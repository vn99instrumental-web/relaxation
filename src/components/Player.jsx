import { useState } from 'react'
import { parseYouTube, videoThumb } from '../lib/youtube'

// Trình phát nhạc: ô dán nhiều link YouTube (mỗi dòng 1 link), hàng chờ, điều khiển.
export default function Player({
  yt, queue, index, onAddMany, onSelect, onRemove, onClear, onNext, onPrev,
  ytVolume, setYtVolume, presets, onLoadPreset,
}) {
  const [input, setInput] = useState('')
  const [note, setNote] = useState('')

  const submit = (e) => {
    e.preventDefault()
    // tách theo xuống dòng, dấu phẩy hoặc khoảng trắng
    const parts = input.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    const parsed = []
    let bad = 0
    for (const p of parts) {
      const r = parseYouTube(p)
      if (r) parsed.push(r)
      else bad++
    }
    if (parsed.length) {
      onAddMany(parsed)
      setInput('')
      setNote(`Đã thêm ${parsed.length} mục${bad ? `, bỏ qua ${bad} link lỗi` : ''}.`)
    } else {
      setNote('Không tìm thấy link YouTube hợp lệ. Dán link video hoặc playlist nhé.')
    }
    setTimeout(() => setNote(''), 4000)
  }

  return (
    <section className="panel player">
      <header className="panel__head">
        <h2>♫ Máy hát</h2>
        <span className="muted">{queue.length} bài · {queue.length ? `#${index + 1}` : '—'}</span>
      </header>

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
            {yt.playing ? '❚❚' : '►'}
          </button>
          <button className="ctrl" onClick={onNext} title="Bài sau" disabled={!queue.length}>⏭</button>
          <label className="player__vol">
            <span className="player__volicon">♪</span>
            <input type="range" min="0" max="100" value={ytVolume} onChange={(e) => setYtVolume(Number(e.target.value))} />
          </label>
        </div>
      </div>

      <form className="player__add" onSubmit={submit}>
        <textarea
          rows={2}
          placeholder={'Dán link YouTube — mỗi dòng một link để thêm nhiều bài / playlist…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e) }}
        />
        <button type="submit" title="Thêm (Ctrl/⌘+Enter)">Thêm</button>
      </form>
      {note && <div className="form-note">{note}</div>}

      {presets?.length > 0 && (
        <div className="player__presets">
          <span className="muted">Gợi ý:</span>
          {presets.map((p) => (
            <button key={p.videoId} className="chip" onClick={() => onLoadPreset(p)}>{p.title}</button>
          ))}
        </div>
      )}

      <div className="queue__head">
        <span className="muted">Hàng chờ</span>
        {queue.length > 0 && <button className="link-btn" onClick={onClear}>Xóa tất cả</button>}
      </div>
      <ul className="queue">
        {queue.map((t, i) => (
          <li key={t.key} className={`queue__item ${i === index ? 'is-current' : ''}`}>
            <button className="queue__play" onClick={() => onSelect(i)}>
              {t.kind === 'playlist'
                ? <span className="queue__thumb queue__thumb--list">≡</span>
                : <img className="queue__thumb" src={videoThumb(t.videoId, 'default')} alt="" loading="lazy" />}
              <span className="queue__label">
                <span className="queue__name">{t.title || (t.kind === 'playlist' ? 'Playlist' : 'Video')}</span>
                <span className="queue__kind">{t.kind === 'playlist' ? 'playlist' : 'video'}</span>
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
