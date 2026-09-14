import { useState } from 'react'
import { parseYouTube, videoThumb } from '../lib/youtube'
import { IconShuffle, IconPrev, IconNext, IconPlay, IconPause } from './icons'

const addedTime = (track, fallback) => {
  const numeric = Number(track?.addedAt)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const parsed = Date.parse(track?.addedAt)
  return Number.isFinite(parsed) ? parsed : fallback
}

// Panel "Nhạc" — 3 tab con:
//  • Mới đăng: các bài vừa được thêm gần nhất.
//  • Thư viện: playlist đã lưu + hàng chờ (danh sách bài).
//  • Thêm nhạc: dán link (vào hàng chờ / playlist có sẵn / playlist mới) + lưu playlist.
export default function Player({
  queue, index, yt, playlistName, onNext, onPrev, ytVolume, setYtVolume,
  onAddMany, onSelect, onSelectRecent, onRemove, onClear,
  showVideo, onToggleVideo, shuffle, onToggleShuffle,
  playlists, onSavePlaylist, onLoadPlaylist, onDeletePlaylist,
  onAddToPlaylist, onCreatePlaylist, onMoveTrack, onRemoveFromPlaylist, onRenamePlaylist,
  admin, defaultTrack, onSetDefaultTrack, onClearDefaultTrack,
  recentLimit, onRecentLimitChange,
}) {
  const [tab, setTab] = useState('now')            // 'now' | 'recent' | 'library' | 'add'
  const [editPlId, setEditPlId] = useState(null)   // id playlist đang đổi tên
  const [plRename, setPlRename] = useState('')
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(null)   // id playlist đang mở xem bài
  const [showQueue, setShowQueue] = useState(true)          // mặc định mở danh sách bài
  const [showPlaylists, setShowPlaylists] = useState(false) // mặc định thu gọn danh sách playlist
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
      flash(`Đã thêm ${parsed.length} bài vào playlist Mới đăng${tail}.`)
    } else {
      const pl = playlists.find((p) => p.id === target)
      if (!pl) { onAddMany(parsed); flash(`Đã thêm ${parsed.length} bài vào playlist Mới đăng${tail}.`) }
      else { onAddToPlaylist(target, parsed); flash(`Đã thêm ${parsed.length} bài vào “${pl.name}”${tail}.`) }
    }
    setInput('')
  }

  const doSave = (e) => {
    e.preventDefault()
    if (!queue.length) { flash('Playlist Mới đăng đang trống.'); return }
    onSavePlaylist(plName.trim() || `Playlist ${new Date().toLocaleDateString('vi-VN')}`)
    setPlName('')
    flash('Đã lưu danh sách Mới đăng thành playlist.')
  }

  const startRename = (p) => { setEditPlId(p.id); setPlRename(p.name) }
  const saveRename = () => {
    const n = plRename.trim()
    if (n && onRenamePlaylist) onRenamePlaylist(editPlId, n)
    setEditPlId(null); setPlRename('')
  }

  const targetValid = target === '__queue__' || target === '__new__' || playlists.some((p) => p.id === target)
  const recentTracks = queue
    .map((track, queueIndex) => ({ track, queueIndex }))
    .sort((a, b) => addedTime(b.track, b.queueIndex) - addedTime(a.track, a.queueIndex))
    .slice(0, recentLimit)
  const currentTrack = queue[index]
  const currentTitle = yt?.nowTitle || currentTrack?.title || 'Chưa chọn bài hát'
  const duration = Number(yt?.duration) || 0
  const currentTime = Math.min(Number(yt?.currentTime) || 0, duration || Infinity)
  const timeLabel = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0))
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
  }

  return (
    <div className="pane">
      <div className="player__tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'now'}
          className={`player__tab ${tab === 'now' ? 'is-active' : ''}`}
          onClick={() => setTab('now')}>Đang nghe</button>
        <button role="tab" aria-selected={tab === 'recent'}
          className={`player__tab ${tab === 'recent' ? 'is-active' : ''}`}
          onClick={() => setTab('recent')}>Mới đăng</button>
        <button role="tab" aria-selected={tab === 'library'}
          className={`player__tab ${tab === 'library' ? 'is-active' : ''}`}
          onClick={() => setTab('library')}>♫ Thư viện</button>
        <button role="tab" aria-selected={tab === 'add'}
          className={`player__tab ${tab === 'add' ? 'is-active' : ''}`}
          onClick={() => setTab('add')}>＋ Thêm nhạc</button>
      </div>

      {note && <div className="form-note">{note}</div>}

      {tab === 'now' ? (
        <section className="now-player" aria-label="Trình phát nhạc">
          <div className="now-player__art">
            {currentTrack?.videoId ? <img src={videoThumb(currentTrack.videoId, 'hqdefault')} alt="" /> : <span>♫</span>}
            <i className={yt?.playing ? 'is-playing' : ''} aria-hidden="true">❊</i>
          </div>
          <div className="now-player__meta">
            <span>{playlistName ? `Playlist · ${playlistName}` : 'Playlist · Mới đăng'}</span>
            <h3 title={currentTitle}>{currentTitle}</h3>
            <small>{queue.length ? `${index + 1} / ${queue.length}` : 'Chưa có bài'}</small>
          </div>
          <div className="now-player__seek">
            <input type="range" min="0" max={duration || 0.1} step="0.1" value={currentTime}
              disabled={!duration} onChange={(event) => yt?.seekTo(Number(event.target.value))} aria-label="Tua bài hát" />
            <div><span>{timeLabel(currentTime)}</span><span>{timeLabel(duration)}</span></div>
          </div>
          <div className="now-player__transport">
            <button className={`ctrl ctrl--sm shuffle ${shuffle ? 'is-on' : ''}`} onClick={onToggleShuffle}
              aria-label="Phát ngẫu nhiên" aria-pressed={shuffle} disabled={queue.length < 2}><IconShuffle /></button>
            <button className="ctrl" onClick={onPrev} aria-label="Bài trước" disabled={!queue.length}><IconPrev /></button>
            <button className="ctrl ctrl--main" onClick={yt?.toggle} aria-label={yt?.playing ? 'Dừng' : 'Phát'} disabled={!yt?.current}>
              {yt?.playing ? <IconPause /> : <IconPlay />}
            </button>
            <button className="ctrl" onClick={onNext} aria-label="Bài sau" disabled={!queue.length}><IconNext /></button>
            <button className="ctrl ctrl--sm" onClick={onToggleVideo} aria-label={showVideo ? 'Ẩn video' : 'Hiện video'}>▣</button>
          </div>
          <label className="now-player__volume"><span>Âm lượng</span><b>♪</b>
            <input type="range" min="0" max="100" value={ytVolume} onChange={(event) => setYtVolume(Number(event.target.value))} />
          </label>
          <p className="now-player__background">Có điều khiển trên màn hình khóa khi thiết bị hỗ trợ. Phát nền có thể bị YouTube hoặc hệ điều hành tạm dừng.</p>
        </section>
      ) : tab === 'recent' ? (
        <div className="player__recent">
          <div className="recent__head">
            <div><strong>Bài mới nhất</strong><span>{recentTracks.length} bài</span></div>
            <label>Hiển thị
              <select value={recentLimit} onChange={(event) => onRecentLimitChange(Number(event.target.value))}>
                {[10, 15, 20, 25].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <p className="recent__hint">Khi chưa ghim bài mặc định, trang sẽ bắt đầu từ bài mới nhất trong danh sách này.</p>
          <ul className="queue queue--recent">
            {recentTracks.map(({ track, queueIndex }, rank) => (
              <li key={track.key} className={`queue__item ${queueIndex === index ? 'is-current' : ''}`} aria-current={queueIndex === index ? 'true' : undefined}>
                <span className="recent__rank">{String(rank + 1).padStart(2, '0')}</span>
                <button className="queue__play" onClick={() => onSelectRecent(queueIndex)}>
                  {track.kind === 'playlist'
                    ? <span className="queue__thumb queue__thumb--list">≡</span>
                    : <img className="queue__thumb" src={videoThumb(track.videoId, 'default')} alt="" loading="lazy" />}
                  <span className="queue__label"><span className="queue__name">{track.title || (track.kind === 'playlist' ? 'Playlist' : 'Video')}</span></span>
                </button>
                {admin && queueIndex === index && (
                  <button className={`queue__default ${sameTrack(track, defaultTrack) ? 'is-on' : ''}`}
                    onClick={() => sameTrack(track, defaultTrack) ? onClearDefaultTrack() : onSetDefaultTrack(track)}
                    title={sameTrack(track, defaultTrack) ? 'Bỏ bài hát mặc định khi mở trang' : 'Đặt làm bài hát mặc định khi mở trang'}
                    aria-label={sameTrack(track, defaultTrack) ? 'Bỏ bài hát mặc định' : 'Đặt bài hát mặc định'}>
                    {sameTrack(track, defaultTrack) ? '★' : '☆'}
                  </button>
                )}
              </li>
            ))}
            {!recentTracks.length && <li className="queue__empty">Chưa có bài nào được đăng.</li>}
          </ul>
        </div>
      ) : tab === 'add' ? (
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
                <option value="__queue__">▶ Playlist Mới đăng</option>
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
            <p className="muted">Lưu danh sách Mới đăng hiện tại ({queue.length} bài) thành playlist</p>
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
              <span className="pl-collapse__caret">{showQueue ? '▾' : '▸'}</span> Playlist đang phát · Mới đăng ({recentTracks.length})
            </button>
            <div className="queue__head-actions">
              {queue.length > 1 && (
                <button className={`link-btn shuffle-link ${shuffle ? 'is-on' : ''}`} onClick={onToggleShuffle}
                  title="Phát ngẫu nhiên" aria-pressed={shuffle}>
                  <IconShuffle /><span>Trộn</span>
                </button>
              )}
              <button className="link-btn" onClick={onToggleVideo}>{showVideo ? 'Ẩn video' : 'Video'}</button>
              {queue.length > 0 && <button className="link-btn" onClick={() => { if (window.confirm('Xoá toàn bộ playlist Mới đăng?')) onClear() }}>Xóa</button>}
            </div>
          </div>

          {showQueue && (
            <ul className="queue">
              {recentTracks.map(({ track: t, queueIndex: i }) => (
                <li key={t.key} className={`queue__item ${i === index ? 'is-current' : ''}`} aria-current={i === index ? 'true' : undefined}>
                  <button className="queue__play" onClick={() => onSelectRecent(i)}>
                    {t.kind === 'playlist'
                      ? <span className="queue__thumb queue__thumb--list">≡</span>
                      : <img className="queue__thumb" src={videoThumb(t.videoId, 'default')} alt="" loading="lazy" />}
                    <span className="queue__label">
                      <span className="queue__name">{t.title || (t.kind === 'playlist' ? 'Playlist' : 'Video')}</span>
                    </span>
                  </button>
                  {admin && i === index && (
                    <button className={`queue__default ${sameTrack(t, defaultTrack) ? 'is-on' : ''}`}
                      onClick={() => sameTrack(t, defaultTrack) ? onClearDefaultTrack() : onSetDefaultTrack(t)}
                      title={sameTrack(t, defaultTrack) ? 'Bỏ bài hát mặc định khi mở trang' : 'Đặt làm bài hát mặc định khi mở trang'}
                      aria-label={sameTrack(t, defaultTrack) ? 'Bỏ bài hát mặc định' : 'Đặt bài hát mặc định'}>
                      {sameTrack(t, defaultTrack) ? '★' : '☆'}
                    </button>
                  )}
                  <button className="queue__remove" onClick={() => onRemove(i)} title="Xóa">✕</button>
                </li>
              ))}
              {queue.length === 0 && (
                <li className="queue__empty">Playlist Mới đăng chưa có bài nào — mở tab “Thêm nhạc” để dán link.</li>
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
                        {editPlId === p.id ? (
                          <form className="pl-rename" onSubmit={(e) => { e.preventDefault(); saveRename() }}>
                            <input autoFocus value={plRename} onChange={(e) => setPlRename(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Escape') { setEditPlId(null); setPlRename('') } }} />
                            <button type="submit" title="Lưu tên">✓</button>
                            <button type="button" className="queue__remove" onClick={() => { setEditPlId(null); setPlRename('') }} title="Hủy">✕</button>
                          </form>
                        ) : (
                          <>
                            <button className="pl-item__main" onClick={() => onLoadPlaylist(p.id, 'replace')} title="Phát playlist này">
                              <span className="pl-item__name">♫ {p.name}</span>
                              <span className="pl-item__count">{p.tracks.length} bài</span>
                            </button>
                            {onRenamePlaylist && <button className="link-btn" onClick={() => startRename(p)} title="Đổi tên playlist">✎</button>}
                            <button className="link-btn" onClick={() => onLoadPlaylist(p.id, 'append')} title="Thêm vào playlist Mới đăng">＋</button>
                            <button className="queue__remove" onClick={() => { if (window.confirm(`Xoá playlist “${p.name}”? Không thể hoàn tác.`)) onDeletePlaylist(p.id) }} title="Xóa playlist">✕</button>
                          </>
                        )}
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
                                  <option value="__queue__">▶ Playlist Mới đăng</option>
                                  {playlists.filter((x) => x.id !== p.id).map((x) => (
                                    <option key={x.id} value={x.id}>♫ {x.name}</option>
                                  ))}
                                </select>
                              )}
                              {onRemoveFromPlaylist && (
                                <button className="queue__remove" onClick={() => { if (window.confirm('Xoá bài này khỏi playlist?')) onRemoveFromPlaylist(p.id, i) }} title="Xoá khỏi playlist">✕</button>
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

function sameTrack(a, b) {
  if (!a || !b || a.kind !== b.kind) return false
  return a.kind === 'playlist' ? a.playlistId === b.playlistId : a.videoId === b.videoId
}
