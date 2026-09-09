import { useEffect, useMemo, useState, useCallback } from 'react'
import Scene from './components/Scene'
import Player from './components/Player'
import AmbientMixer from './components/AmbientMixer'
import Journal from './components/Journal'
import SettingsModal from './components/SettingsModal'
import { useYouTube } from './hooks/useYouTube'
import { useAmbient } from './hooks/useAmbient'
import { useGistSync } from './hooks/useGistSync'
import { load, save } from './lib/storage'

// Vài gợi ý lofi/piano buồn (người dùng có thể thay bằng link của mình).
const PRESETS = [
  { title: 'Lofi Girl · radio', videoId: 'jfKfPfyJRdk' },
  { title: 'Piano buồn', videoId: 'lTRiuFIWV54' },
  { title: 'Lofi để ngủ', videoId: 'rUxyKA_-grg' },
]

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

  const [scene, setScene] = useState(() => load('vibe.scene', 'fog'))
  const [photo, setPhoto] = useState(() => load('vibe.photo', ''))

  const [username, setUsername] = useState(() => load('vibe.username', ''))
  const [syncConfig, setSyncConfig] = useState(() =>
    load('vibe.sync', { token: '', gistId: '', roomName: 'Vibe Space Journal' }),
  )
  const [settingsOpen, setSettingsOpen] = useState(false)

  const journal = useGistSync({ ...syncConfig, username })

  // ---- Lưu trạng thái ----
  useEffect(() => save('vibe.queue', queue), [queue])
  useEffect(() => save('vibe.ytVolume', ytVolume), [ytVolume])
  useEffect(() => save('vibe.scene', scene), [scene])
  useEffect(() => save('vibe.photo', photo), [photo])
  useEffect(() => save('vibe.username', username), [username])
  useEffect(() => save('vibe.sync', syncConfig), [syncConfig])

  // ---- Điều khiển hàng chờ ----
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

  const onLoadPreset = useCallback((p) => {
    onAddMany([{ type: 'video', videoId: p.videoId }])
  }, [onAddMany])

  const onClear = useCallback(() => {
    setQueue([])
    setIndex(0)
  }, [])

  const onRemove = useCallback((i) => {
    setQueue((q) => q.filter((_, idx) => idx !== i))
    setIndex((cur) => (i < cur ? cur - 1 : cur))
  }, [])

  const onNext = useCallback(() => {
    setQueue((q) => {
      if (!q.length) return q
      const ni = (index + 1) % q.length
      setIndex(ni)
      yt.playTrack(q[ni])
      return q
    })
  }, [index, yt])

  const onPrev = useCallback(() => {
    setQueue((q) => {
      if (!q.length) return q
      const pi = (index - 1 + q.length) % q.length
      setIndex(pi)
      yt.playTrack(q[pi])
      return q
    })
  }, [index, yt])

  // Hết bài -> tự chuyển bài
  useEffect(() => { yt.setOnEnded(onNext) }, [yt, onNext])

  // Áp âm lượng YouTube
  useEffect(() => { if (yt.ready) yt.setVolume(ytVolume) }, [ytVolume, yt.ready, yt])

  // Cập nhật tên bài thật vào hàng chờ khi biết được
  useEffect(() => {
    if (!yt.nowTitle) return
    setQueue((q) => {
      if (!q[index] || q[index].title === yt.nowTitle) return q
      const nq = [...q]
      nq[index] = { ...nq[index], title: yt.nowTitle }
      return nq
    })
  }, [yt.nowTitle, index])

  // Mật độ mưa nhìn = nền theo preset + mức âm lượng mưa đang chỉnh
  const rainDensity = useMemo(() => {
    const base = scene === 'rain' ? 0.55 : scene === 'ray' ? 0.12 : 0.28
    return Math.min(1, base + ambient.levels.rain * 0.6)
  }, [scene, ambient.levels.rain])

  return (
    <div className="app">
      <Scene scene={scene} rain={rainDensity} photo={photo} />

      <div className="app__shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark">☔</span>
            <div>
              <h1>Vibe Space</h1>
              <p>Đà Lạt trong màn sương những năm 90</p>
            </div>
          </div>
          <div className="topbar__actions">
            <div className="scene-tabs">
              {[
                { id: 'fog', label: '🌫️ Sương' },
                { id: 'rain', label: '🌧️ Mưa' },
                { id: 'ray', label: '🌤️ Nắng' },
              ].map((s) => (
                <button
                  key={s.id}
                  className={`scene-tab ${scene === s.id ? 'is-active' : ''}`}
                  onClick={() => setScene(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Cài đặt">⚙</button>
          </div>
        </header>

        <main className="grid">
          <div className="grid__col grid__col--left">
            <Player
              yt={yt}
              queue={queue}
              index={index}
              onAddMany={onAddMany}
              onSelect={playAt}
              onRemove={onRemove}
              onClear={onClear}
              onNext={onNext}
              onPrev={onPrev}
              ytVolume={ytVolume}
              setYtVolume={setYtVolume}
              presets={PRESETS}
              onLoadPreset={onLoadPreset}
            />
            <AmbientMixer ambient={ambient} />
          </div>

          <div className="grid__col grid__col--right">
            <Journal
              journal={journal}
              username={username}
              setUsername={setUsername}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        </main>

        <footer className="footer">
          <span>Pha một tách trà, nghe mưa rơi… ☕</span>
        </footer>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={syncConfig}
        setConfig={setSyncConfig}
        scene={scene}
        setScene={setScene}
        photo={photo}
        setPhoto={setPhoto}
      />
    </div>
  )
}
