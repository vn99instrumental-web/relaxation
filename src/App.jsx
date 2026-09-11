import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react'
import Scene from './components/Scene'
import FallingFx from './components/FallingFx'
import { hasWebGL } from './leaf-engine/quality'
import Player from './components/Player'
import AmbientMixer from './components/AmbientMixer'
import Journal from './components/Journal'
import Poems from './components/Poems'
import SettingsModal from './components/SettingsModal'
import Dock from './components/Dock'
import VideoPip from './components/VideoPip'
import { IconMusic, IconAmbient } from './components/icons'
import { useYouTube } from './hooks/useYouTube'
import { useAmbient } from './hooks/useAmbient'
import { useWakeLock } from './hooks/useWakeLock'
import { useGistSync } from './hooks/useGistSync'
import { useSupabaseRoom } from './hooks/useSupabaseRoom'
import { useSupabaseGallery } from './hooks/useSupabaseGallery'
import { useRoomSettings } from './hooks/useRoomSettings'
import { usePoems } from './hooks/usePoems'
import { load, save } from './lib/storage'
import { DEFAULT_BACKGROUNDS, DEFAULT_BG_ID, BUILTIN_SCENES } from './lib/backgrounds'
import { pickTagline } from './lib/taglines'
import { SUPABASE_DEFAULTS } from './lib/supabaseDefaults'

// Tải LeafEngine (Three.js) theo yêu cầu — không nằm trong gói khởi động, nên
// không ảnh hưởng tốc độ mở trang hay trình phát nhạc.
const LeafEngine = lazy(() => import('./leaf-engine'))

let keySeed = 1
const nextKey = () => `t${keySeed++}-${Math.random().toString(36).slice(2, 6)}`

// Các giao diện (độc lập với ảnh nền) — bộ màu từ thiết kế Stitch
const THEMES = [
  { id: 'dusk', label: 'Hoàng hôn' },
  { id: 'rain', label: 'Đêm mưa' },
  { id: 'morning', label: 'Sáng sớm' },
  { id: 'film', label: 'Phim xưa' },
]

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
  const [shuffle, setShuffle] = useState(() => load('vibe.shuffle', false))
  const [autoplay, setAutoplay] = useState(() => load('vibe.autoplay', true))

  const [scene, setScene] = useState(() => load('vibe.scene', 'fog'))
  const [userBgs, setUserBgs] = useState(() => load('vibe.userBgs', []))
  const [hiddenBg, setHiddenBg] = useState(() => load('vibe.hiddenBg', []))
  const [bgId, setBgId] = useState(() => load('vibe.bgId', DEFAULT_BG_ID))
  const [theme, setTheme] = useState(() => load('vibe.theme', 'dusk')) // giao diện, độc lập ảnh nền

  const [username, setUsername] = useState(() => load('vibe.username', ''))
  const [syncConfig, setSyncConfig] = useState(() =>
    load('vibe.sync', { token: '', gistId: '', roomName: 'Vibe Space Journal' }),
  )
  const [supaConfig, setSupaConfig] = useState(() =>
    load('vibe.supabase', SUPABASE_DEFAULTS),
  )

  // Điều khiển hiển thị: mặc định đóng hết để thấy trọn khung cảnh
  const [leftTab, setLeftTab] = useState(null)   // null | 'music' | 'ambient'
  const [rightTab, setRightTab] = useState(null) // null | 'journal' | 'poems'
  const journalOpen = rightTab === 'journal'
  const toggleRight = (tab) => setRightTab((cur) => (cur === tab ? null : tab))
  const [showVideo, setShowVideo] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [tagline, setTagline] = useState(() => pickTagline('dusk'))
  const [admin, setAdmin] = useState(() => load('vibe.admin', false))
  const [keepAwake, setKeepAwake] = useState(() => load('vibe.keepAwake', true))
  const [seenTs, setSeenTs] = useState(() => load('vibe.seenTs', 0)) // mốc tin đã xem
  const [fx, setFx] = useState(() => load('vibe.fx', 'leaves')) // hiệu ứng rơi: none|leaves|petals|both
  const [fxSpeed, setFxSpeed] = useState(() => { const v = load('vibe.fxSpeed', 50); return typeof v === 'number' ? v : 50 }) // 0 chậm .. 100 nhanh

  const gist = useGistSync({ ...syncConfig, username })
  const supa = useSupabaseRoom(supaConfig, username)
  const gallery = useSupabaseGallery(supaConfig)
  const roomSettings = useRoomSettings(supaConfig, admin)
  const poemsApi = usePoems(supaConfig, username)
  const journal = supa.enabled ? supa.journal : gist
  const playlists = supa.enabled ? supa.playlists : localPlaylists

  // Số tin chưa xem (của người kia, mới hơn mốc đã xem)
  const unread = useMemo(() => {
    const msgs = journal.messages || []
    return msgs.filter((m) => m.user && m.user !== username && (m.ts || 0) > seenTs).length
  }, [journal.messages, username, seenTs])

  // Ảnh nền: dùng thư viện Supabase (chung 2 người) khi có; không thì dùng local.
  const localBackgrounds = useMemo(
    () => [...DEFAULT_BACKGROUNDS, ...userBgs].filter((b) => !hiddenBg.includes(b.id)),
    [userBgs, hiddenBg],
  )
  const useShared = gallery.enabled && gallery.ready
  // 3 chủ đề vintage LUÔN ghép sẵn ở đầu (asset nội bộ, không phụ thuộc Supabase).
  // Lọc trùng phòng khi thư viện Supabase còn dòng cũ trỏ /scenes/*.
  const backgrounds = useMemo(() => {
    const rest = (useShared ? gallery.items : localBackgrounds)
      .filter((b) => !BUILTIN_SCENES.some((s) => s.id === b.id) && !(b.url || '').startsWith('/scenes/'))
    return [...BUILTIN_SCENES, ...rest]
  }, [useShared, gallery.items, localBackgrounds])
  const currentBg = backgrounds.find((b) => b.id === bgId) || backgrounds.find((b) => b.url) || backgrounds[0]

  const supaRef = useRef(supa); supaRef.current = supa
  const galleryRef = useRef(gallery); galleryRef.current = gallery
  const sharedRef = useRef(useShared); sharedRef.current = useShared
  const playlistsRef = useRef(playlists); playlistsRef.current = playlists

  useEffect(() => save('vibe.queue', queue), [queue])
  useEffect(() => save('vibe.playlists', localPlaylists), [localPlaylists])
  useEffect(() => save('vibe.shuffle', shuffle), [shuffle])
  useEffect(() => save('vibe.autoplay', autoplay), [autoplay])
  useEffect(() => save('vibe.supabase', supaConfig), [supaConfig])
  useEffect(() => save('vibe.ytVolume', ytVolume), [ytVolume])
  useEffect(() => save('vibe.scene', scene), [scene])
  useEffect(() => save('vibe.bgId', bgId), [bgId])
  useEffect(() => save('vibe.theme', theme), [theme])
  useEffect(() => save('vibe.userBgs', userBgs), [userBgs])
  useEffect(() => save('vibe.hiddenBg', hiddenBg), [hiddenBg])
  useEffect(() => save('vibe.username', username), [username])
  useEffect(() => save('vibe.sync', syncConfig), [syncConfig])
  useEffect(() => save('vibe.admin', admin), [admin])
  useEffect(() => save('vibe.keepAwake', keepAwake), [keepAwake])
  useEffect(() => save('vibe.seenTs', seenTs), [seenTs])
  useEffect(() => save('vibe.fx', fx), [fx])
  useEffect(() => save('vibe.fxSpeed', fxSpeed), [fxSpeed])

  // Giữ màn hình sáng khi đang phát (để nhạc không bị ngắt khi máy tự khóa)
  useWakeLock(keepAwake && yt.playing)

  // Đóng menu chọn giao diện khi bấm ra ngoài
  useEffect(() => {
    if (!themeMenuOpen) return
    const close = (e) => { if (!e.target.closest?.('.theme-select-wrap')) setThemeMenuOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [themeMenuOpen])

  // Tagline dưới tên: đổi theo theme (gợi ý thời tiết) + tự xoay vòng ngẫu nhiên
  useEffect(() => {
    setTagline(pickTagline(theme))
    const id = setInterval(() => setTagline(pickTagline(theme)), 45000)
    return () => clearInterval(id)
  }, [theme])

  // Mở nhật ký -> đánh dấu đã xem hết; xin quyền thông báo (cần thao tác người dùng)
  useEffect(() => {
    if (!journalOpen) return
    const msgs = journal.messages || []
    if (msgs.length) setSeenTs(msgs[msgs.length - 1].ts || Date.now())
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { Notification.requestPermission() } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalOpen])

  // Có tin MỚI: nếu đang xem -> đánh dấu đã xem; nếu không -> hiện thông báo hệ thống
  const prevMsgLenRef = useRef((journal.messages || []).length)
  useEffect(() => {
    const msgs = journal.messages || []
    const prev = prevMsgLenRef.current
    prevMsgLenRef.current = msgs.length
    if (msgs.length <= prev) return
    const last = msgs[msgs.length - 1]
    if (!last) return
    if (last.user === username) { setSeenTs(last.ts || Date.now()); return }
    const viewing = journalOpen && (typeof document === 'undefined' || document.visibilityState === 'visible')
    if (viewing) { setSeenTs(last.ts || Date.now()); return }
    // chỉ báo cho tin thực sự mới (tránh báo khi vừa tải trang)
    if (Date.now() - (last.ts || 0) > 60000) return
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('Hiên Mưa 💌', { body: `${last.user}: ${last.text}`, tag: 'hienmua-chat', renotify: true }) } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal.messages, journalOpen, username])

  // Nhắc số tin chưa xem ngay trên tiêu đề tab
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Hiên Mưa` : 'Hiên Mưa — Đà Lạt trong sương'
  }, [unread])

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

  const tracksFromParsed = (parsedList) =>
    parsedList.map((p) => { const { key, ...rest } = trackFromParsed(p); return rest })

  // Thêm link vào một playlist đã tạo
  const addToPlaylist = useCallback((playlistId, parsedList) => {
    const pl = playlistsRef.current.find((p) => p.id === playlistId)
    if (!pl) return
    const merged = [...pl.tracks, ...tracksFromParsed(parsedList)]
    if (supaRef.current.enabled) supaRef.current.updatePlaylistRow(playlistId, merged)
    else setLocalPlaylists((list) => list.map((p) => (p.id === playlistId ? { ...p, tracks: merged } : p)))
  }, [])

  // Chuyển 1 bài từ playlist này sang playlist khác (hoặc ra Hàng chờ)
  const moveTrack = useCallback((fromId, index, toId) => {
    const from = playlistsRef.current.find((p) => p.id === fromId)
    if (!from) return
    const track = from.tracks[index]
    if (!track || fromId === toId) return
    const remaining = from.tracks.filter((_, i) => i !== index)
    if (toId === '__queue__') {
      setQueue((q) => [...q, { key: nextKey(), ...track }])
      if (supaRef.current.enabled) supaRef.current.updatePlaylistRow(fromId, remaining)
      else setLocalPlaylists((list) => list.map((p) => (p.id === fromId ? { ...p, tracks: remaining } : p)))
      return
    }
    const to = playlistsRef.current.find((p) => p.id === toId)
    if (!to) return
    const toTracks = [...to.tracks, track]
    if (supaRef.current.enabled) {
      supaRef.current.updatePlaylistRow(fromId, remaining)
      supaRef.current.updatePlaylistRow(toId, toTracks)
    } else {
      setLocalPlaylists((list) => list.map((p) => (
        p.id === fromId ? { ...p, tracks: remaining } : p.id === toId ? { ...p, tracks: toTracks } : p
      )))
    }
  }, [])

  // Xoá 1 bài khỏi playlist
  const removeFromPlaylist = useCallback((playlistId, index) => {
    const pl = playlistsRef.current.find((p) => p.id === playlistId)
    if (!pl) return
    const tracks = pl.tracks.filter((_, i) => i !== index)
    if (supaRef.current.enabled) supaRef.current.updatePlaylistRow(playlistId, tracks)
    else setLocalPlaylists((list) => list.map((p) => (p.id === playlistId ? { ...p, tracks } : p)))
  }, [])

  // Tạo playlist mới từ link
  const createPlaylistWith = useCallback((name, parsedList) => {
    const tracks = tracksFromParsed(parsedList)
    const nm = name || `Playlist ${new Date().toLocaleDateString('vi-VN')}`
    if (supaRef.current.enabled) supaRef.current.savePlaylistRow(nm, tracks)
    else setLocalPlaylists((list) => [{ id: `pl${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: nm, tracks, ts: Date.now() }, ...list])
  }, [])
  const onRemove = useCallback((i) => {
    setQueue((q) => q.filter((_, idx) => idx !== i))
    setIndex((cur) => (i < cur ? cur - 1 : cur))
  }, [])

  const onNext = useCallback(() => {
    setQueue((q) => {
      if (!q.length) return q
      let ni
      if (shuffle && q.length > 1) {
        do { ni = Math.floor(Math.random() * q.length) } while (ni === index)
      } else {
        ni = (index + 1) % q.length
      }
      setIndex(ni); yt.playTrack(q[ni]); return q
    })
  }, [index, yt, shuffle])

  // Trộn thứ tự hàng chờ ngay (giữ bài đang phát lên đầu để không ngắt nhạc)
  const shuffleNow = useCallback(() => {
    setQueue((q) => {
      if (q.length < 2) return q
      const cur = q[index]
      const rest = q.filter((_, i) => i !== index)
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
      const nq = cur ? [cur, ...rest] : rest
      setIndex(0)
      return nq
    })
  }, [index])

  const onToggleShuffle = useCallback(() => {
    setShuffle((s) => {
      const next = !s
      if (next) shuffleNow() // bật trộn -> xáo luôn 1 lần cho thấy hiệu quả
      return next
    })
  }, [shuffleNow])
  const onPrev = useCallback(() => {
    setQueue((q) => {
      if (!q.length) return q
      const pi = (index - 1 + q.length) % q.length
      setIndex(pi); yt.playTrack(q[pi]); return q
    })
  }, [index, yt])

  useEffect(() => { yt.setOnEnded(onNext) }, [yt, onNext])
  useEffect(() => { if (yt.ready) yt.setVolume(ytVolume) }, [ytVolume, yt.ready, yt])

  // Tự phát 1 bài NGẪU NHIÊN khi mở trang (nếu bật). Trình duyệt thường chặn
  // phát-tự-động có tiếng (nhất là điện thoại) -> chạm đầu tiên sẽ phát bài đã chọn.
  const ytLiveRef = useRef(yt); ytLiveRef.current = yt
  const autoStartedRef = useRef(false)
  const pendingAutoRef = useRef(false)
  useEffect(() => {
    if (autoStartedRef.current || !autoplay || !yt.ready) return
    autoStartedRef.current = true
    setQueue((q) => {
      if (!q.length) return q
      const i = Math.floor(Math.random() * q.length)
      setIndex(i)
      pendingAutoRef.current = true
      setTimeout(() => ytLiveRef.current.playTrack(q[i]), 0)
      return q
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yt.ready, autoplay])
  useEffect(() => {
    const kick = () => {
      const y = ytLiveRef.current
      if (pendingAutoRef.current && !y.playing) y.play()
      pendingAutoRef.current = false
    }
    window.addEventListener('pointerdown', kick, { once: true })
    return () => window.removeEventListener('pointerdown', kick)
  }, [])

  useEffect(() => {
    if (!yt.nowTitle) return
    setQueue((q) => {
      if (!q[index] || q[index].title === yt.nowTitle) return q
      const nq = [...q]; nq[index] = { ...nq[index], title: yt.nowTitle }; return nq
    })
  }, [yt.nowTitle, index])

  // Điều khiển nhạc trên màn hình khóa / trung tâm thông báo (MediaSession)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    try {
      if (yt.nowTitle && typeof window.MediaMetadata === 'function') {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: yt.nowTitle, artist: 'Hiên Mưa', album: 'Đà Lạt trong sương',
        })
      }
      navigator.mediaSession.playbackState = yt.playing ? 'playing' : 'paused'
    } catch { /* ignore */ }
  }, [yt.nowTitle, yt.playing])
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn) } catch { /* ignore */ } }
    set('play', () => yt.play())
    set('pause', () => yt.pause())
    set('previoustrack', () => onPrev())
    set('nexttrack', () => onNext())
    return () => { set('play', null); set('pause', null); set('previoustrack', null); set('nexttrack', null) }
  }, [yt, onNext, onPrev])

  // ---- Đồng bộ cài đặt phòng: admin đổi -> mọi người theo (realtime) ----
  const syncRef = useRef({ scene: null, bgId: null, theme: null, queueSig: null })
  const queueSig = (arr) => (arr || []).map((t) => t.videoId || t.playlistId || '').join('|')

  // Nhận cài đặt từ phòng và áp dụng
  useEffect(() => {
    const s = roomSettings.settings
    if (!s || s.updated_by === roomSettings.clientId) return
    if (s.scene && s.scene !== scene) { syncRef.current.scene = s.scene; setScene(s.scene) }
    if (s.bg_id && s.bg_id !== bgId) { syncRef.current.bgId = s.bg_id; setBgId(s.bg_id) }
    if (s.theme && s.theme !== theme) { syncRef.current.theme = s.theme; setTheme(s.theme) }
    if (Array.isArray(s.queue) && queueSig(s.queue) !== queueSig(queue)) {
      const sig = queueSig(s.queue)
      syncRef.current.queueSig = sig
      const nq = s.queue.map((t) => ({ key: nextKey(), ...t }))
      setQueue(nq); setIndex(0)
      if (nq.length) setTimeout(() => yt.playTrack(nq[0]), 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSettings.settings])

  // Admin phát cài đặt khi thay đổi (bỏ qua khi giá trị vừa nhận từ phòng)
  useEffect(() => {
    if (!admin || !roomSettings.enabled || scene === syncRef.current.scene) return
    syncRef.current.scene = scene
    roomSettings.save({ scene })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, admin, roomSettings.enabled])
  useEffect(() => {
    if (!admin || !roomSettings.enabled || bgId === syncRef.current.bgId) return
    syncRef.current.bgId = bgId
    roomSettings.save({ bg_id: bgId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgId, admin, roomSettings.enabled])
  useEffect(() => {
    if (!admin || !roomSettings.enabled || theme === syncRef.current.theme) return
    syncRef.current.theme = theme
    roomSettings.save({ theme })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, admin, roomSettings.enabled])
  useEffect(() => {
    if (!admin || !roomSettings.enabled) return
    const sig = queueSig(queue)
    if (sig === syncRef.current.queueSig) return
    syncRef.current.queueSig = sig
    roomSettings.save({ queue: queue.map(({ kind, videoId, playlistId, title }) => ({ kind, videoId, playlistId, title })), q_index: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, admin, roomSettings.enabled])

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
    setUserBgs((list) => {
      if (list.some((b) => b.id === id)) return list.filter((b) => b.id !== id) // ảnh tự thêm -> xóa hẳn
      setHiddenBg((h) => (h.includes(id) ? h : [...h, id])) // ảnh mặc định -> ẩn đi
      return list
    })
    setBgId((cur) => (cur === id ? '' : cur))
  }, [])

  // Thêm/xóa ảnh hợp nhất: Supabase khi bật chung, không thì local.
  const addImage = useCallback(async ({ label, file, url }) => {
    if (sharedRef.current) return galleryRef.current.addImage({ label, file, url })
    if (file) {
      const reader = new FileReader()
      reader.onload = () => addUserBg(label || file.name.replace(/\.[^.]+$/, ''), reader.result)
      reader.readAsDataURL(file)
    } else if (url) {
      addUserBg(label || 'Ảnh của tôi', url)
    }
  }, [addUserBg])

  const removeImage = useCallback((id) => {
    if (BUILTIN_SCENES.some((s) => s.id === id)) return // chủ đề dựng sẵn: không xóa
    if (sharedRef.current) { galleryRef.current.removeImage(id); setBgId((cur) => (cur === id ? '' : cur)) }
    else removeBackground(id)
  }, [removeBackground])

  // Máy có WebGL -> dùng LeafEngine (3D); không thì rơi về hiệu ứng CSS.
  const webglOK = useMemo(() => hasWebGL(), [])
  const leftKind = leftTab || 'music' // giữ nội dung khi drawer trượt ra

  return (
    <div className={`app ${uiHidden ? 'is-immersive' : ''} ${leftTab ? 'is-left-open' : ''}`} data-theme={theme}>
      <Scene scene={scene} photo={currentBg?.url || ''} />
      {webglOK && fx !== 'none' ? (
        <Suspense fallback={<FallingFx mode={fx} speed={fxSpeed} />}>
          <LeafEngine mode={fx} speed={fxSpeed} />
        </Suspense>
      ) : (
        <FallingFx mode={fx} speed={fxSpeed} />
      )}

      {/* Video kéo được, luôn tồn tại để nhạc tiếp tục phát */}
      <VideoPip showVideo={showVideo && !uiHidden} onClose={() => setShowVideo(false)} />

      <div className="stage">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark">☂</span>
            <div className="brand__name">
              <h1>Hiên Mưa</h1>
              <p>{tagline}</p>
            </div>
          </div>
          <div className="topbar__actions">
            <div className="theme-select-wrap">
              <button className="theme-select" onClick={() => setThemeMenuOpen((o) => !o)}
                title="Đổi giao diện" aria-haspopup="listbox" aria-expanded={themeMenuOpen}>
                <span className={`theme-dot theme-dot--${theme}`} />
                <span className="theme-select__label">{THEMES.find((t) => t.id === theme)?.label || 'Giao diện'}</span>
                <span className="theme-select__caret">▾</span>
              </button>
              {themeMenuOpen && (
                <ul className="theme-menu" role="listbox">
                  {THEMES.map((t) => (
                    <li key={t.id} role="option" aria-selected={theme === t.id}>
                      <button className={`theme-menu__item ${theme === t.id ? 'is-active' : ''}`}
                        onClick={() => { setTheme(t.id); setThemeMenuOpen(false) }}>
                        <span className={`theme-dot theme-dot--${t.id}`} />
                        <span>{t.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button className="icon-btn" onClick={() => cycleBg(1)} title={`Ảnh: ${currentBg?.label || ''} — bấm để đổi`}>🖼</button>
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Cài đặt">⚙</button>
          </div>
        </header>

        {/* Drawer trái: Nhạc / Không gian (trượt từ cạnh trái) */}
        <aside className={`drawer drawer--left ${leftTab ? 'is-open' : ''}`}>
          <div className="drawer__tabs">
            <button className={`drawer__tab ${leftTab === 'music' ? 'is-active' : ''}`} onClick={() => setLeftTab('music')}><IconMusic width="16" height="16" /> Nhạc</button>
            <button className={`drawer__tab ${leftTab === 'ambient' ? 'is-active' : ''}`} onClick={() => setLeftTab('ambient')}><IconAmbient width="16" height="16" /> Không gian</button>
            <button className="drawer__close" onClick={() => setLeftTab(null)} title="Đóng">✕</button>
          </div>
          <div className="drawer__body">
            {leftKind === 'music' ? (
              <Player
                queue={queue} index={index} nowTitle={yt.nowTitle}
                onAddMany={onAddMany} onSelect={playAt} onRemove={onRemove} onClear={onClear}
                showVideo={showVideo} onToggleVideo={() => setShowVideo((v) => !v)}
                shuffle={shuffle} onToggleShuffle={onToggleShuffle}
                playlists={playlists} onSavePlaylist={savePlaylist}
                onLoadPlaylist={loadPlaylist} onDeletePlaylist={deletePlaylist}
                onAddToPlaylist={addToPlaylist} onCreatePlaylist={createPlaylistWith}
                onMoveTrack={moveTrack} onRemoveFromPlaylist={removeFromPlaylist}
              />
            ) : (
              <AmbientMixer ambient={ambient} />
            )}
          </div>
        </aside>

        {/* Drawer phải: Nhật ký / Thơ (trượt từ cạnh phải) */}
        <aside className={`drawer drawer--right ${rightTab ? 'is-open' : ''}`}>
          <div className="drawer__body drawer__body--flush">
            {rightTab === 'poems' ? (
              <Poems
                poems={poemsApi.poems} username={username} admin={admin}
                onAddPoem={poemsApi.addPoem} onDeletePoem={poemsApi.deletePoem}
                onAddComment={poemsApi.addComment} onDeleteComment={poemsApi.deleteComment}
                onClose={() => setRightTab(null)}
              />
            ) : (
              <Journal
                journal={journal} username={username} setUsername={setUsername}
                onOpenSettings={() => setSettingsOpen(true)}
                onClose={() => setRightTab(null)}
                admin={admin}
              />
            )}
          </div>
        </aside>
      </div>

      <Dock
        yt={yt} queue={queue} index={index}
        onNext={onNext} onPrev={onPrev} ytVolume={ytVolume} setYtVolume={setYtVolume}
        shuffle={shuffle} onToggleShuffle={onToggleShuffle}
        unread={unread}
        leftTab={leftTab} onToggleLeft={toggleLeft}
        journalOpen={journalOpen} onToggleJournal={() => toggleRight('journal')}
        poemsOpen={rightTab === 'poems'} onTogglePoems={() => toggleRight('poems')}
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
        keepAwake={keepAwake} setKeepAwake={setKeepAwake}
        autoplay={autoplay} setAutoplay={setAutoplay}
        fx={fx} setFx={setFx} fxSpeed={fxSpeed} setFxSpeed={setFxSpeed}
        backgrounds={backgrounds} bgId={bgId} setBgId={setBgId}
        onAddImage={addImage} onRemoveImage={removeImage}
        shared={useShared} galleryError={gallery.error}
        hiddenCount={useShared ? 0 : hiddenBg.length} onRestoreBg={() => setHiddenBg([])}
      />
    </div>
  )
}
