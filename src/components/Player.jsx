import { useState } from 'react'
import { parseYouTube, videoThumb } from '../lib/youtube'

// Nội dung panel "Nhạc": dán nhiều link, gợi ý, hàng chờ, bật/tắt cửa sổ video.
// (Khung panel & nút đóng do App bọc bên ngoài; nút phát nằm ở thanh dock.)
export default function Player({
  queue, index, onAddMany, onSelect, onRemove, onClear,
  presets, onLoadPreset, showVideo, onToggleVideo,
}) {
  const [input, setInput] = useState('')
  const [note, setNote] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const parts = input.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    const parsed = []
    let bad = 0
    for (const p of parts) {
      const r = parseYouTube(p)
      if (r) parsed.push(r); else bad++
    }
    if (parsed.length) {
      onAddMany(parsed)
      setInput('')
      setNote(`Đã thêm ${parsed.length} mục${bad ? `, bỏ qua ${bad} link lỗi` : ''}.`)
    } else {
      setNote('Không tìm thấy link YouTube hợp lệ.')
    }
    setTimeout(() => setNote(''), 4000)
  }

  return (
    <div className="pane">
      <form className="player__add" onSubmit={submit}>
        <textarea rows={2}
          placeholder={'Dán link YouTube — mỗi dòng một link để thêm nhiều bài / playlist…'}
          value={input} onChange={(e) => setInput(e.target.value)}
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
        <span className="muted">Hàng chờ · {queue.length} bài</span>
        <div className="queue__head-actions">
          <button className="link-btn" onClick={onToggleVideo}>{showVideo ? 'Ẩn video' : 'Hiện video'}</button>
          {queue.length > 0 && <button className="link-btn" onClick={onClear}>Xóa tất cả</button>}
        </div>
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
    </div>
  )
}
