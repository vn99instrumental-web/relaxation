import { useState } from 'react'
import { parseYouTube, videoThumb } from '../lib/youtube'

// Panel "Nhạc": dán nhiều link, gợi ý, hàng chờ, và lưu/tải playlist.
export default function Player({
  queue, index, onAddMany, onSelect, onRemove, onClear,
  showVideo, onToggleVideo,
  playlists, onSavePlaylist, onLoadPlaylist, onDeletePlaylist,
}) {
  const [input, setInput] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [plName, setPlName] = useState('')

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
      setNote(`Đã thêm ${parsed.length} mục${bad ? `, bỏ ${bad} link lỗi` : ''}.`)
    } else {
      setNote('Không có link hợp lệ.')
    }
    setTimeout(() => setNote(''), 3500)
  }

  const doSave = (e) => {
    e.preventDefault()
    onSavePlaylist(plName.trim() || `Playlist ${new Date().toLocaleDateString('vi-VN')}`)
    setPlName(''); setSaving(false)
    setNote('Đã lưu playlist.')
    setTimeout(() => setNote(''), 3000)
  }

  return (
    <div className="pane">
      <form className="player__add" onSubmit={submit}>
        <textarea rows={2}
          placeholder={'Dán link YouTube — mỗi dòng một link…'}
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e) }}
        />
        <button type="submit" title="Thêm (Ctrl/⌘+Enter)">Thêm</button>
      </form>
      {note && <div className="form-note">{note}</div>}

      <div className="queue__head">
        <span className="muted">Hàng chờ · {queue.length}</span>
        <div className="queue__head-actions">
          <button className="link-btn" onClick={onToggleVideo}>{showVideo ? 'Ẩn video' : 'Video'}</button>
          {queue.length > 0 && <button className="link-btn" onClick={() => setSaving((s) => !s)}>Lưu playlist</button>}
          {queue.length > 0 && <button className="link-btn" onClick={onClear}>Xóa</button>}
        </div>
      </div>

      {saving && (
        <form className="pl-save" onSubmit={doSave}>
          <input autoFocus type="text" placeholder="Tên playlist…" value={plName} onChange={(e) => setPlName(e.target.value)} />
          <button type="submit">Lưu</button>
        </form>
      )}

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
        {queue.length === 0 && <li className="queue__empty">Hàng chờ trống — dán link hoặc mở playlist đã lưu.</li>}
      </ul>

      {playlists?.length > 0 && (
        <div className="pl-saved">
          <div className="queue__head"><span className="muted">Playlist đã lưu · {playlists.length}</span></div>
          <ul className="pl-list">
            {playlists.map((p) => (
              <li key={p.id} className="pl-item">
                <button className="pl-item__main" onClick={() => onLoadPlaylist(p.id, 'replace')} title="Mở playlist này">
                  <span className="pl-item__name">♫ {p.name}</span>
                  <span className="pl-item__count">{p.tracks.length} bài</span>
                </button>
                <button className="link-btn" onClick={() => onLoadPlaylist(p.id, 'append')} title="Thêm vào hàng chờ">＋</button>
                <button className="queue__remove" onClick={() => onDeletePlaylist(p.id)} title="Xóa playlist">✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
