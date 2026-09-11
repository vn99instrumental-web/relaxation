import { useState } from 'react'
import { parseYouTube, videoThumb } from '../lib/youtube'

// Panel "Nhạc" — 2 tab con:
//  • Thư viện: playlist đã lưu + hàng chờ (danh sách bài), gọn như app nghe nhạc.
//  • Thêm nhạc: dán link (vào hàng chờ / playlist có sẵn / playlist mới) + lưu playlist.
export default function Player({
  queue, index, onAddMany, onSelect, onRemove, onClear,
  showVideo, onToggleVideo, shuffle, onToggleShuffle,
  playlists, onSavePlaylist, onLoadPlaylist, onDeletePlaylist,
  onAddToPlaylist, onCreatePlaylist, onMoveTrack, onRemoveFromPlaylist,
}) {
  const [tab, setTab] = useState('library')        // 'library' | 'add'
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(null)   // id playlist đang mở xem bài
  const [showQueue, setShowQueue] = useState(true)
  const [showPlaylists, setShowPlaylists] = useState(true)
  const [note, setNote] = useState('')
  const [plName, setPlName] = useState('')
  const [target, setTarget] = useState('__queue__') // __queue__ | <playlistId> | __new__
  const [newName, setNewName] = useState('')

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 3500) }

  const submit = (e) => {
    e.preventDefault()
    const parts = input.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
    const parsed = []
    let bad = 0
    for (const p of parts) {
      const r = parseYouTube(p)
      if (r) parsed.push(r); else bad++
    }
    if (!parsed.length) { flash('Không có link hợp lệ.'); return }
    const tail = bad ? `, bỏ ${bad} link lỗi` : ''
    if (target === '__new__') {
      onCreatePlaylist(newName.trim(), parsed)
      flash(`Đã tạo playlist với ${parsed.length} bài${tail}.`)
      setNewName('')
    } else if (target === '__queue__') {
      onAddMany(parsed)
      flash(`Đã thêm ${parsed.length} bài vào hàng chờ${tail}.`)
    } else {
      const pl = playlists.find((p) => p.id === target)
      if (!pl) { onAddMany(parsed); flash(`Đã thêm ${parsed.length} bài vào hàng chờ${tail}.`) }
      else { onAddToPlaylist(target, parsed); flash(`Đã thêm ${parsed.length} bài vào “${pl.name}”${tail}.`) }
    }
    setInput('')
  }

  const doSave = (e) => {
    e.preventDefault()
    if (!queue.length) { flash('Hàng chờ đang trống.'); return }
    onSavePlaylist(plName.trim() || `Playlist ${new Date().toLocaleDateString('vi-VN')}`)
    setPlName('')
    flash('Đã lưu hàng chờ thành playlist.')
  }

  const targetValid = target === '__queue__' || target === '__new__' || playlists.some((p) => p.id === target)

  return (
    <div className="pane">
      <div className="player__tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'library'}
          className={`player__tab ${tab === 'library' ? 'is-active' : ''}`}
          onClick={() => setTab('library')}>♫ Thư viện</button>
        <button role="tab" aria-selected={tab === 'add'}
          className={`player__tab ${tab === 'add' ? 'is-active' : ''}`}
          onClick={() => setTab('add')}>＋ Thêm nhạc</button>
      </div>

      {note && <div className="form-note">{note}</div>}

      {tab === 'add' ? (
        <div className="player__addview">
          <form className="player__add" onSubmit={submit}>
            <textarea rows={2}
              placeholder={'Dán link YouTube… (mỗi dòng / dấu phẩy một link)'}
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e) }}
            />
            <div className="player__addbar">
              <select className="player__target" value={targetValid ? target : '__queue__'}
                onChange={(e) => setTarget(e.target.value)} title="Thêm vào đâu">
                <option value="__queue__">▶ Hàng chờ</option>
                {playlists.map((p) => <option key={p.id} value={p.id}>♫ {p.name}</option>)}
                <option value="__new__">＋ Playlist mới…</option>
              </select>
              <button type="submit" title="Thêm (Ctrl/⌘+Enter)">Thêm</button>
            </div>
            {target === '__new__' && (
              <input className="pl-newname" placeholder="Tên playlist mới…" value={newName} onChange={(e) => setNewName(e.target.value)} />
            )}
          </form>

          <div className="player__saveblock">
            <p className="muted">Lưu hàng chờ hiện tại ({queue.length} bài) thành playlist</p>
            <form className="pl-save" onSubmit={doSave}>
              <input type="text" placeholder="Tên playlist…" value={plName} onChange={(e) => setPlName(e.target.value)} />
              <button type="submit" disabled={!queue.length}>Lưu</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="player__library">
          <div className="queue__head">
            <button className="pl-collapse" onClick={() => setShowQueue((v) => !v)} title="Ẩn/hiện hàng chờ">
              <span className="pl-collapse__caret">{showQueue ? '▾' : '▸'}</span> Đang phát · {queue.length}
            </button>
            <div className="queue__head-actions">
              {queue.length > 1 && (
                <button className={`link-btn ${shuffle ? 'is-on' : ''}`} onClick={onToggleShuffle}
                  title="Phát ngẫu nhiên">🔀 Trộn</button>
              )}
              <button className="link-btn" onClick={onToggleVideo}>{showVideo ? 'Ẩn video' : 'Video'}</button>
              {queue.length > 0 && <button className="link-btn" onClick={onClear}>Xóa</button>}
            </div>
          </div>

          {showQueue && (
            <ul className="queue">
              {queue.map((t, i) => (
                <li key={t.key} className={`queue__item ${i === index ? 'is-current' : ''}`}>
                  <button className="queue__play" onClick={() => onSelect(i)}>
                    {t.kind === 'playlist'
                      ? <span className="queue__thumb queue__thumb--list">≡</span>
                      : <img className="queue__thumb" src={videoThumb(t.videoId, 'default')} alt="" loading="lazy" />}
                    <span className="queue__label">
                      <span className="queue__name">{t.title || (t.kind === 'playlist' ? 'Playlist' : 'Video')}</span>
                    </span>
                  </button>
                  <button className="queue__remove" onClick={() => onRemove(i)} title="Xóa">✕</button>
                </li>
              ))}
              {queue.length === 0 && (
                <li className="queue__empty">Chưa có bài nào — mở tab “Thêm nhạc” để dán link, hoặc chọn một playlist bên dưới.</li>
              )}
            </ul>
          )}

          {playlists?.length > 0 && (
            <div className={`pl-saved ${!showPlaylists ? 'is-collapsed' : ''}`}>
              <div className="queue__head">
                <button className="pl-collapse" onClick={() => setShowPlaylists((v) => !v)} title="Ẩn/hiện playlist">
                  <span className="pl-collapse__caret">{showPlaylists ? '▾' : '▸'}</span> Playlist · {playlists.length}
                </button>
              </div>
              {showPlaylists && (
                <ul className="pl-list">
                  {playlists.map((p) => (
                    <li key={p.id} className="pl-group">
                      <div className="pl-item">
                        <button className="pl-expand" onClick={() => setExpanded((e) => (e === p.id ? null : p.id))}
                          title="Xem các bài trong playlist">{expanded === p.id ? '▾' : '▸'}</button>
                        <button className="pl-item__main" onClick={() => onLoadPlaylist(p.id, 'replace')} title="Phát playlist này">
                          <span className="pl-item__name">♫ {p.name}</span>
                          <span className="pl-item__count">{p.tracks.length} bài</span>
                        </button>
                        <button className="link-btn" onClick={() => onLoadPlaylist(p.id, 'append')} title="Thêm vào hàng chờ">＋</button>
                        <button className="queue__remove" onClick={() => onDeletePlaylist(p.id)} title="Xóa playlist">✕</button>
                      </div>
                      {expanded === p.id && (
                        <ul className="pl-tracks">
                          {p.tracks.length === 0 && <li className="pl-track pl-track--empty">Playlist trống.</li>}
                          {p.tracks.map((t, i) => (
                            <li key={i} className="pl-track">
                              <span className="pl-track__name">{t.kind === 'playlist' ? '≡ ' : ''}{t.title || 'Video'}</span>
                              {onMoveTrack && (
                                <select className="pl-move" value="" title="Chuyển bài này sang…"
                                  onChange={(e) => { if (e.target.value) { onMoveTrack(p.id, i, e.target.value); e.target.value = '' } }}>
                                  <option value="">⇄ Chuyển…</option>
                                  <option value="__queue__">▶ Hàng chờ</option>
                                  {playlists.filter((x) => x.id !== p.id).map((x) => (
                                    <option key={x.id} value={x.id}>♫ {x.name}</option>
                                  ))}
                                </select>
                              )}
                              {onRemoveFromPlaylist && (
                                <button className="queue__remove" onClick={() => onRemoveFromPlaylist(p.id, i)} title="Xoá khỏi playlist">✕</button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
