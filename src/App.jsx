import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Scene from './components/Scene'
import Player from './components/Player'
import AmbientMixer from './components/AmbientMixer'
import Journal from './components/Journal'
import SettingsModal from './components/SettingsModal'
import Dock from './components/Dock'
import VideoPip from './components/VideoPip'
import { useYouTube } from './hooks/useYouTube'
import { useAmbient } from './hooks/useAmbient'
import { useGistSync } from './hooks/useGistSync'
import { useSupabaseRoom } from './hooks/useSupabaseRoom'
import { load, save } from './lib/storage'
import { DEFAULT_BACKGROUNDS, DEFAULT_BG_ID } from './lib/backgrounds'
import { SUPABASE_DEFAULTS } from './lib/supabaseDefaults'

let keySeed = 1
const nextKey = () => `t${keySeed++}-${Math.random().toString(36).slice(2, 6)}`

function trackFromParsed(p, title = '') {
  if (p.type === 'playlist') {
    return { key: nextKey(), kind: 'playlist', playlistId: p.playlistId, title: title || 'Playlist YouTube' }
  }
  return { key: nextKey(), kind: 'video', videoId: p.videoId, title }
}

export default function App() {
  const yt = useYouTube('yt-frame')
  const ambient = useAmbient()

  const [queue, setQueue] = useState(() => load('vibe.queue', []))
  const [index, setIndex] = useState(0)
  const [ytVolume, setYtVolume] = useState(() => load('vibe.ytVolume', 70))
  const [localPlaylists, setLocalPlaylists] = useState(() => load('vibe.playlists', []))

  const [scene, setScene] = useState(() => load('vibe.scene', 'fog'))
  const [userBgs, setUserBgs] = useState(() => load('vibe.userBgs', []))
  const [hiddenBg, setHiddenBg] = useState(() => load('vibe.hiddenBg', []))
  const [bgId, setBgId] = useState(() => load('vibe.bgId', DEFAULT_BG_ID))
  const backgrounds = useMemo(
    () => [...DEFAULT_BACKGROUNDS, ...userBgs].filter((b) => !hiddenBg.includes(b.id)),
    [userBgs, hiddenBg],
  )
  const currentBg = backgrounds.find((b) => b.id === bgId) || backgrounds[0]

  const [username, setUsername] = useState(() => load('vibe.username', ''))
  const [syncConfig, setSyncConfig] = useState(() =>
    load('vibe.sync', { token: '', gistId: '', roomName: 'Vibe Space Journal' }),
  )
  const [supaConfig, setSupaConfig] = useState(() =>
    load('vibe.supabase', SUPABASE_DEFAULTS),
  )

  // Điều khiển hiển thị: mặc định đóng hết để thấy trọn khung cảnh
  const [leftTab, setLeftTab] = useState(null)   // null | 'music' | 'ambient'
  const [journalOpen, setJournalOpen] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [admin, setAdmin] = useState(() => load('vibe.admin', false))

  const gist = useGistSync({ ...syncConfig, username })
  const supa = useSupabaseRoom(supaConfig, username)
  const journal = supa.enabled ? supa.journal : gist
  const playlists = supa.enabled ? supa.playlists : localPlaylists

  const supaRef = useRef(supa); supaRef.current = supa
  const playlistsRef = useRef(playlists); playlistsRef.current = playlists

  useEffect(() => save('vibe.queue', queue), [queue])
  useEffect(() => save('vibe.playlists', localPlaylists), [localPlaylists])
  useEffect(() => save('vibe.supabase', supaConfig), [supaConfig])
  useEffect(() => save('vibe.ytVolume', ytVolume), [ytVolume])
  useEffect(() => save('vibe.scene', scene), [scene])
  useEffect(() => save('vibe.bgId', bgId), [bgId])
  useEffect(() => save('vibe.userBgs', userBgs), [userBgs])
  useEffect(() => save('vibe.hiddenBg', hiddenBg), [hiddenBg])
  useEffect(() => save('vibe.username', username), [username])
  useEffect(() => save('vibe.sync', syncConfig), [syncConfig])
  useEffect(() => save('vibe.admin', admin), [admin])

  const playAt = useCallback((i) => {
    setQueue((q) => {
      const t = q[i]
      if (t) { setIndex(i); yt.playTrack(t) }
      return q
    })
  }, [yt])

  const onAddMany = useCallback((parsedList) => {
    const list = Array.isArray(parsedList) ? parsedList : [parsedList]
    setQueue((q) => {
      const newTracks = list.map((p) => trackFromParsed(p))
      const nq = [...q, ...newTracks]
      if (q.length === 0 && newTracks.length) {
        setIndex(0)
        setTimeout(() => yt.playTrack(newTracks[0]), 0)
      }
      return nq
    })
  }, [yt])

  const onClear = useCallback(() => { setQueue([]); setIndex(0) }, [])

  // ---- Playlist: lưu / tải / xóa (Supabase khi bật, không thì localStorage) ----
  const savePlaylist = useCallback((name) => {
    setQueue((q) => {
      if (!q.length) return q
      const tracks = q.map(({ kind, videoId, playlistId, title }) => ({ kind, videoId, playlistId, title }))
      const nm = name || 'Playlist mới'
      if (supaRef.current.enabled) {
        supaRef.current.savePlaylistRow(nm, tracks)
      } else {
        const pl = { id: `pl${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: nm, tracks, ts: Date.now() }
        setLocalPlaylists((list) => [pl, ...list])
      }
      return q
    })
  }, [])

  const loadPlaylist = useCallback((id, mode = 'replace') => {
    const pl = playlistsRef.current.find((p) => p.id === id)
    if (!pl) return
    const tracks = pl.tracks.map((t) => ({ key: nextKey(), ...t }))
    setQueue((q) => {
      const nq = mode === 'append' ? [...q, ...tracks] : tracks
      if (mode !== 'append' || q.length === 0) {
        setIndex(0)
        setTimeout(() => yt.playTrack(nq[0]), 0)
      }
      return nq
    })
  }, [yt])

  const deletePlaylist = useCallback((id) => {
    if (supaRef.current.enabled) supaRef.current.deletePlaylistRow(id)
    else setLocalPlaylists((list) => list.filter((p) => p.id !== id))
  }, [])
  const onRemove = useCallback((i) => {
    setQueue((q) => q.filter((_, idx) => idx !== i))
    setIndex((cur) => (i < cur ? cur - 1 : cur))
  }, [])

  const onNext = useCallback(() => {
    setQueue((q) => {
      if (!q.length) return q
      const ni = (index + 1) % q.length
      setIndex(ni); yt.playTrack(q[ni]); return q
    })
  }, [index, yt])
  const onPrev = useCallback(() => {
    setQueue((q) => {
      if (!q.length) return q
      const pi = (index - 1 + q.length) % q.length
      setIndex(pi); yt.playTrack(q[pi]); return q
    })
  }, [index, yt])

  useEffect(() => { yt.setOnEnded(onNext) }, [yt, onNext])
  useEffect(() => { if (yt.ready) yt.setVolume(ytVolume) }, [ytVolume, yt.ready, yt])

  useEffect(() => {
    if (!yt.nowTitle) return
    setQueue((q) => {
      if (!q[index] || q[index].title === yt.nowTitle) return q
      const nq = [...q]; nq[index] = { ...nq[index], title: yt.nowTitle }; return nq
    })
  }, [yt.nowTitle, index])

  const rainDensity = useMemo(() => {
    const base = scene === 'rain' ? 0.55 : scene === 'ray' ? 0.12 : 0.28
    return Math.min(1, base + ambient.levels.rain * 0.6)
  }, [scene, ambient.levels.rain])

  const toggleLeft = (tab) => setLeftTab((cur) => (cur === tab ? null : tab))

  const cycleBg = useCallback((dir) => {
    const ids = backgrounds.map((b) => b.id)
    const i = Math.max(0, ids.indexOf(bgId))
    setBgId(ids[(i + dir + ids.length) % ids.length])
  }, [backgrounds, bgId])

  const addUserBg = useCallback((label, url) => {
    const id = `u${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setUserBgs((list) => [...list, { id, label: label || 'Ảnh của tôi', url, thumb: url }])
    setBgId(id)
  }, [])

  const removeBackground = useCallback((id) => {
    if (id === 'vector') return // giữ lại tranh vẽ làm nền dự phòng
    setUserBgs((list) => {
      if (list.some((b) => b.id === id)) return list.filter((b) => b.id !== id) // ảnh tự thêm -> xóa hẳn
      setHiddenBg((h) => (h.includes(id) ? h : [...h, id])) // ảnh mặc định -> ẩn đi
      return list
    })
    setBgId((cur) => (cur === id ? 'vector' : cur))
  }, [])

  const leftKind = leftTab || 'music' // giữ nội dung khi drawer trượt ra

  return (
    <div className={`app ${uiHidden ? 'is-immersive' : ''}`}>
      <Scene scene={scene} rain={rainDensity} photo={currentBg?.url || ''} />

      {/* Video kéo được, luôn tồn tại để nhạc tiếp tục phát */}
      <VideoPip showVideo={showVideo && !uiHidden} onClose={() => setShowVideo(false)} />

      <div className="stage">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark">☂</span>
            <h1>Vibe Space</h1>
          </div>
          <div className="topbar__actions">
            <div className="scene-tabs">
              {[
                { id: 'fog', label: '🌫️ Sương' },
                { id: 'rain', label: '🌧️ Mưa' },
                { id: 'ray', label: '🌤️ Nắng' },
              ].map((s) => (
                <button key={s.id} className={`scene-tab ${scene === s.id ? 'is-active' : ''}`}
                  onClick={() => setScene(s.id)}>{s.label}</button>
              ))}
            </div>
            <button className="icon-btn" onClick={() => cycleBg(1)} title={`Ảnh: ${currentBg?.label || ''} — bấm để đổi`}>🖼</button>
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Cài đặt">⚙</button>
          </div>
        </header>

        {/* Drawer trái: Nhạc / Không gian (trượt từ cạnh trái) */}
        <aside className={`drawer drawer--left ${leftTab ? 'is-open' : ''}`}>
          <div className="drawer__tabs">
            <button className={`drawer__tab ${leftTab === 'music' ? 'is-active' : ''}`} onClick={() => setLeftTab('music')}>♫ Nhạc</button>
            <button className={`drawer__tab ${leftTab === 'ambient' ? 'is-active' : ''}`} onClick={() => setLeftTab('ambient')}>☔ Không gian</button>
            <button className="drawer__close" onClick={() => setLeftTab(null)} title="Đóng">✕</button>
          </div>
          <div className="drawer__body">
            {leftKind === 'music' ? (
              <Player
                queue={queue} index={index} nowTitle={yt.nowTitle}
                onAddMany={onAddMany} onSelect={playAt} onRemove={onRemove} onClear={onClear}
                showVideo={showVideo} onToggleVideo={() => setShowVideo((v) => !v)}
                playlists={playlists} onSavePlaylist={savePlaylist}
                onLoadPlaylist={loadPlaylist} onDeletePlaylist={deletePlaylist}
              />
            ) : (
              <AmbientMixer ambient={ambient} />
            )}
          </div>
        </aside>

        {/* Drawer phải: Nhật ký (trượt từ cạnh phải) */}
        <aside className={`drawer drawer--right ${journalOpen ? 'is-open' : ''}`}>
          <div className="drawer__body drawer__body--flush">
            <Journal
              journal={journal} username={username} setUsername={setUsername}
              onOpenSettings={() => setSettingsOpen(true)}
              onClose={() => setJournalOpen(false)}
              admin={admin}
            />
          </div>
        </aside>
      </div>

      <Dock
        yt={yt} queue={queue} index={index}
        onNext={onNext} onPrev={onPrev} ytVolume={ytVolume} setYtVolume={setYtVolume}
        leftTab={leftTab} onToggleLeft={toggleLeft}
        journalOpen={journalOpen} onToggleJournal={() => setJournalOpen((v) => !v)}
        onHideUI={() => setUiHidden(true)}
      />

      {/* Chế độ ngắm cảnh: chỉ còn vài toggle cần thiết */}
      {uiHidden && (
        <div className="immersive-bar">
          <button className="ctrl" onClick={onPrev} title="Bài trước" disabled={!queue.length}>⏮</button>
          <button className="ctrl ctrl--main" onClick={yt.toggle} title="Phát/Dừng" disabled={!yt.current}>
            {yt.playing ? '❚❚' : '►'}
          </button>
          <button className="ctrl" onClick={onNext} title="Bài sau" disabled={!queue.length}>⏭</button>
          <button className="ctrl" onClick={() => setUiHidden(false)} title="Hiện giao diện">◉</button>
        </div>
      )}

      <SettingsModal
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        config={syncConfig} setConfig={setSyncConfig}
        supaConfig={supaConfig} setSupaConfig={setSupaConfig} supaStatus={supa.status} supaError={supa.error}
        admin={admin} setAdmin={setAdmin}
        scene={scene} setScene={setScene}
        backgrounds={backgrounds} bgId={bgId} setBgId={setBgId}
        onAddBg={addUserBg} onRemoveBg={removeBackground}
        hiddenCount={hiddenBg.length} onRestoreBg={() => setHiddenBg([])}
      />
    </div>
  )
}
