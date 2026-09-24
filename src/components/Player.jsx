import { useState, useMemo } from 'react'
import { parseYouTube, videoThumb, trackName } from '../lib/youtube'
import { IconCheck, IconClose, IconEdit, IconPrev, IconNext, IconPlay, IconPause, IconRefresh, IconTrash, IconVideo } from './icons'

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
  onAddMany, onSelect, onSelectRecent, onPlayRecent, onRemove, onClear,
  showVideo, onToggleVideo, queueOrder, queueSort, onQueueSortChange, onReshuffleQueue,
  playlists, onSavePlaylist, onLoadPlaylist, onDeletePlaylist,
  onAddToPlaylist, onCreatePlaylist, onMoveTrack, onRemoveFromPlaylist, onRenamePlaylist,
  admin, defaultTrack, onSetDefaultTrack, onClearDefaultTrack,
  recentLimit, onRecentLimitChange,
  onTabChange, titles,
}) {
  const [tab, setTab] = useState('now')            // 'now' | 'recent' | 'library' | 'add'
  const [editPlId, setEditPlId] = useState(null)   // id playlist đang đổi tên
  const [plRename, setPlRename] = useState('')
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(null)   // id playlist đang mở xem bài
  const [showPlaylists, setShowPlaylists] = useState(true)
  const [note, setNote] = useState('')
  const [plName, setPlName] = useState('')
  const [target, setTarget] = useState('__queue__') // __queue__ | <playlistId> | __new__
  const [newName, setNewName] = useState('')
  const [search, setSearch] = useState('')

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
  // "Mới đăng": gộp bài mới nhất từ HÀNG CHỜ + TẤT CẢ playlist đã lưu (bỏ trùng
  // theo videoId/playlistId, giữ mốc mới nhất), xếp mới nhất lên đầu. Cắt theo filter.
  const recentPool = useMemo(() => {
    const seen = new Map()
    const keyOf = (t) => (t.kind === 'playlist' ? `pl:${t.playlistId}` : `v:${t.videoId}`)
    const consider = (t) => {
      if (!t || (t.kind === 'playlist' ? !t.playlistId : !t.videoId)) return
      const k = keyOf(t)
      const at = addedTime(t, 0)
      const prev = seen.get(k)
      if (!prev || at > prev.at) seen.set(k, { track: t, at })
    }
    ;(queue || []).forEach(consider)
    ;(playlists || []).forEach((pl) => (pl.tracks || []).forEach(consider))
    return [...seen.values()].sort((a, b) => b.at - a.at).map((x) => x.track)
  }, [queue, playlists])
  const recentTracks = recentPool.slice(0, Math.max(1, Number(recentLimit) || 10))
  const currentTracks = (queueOrder?.length === queue.length ? queueOrder : queue.map((_, queueIndex) => queueIndex))
    .map((queueIndex) => ({ track: queue[queueIndex], queueIndex }))
  const sortedPlaylistTracks = (tracks) => (tracks || [])
    .map((track, sourceIndex) => ({ track, sourceIndex }))
    .sort((a, b) => addedTime(b.track, b.sourceIndex) - addedTime(a.track, a.sourceIndex))
  const displayedPlaylists = [...(playlists || [])].sort((a, b) => (b.ts || 0) - (a.ts || 0))
  const searchKey = search.trim().toLocaleLowerCase('vi')
  const matchesTrack = (track) => !searchKey || (trackName(track, titles) || '').toLocaleLowerCase('vi').includes(searchKey)
  const searchedRecentTracks = searchKey ? recentTracks.filter(matchesTrack) : recentTracks
  const searchedPlaylists = searchKey
    ? displayedPlaylists.filter((playlist) => playlist.name.toLocaleLowerCase('vi').includes(searchKey) || playlist.tracks.some(matchesTrack))
    : displayedPlaylists
  const currentTrack = queue[index]
  const currentTitle = yt?.nowTitle || trackName(currentTrack, titles) || 'Chưa chọn bài hát'
  const duration = Number(yt?.duration) || 0
  const currentTime = Math.min(Number(yt?.currentTime) || 0, duration || Infinity)
  const selectTab = (next) => { setTab(next); onTabChange?.(next) }
  const timeLabel = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0))
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
  }

  return (
    <div className="pane">
      <div className="player__tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'now'}
          className={`player__tab ${tab === 'now' ? 'is-active' : ''}`}
          onClick={() => selectTab('now')}>Đang nghe</button>
        <button role="tab" aria-selected={tab === 'recent'}
          className={`player__tab ${tab === 'recent' ? 'is-active' : ''}`}
          onClick={() => selectTab('recent')}>Mới đăng</button>
        <button role="tab" aria-selected={tab === 'library'}
          className={`player__tab ${tab === 'library' ? 'is-active' : ''}`}
          onClick={() => selectTab('library')}>♫ Thư viện</button>
        <button role="tab" aria-selected={tab === 'add'}
          className={`player__tab ${tab === 'add' ? 'is-active' : ''}`}
          onClick={() => selectTab('add')}>＋ Thêm nhạc</button>
      </div>

      {note && <div className="form-note">{note}</div>}

      {(tab === 'recent' || tab === 'library') && (
        <label className="player__search">
          <span className="sr-only">Tìm bài hát hoặc playlist</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm bài hát hoặc playlist…" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Xóa nội dung tìm kiếm"><IconClose /></button>}
        </label>
      )}

      <section className={`now-player ${tab === 'now' ? '' : 'is-tab-hidden'}`} aria-label="Trình phát nhạc"
        aria-hidden={tab !== 'now'} inert={tab !== 'now' ? '' : undefined}>
          <aside className="now-player__queue">
            <div className="now-player__queue-head">
              <div className="now-player__queue-title"><strong>{playlistName || 'Mới đăng'}</strong><span>{queue.length} bài</span></div>
              <div className="now-player__sort">
                <label htmlFor="now-playlist-sort">Sắp xếp</label>
                <select id="now-playlist-sort" value={queueSort} onChange={(event) => onQueueSortChange(event.target.value)}>
                  <option value="latest">Mới nhất</option>
                  <option value="name">Tên A–Z</option>
                  <option value="random">Ngẫu nhiên</option>
                </select>
                {queueSort === 'random' && (
                  <button type="button" onClick={onReshuffleQueue} title="Xáo lại thứ tự ngẫu nhiên" aria-label="Xáo lại playlist đang nghe"><IconRefresh /></button>
                )}
              </div>
            </div>
            <ul className="queue">
              {currentTracks.map(({ track, queueIndex }, displayIndex) => (
                <li key={track.key || `${track.videoId}-${queueIndex}`} className={`queue__item ${queueIndex === index ? 'is-current' : ''}`}>
                  <span className="recent__rank">{String(displayIndex + 1).padStart(2, '0')}</span>
                  <button className="queue__play" onClick={() => onSelect(queueIndex)}>
                    {track.videoId ? <img className="queue__thumb" src={videoThumb(track.videoId, 'default')} alt="" loading="lazy" /> : <span className="queue__thumb queue__thumb--list">≡</span>}
                    <span className="queue__label"><span className="queue__name">{trackName(track, titles) || 'Video'}</span></span>
                  </button>
                  {admin && <button className={`queue__default ${sameTrack(track, defaultTrack) ? 'is-on' : ''}`}
                    onClick={() => sameTrack(track, defaultTrack) ? onClearDefaultTrack() : onSetDefaultTrack(track)}
                    title={sameTrack(track, defaultTrack) ? 'Bỏ bài hát mặc định khi mở trang' : 'Đặt làm bài hát mặc định khi mở trang'}
                    aria-label={sameTrack(track, defaultTrack) ? 'Bỏ bài hát mặc định' : `Đặt ${trackName(track, titles) || 'bài hát'} làm mặc định`}>
                    {sameTrack(track, defaultTrack) ? '★' : '☆'}
                  </button>}
                </li>
              ))}
              {!queue.length && <li className="queue__empty">Chưa có bài hát.</li>}
            </ul>
          </aside>
          <div className="now-player__main">
            <div className={`now-player__art ${showVideo ? 'is-video' : ''}`}>
              <div className={`now-player__video ${showVideo ? 'is-shown' : 'is-hidden'}`}><div id="yt-frame" /></div>
              {!showVideo && (currentTrack?.videoId ? <img src={videoThumb(currentTrack.videoId, 'hqdefault')} alt="" /> : <span>♫</span>)}
              {!showVideo && <i className={yt?.playing ? 'is-playing' : ''} aria-hidden="true">❊</i>}
            </div>
            <div className="now-player__meta">
              <span>{playlistName ? `Playlist · ${playlistName}` : 'Playlist · Mới đăng'}</span>
              <h3 title={currentTitle}>{currentTitle}</h3>
              <small>{queue.length ? `${Math.max(0, currentTracks.findIndex((item) => item.queueIndex === index)) + 1} / ${queue.length}` : 'Chưa có bài'}</small>
            </div>
            <div className="now-player__controls">
              <div className="now-player__seek">
                <span>{timeLabel(currentTime)}</span>
                <input type="range" min="0" max={duration || 0.1} step="0.1" value={currentTime}
                  disabled={!duration} onChange={(event) => yt?.seekTo(Number(event.target.value))} aria-label="Tua bài hát" />
                <span>{timeLabel(duration)}</span>
              </div>
              <div className="now-player__control-row">
                <div className="now-player__transport">
                  <button className="ctrl" onClick={onPrev} aria-label="Bài trước" disabled={!queue.length}><IconPrev /></button>
                  <button className="ctrl ctrl--main" onClick={yt?.toggle} aria-label={yt?.playing ? 'Dừng' : 'Phát'} disabled={!yt?.current}>
                    {yt?.playing ? <IconPause /> : <IconPlay />}
                  </button>
                  <button className="ctrl" onClick={onNext} aria-label="Bài sau" disabled={!queue.length}><IconNext /></button>
                  <button className={`ctrl ctrl--sm ${showVideo ? 'is-on' : ''}`} onClick={onToggleVideo}
                    title={showVideo ? 'Ẩn video YouTube' : 'Trình chiếu video YouTube trong khung'}
                    aria-label={showVideo ? 'Ẩn video' : 'Hiện video'}><IconVideo /></button>
                </div>
                <label className="now-player__volume" title="Âm lượng"><b>♪</b>
                  <input type="range" min="0" max="100" value={ytVolume} onChange={(event) => setYtVolume(Number(event.target.value))} aria-label="Âm lượng" />
                </label>
              </div>
            </div>
          </div>
      </section>
      {tab !== 'now' && (tab === 'recent' ? (
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
            {searchedRecentTracks.map((track, rank) => {
              const isCurrent = currentTrack && sameTrack(track, currentTrack)
              return (
                <li key={track.recordId || track.key || `${track.videoId || track.playlistId}-${rank}`}
                  className={`queue__item ${isCurrent ? 'is-current' : ''}`} aria-current={isCurrent ? 'true' : undefined}>
                  <span className="recent__rank">{String(rank + 1).padStart(2, '0')}</span>
                  <button className="queue__play" onClick={() => (onPlayRecent ? onPlayRecent(track) : onSelectRecent?.(index))}>
                    {track.kind === 'playlist'
                      ? <span className="queue__thumb queue__thumb--list">≡</span>
                      : <img className="queue__thumb" src={videoThumb(track.videoId, 'default')} alt="" loading="lazy" />}
                    <span className="queue__label"><span className="queue__name">{trackName(track, titles) || (track.kind === 'playlist' ? 'Playlist' : 'Video')}</span></span>
                  </button>
                  {admin && (
                    <button className={`queue__default ${sameTrack(track, defaultTrack) ? 'is-on' : ''}`}
                      onClick={() => sameTrack(track, defaultTrack) ? onClearDefaultTrack() : onSetDefaultTrack(track)}
                      title={sameTrack(track, defaultTrack) ? 'Bỏ bài hát mặc định khi mở trang' : 'Đặt làm bài hát mặc định khi mở trang'}
                      aria-label={sameTrack(track, defaultTrack) ? 'Bỏ bài hát mặc định' : 'Đặt bài hát mặc định'}>
                      {sameTrack(track, defaultTrack) ? '★' : '☆'}
                    </button>
                  )}
                </li>
              )
            })}
            {!searchedRecentTracks.length && <li className="queue__empty">{searchKey ? 'Không tìm thấy bài phù hợp.' : 'Chưa có bài nào được đăng.'}</li>}
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
          {playlists?.length > 0 && (
            <div className={`pl-saved ${!showPlaylists ? 'is-collapsed' : ''}`}>
              <div className="queue__head">
                <button className="pl-collapse" onClick={() => setShowPlaylists((v) => !v)} title="Ẩn/hiện playlist">
                  <span className="pl-collapse__caret">{showPlaylists ? '▾' : '▸'}</span> Playlist · {playlists.length}
                </button>
              </div>
              {showPlaylists && (
                <ul className="pl-list">
                  {searchedPlaylists.map((p) => (
                    <li key={p.id} className="pl-group">
                      <div className="pl-item">
                        <button className="pl-expand" onClick={() => setExpanded((e) => (e === p.id ? null : p.id))}
                          title="Xem các bài trong playlist">{expanded === p.id ? '▾' : '▸'}</button>
                        {editPlId === p.id ? (
                          <form className="pl-rename" onSubmit={(e) => { e.preventDefault(); saveRename() }}>
                            <input autoFocus value={plRename} onChange={(e) => setPlRename(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Escape') { setEditPlId(null); setPlRename('') } }} />
                            <button type="submit" title="Lưu tên" aria-label="Lưu tên playlist"><IconCheck /></button>
                            <button type="button" className="queue__remove" onClick={() => { setEditPlId(null); setPlRename('') }} title="Hủy" aria-label="Hủy đổi tên"><IconClose /></button>
                          </form>
                        ) : (
                          <>
                            <button className="pl-item__main" onClick={() => onLoadPlaylist(p.id, 'replace')} title="Phát playlist này">
                              <span className="pl-item__name">♫ {p.name}</span>
                              <span className="pl-item__count">{p.tracks.length} bài</span>
                            </button>
                            {onRenamePlaylist && <button className="link-btn" onClick={() => startRename(p)} title="Đổi tên playlist" aria-label="Đổi tên playlist"><IconEdit /></button>}
                            <button className="link-btn" onClick={() => onLoadPlaylist(p.id, 'append')} title="Thêm vào playlist Mới đăng">＋</button>
                            <button className="queue__remove" onClick={() => { if (window.confirm(`Xoá playlist “${p.name}”? Không thể hoàn tác.`)) onDeletePlaylist(p.id) }} title="Xóa playlist" aria-label="Xóa playlist"><IconTrash /></button>
                          </>
                        )}
                      </div>
                      {expanded === p.id && (
                        <ul className="pl-tracks">
                          {p.tracks.length === 0 && <li className="pl-track pl-track--empty">Playlist trống.</li>}
                          {sortedPlaylistTracks(p.tracks).map(({ track: t, sourceIndex: i }) => (
                            <li key={t.recordId || `${t.videoId || t.playlistId}-${i}`} className="pl-track">
                              <span className="pl-track__name">{t.kind === 'playlist' ? '≡ ' : ''}{trackName(t, titles) || 'Video'}</span>
                              {admin && <button className={`queue__default ${sameTrack(t, defaultTrack) ? 'is-on' : ''}`}
                                onClick={() => sameTrack(t, defaultTrack) ? onClearDefaultTrack() : onSetDefaultTrack(t)}
                                title={sameTrack(t, defaultTrack) ? 'Bỏ bài hát mặc định khi mở trang' : 'Đặt làm bài hát mặc định khi mở trang'}
                                aria-label={sameTrack(t, defaultTrack) ? 'Bỏ bài hát mặc định' : `Đặt ${t.title || 'bài hát'} làm mặc định`}>
                                {sameTrack(t, defaultTrack) ? '★' : '☆'}
                              </button>}
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
                                <button className="queue__remove" onClick={() => { if (window.confirm('Xoá bài này khỏi playlist?')) onRemoveFromPlaylist(p.id, i) }} title="Xoá khỏi playlist" aria-label="Xóa bài khỏi playlist"><IconTrash /></button>
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
          {!playlists?.length && <div className="queue__empty">Chưa có playlist đã lưu. Bạn có thể tạo playlist trong tab “Thêm nhạc”.</div>}
          {playlists?.length > 0 && !searchedPlaylists.length && <div className="queue__empty">Không tìm thấy playlist hoặc bài hát phù hợp.</div>}
        </div>
      ))}
    </div>
  )
}

function sameTrack(a, b) {
  if (!a || !b || a.kind !== b.kind) return false
  return a.kind === 'playlist' ? a.playlistId === b.playlistId : a.videoId === b.videoId
}
