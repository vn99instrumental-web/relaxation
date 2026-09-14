import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react'
import Scene from './components/Scene'
import FallingFx from './components/FallingFx'
import { hasWebGL } from './leaf-engine/quality'
import Player from './components/Player'
import Journal from './components/Journal'
import Poems from './components/Poems'
import SettingsModal from './components/SettingsModal'
import Dock from './components/Dock'
import { IconPrev, IconNext, IconPlay, IconPause } from './components/icons'
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

// Hiệu ứng rơi giờ chọn NHIỀU loại cùng lúc -> lưu dạng mảng.
// Chuyển đổi giá trị cũ (chuỗi 'none'|'leaves'|'petals'|'both'|'rain') sang mảng.
const FX_ALL = ['leaves', 'petals', 'rain', 'drizzle']
function normalizeFx(v) {
  if (Array.isArray(v)) return v.filter((x) => FX_ALL.includes(x))
  if (v === 'both') return ['leaves', 'petals']
  if (FX_ALL.includes(v)) return [v]
  return [] // 'none' hoặc giá trị lạ
}

function boundedSetting(value, fallback) {
  if (value == null || value === '') return fallback
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : fallback
}

function queueSignature(arr) {
  return (arr || []).map((t) => [
    t.kind || '', t.videoId || t.playlistId || '', t.title || '',
    t.sourcePlaylistId || '', t.sourceTrackIndex ?? '', t.recordId || '', t.addedAt || '',
  ].join(':')).join('|')
}

function portableTrack(track) {
  if (!track) return null
  const { kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt } = track
  return { kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt }
}

function sameTrack(a, b) {
  if (!a || !b || a.kind !== b.kind) return false
  return a.kind === 'playlist' ? a.playlistId === b.playlistId : a.videoId === b.videoId
}

function trackAddedTime(track, fallback = 0) {
  const numeric = Number(track?.addedAt)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const parsed = Date.parse(track?.addedAt)
  return Number.isFinite(parsed) ? parsed : fallback
}

function recentQueueIndexes(queue, limit) {
  return queue
    .map((track, queueIndex) => ({ track, queueIndex }))
    .sort((a, b) => trackAddedTime(b.track, b.queueIndex) - trackAddedTime(a.track, a.queueIndex))
    .slice(0, limit)
    .map(({ queueIndex }) => queueIndex)
}

function sortTracksNewest(tracks) {
  return (tracks || [])
    .map((track, originalIndex) => ({ track, originalIndex }))
    .sort((a, b) => trackAddedTime(b.track, b.originalIndex) - trackAddedTime(a.track, a.originalIndex))
}

let keySeed = 1
const nextKey = () => `t${keySeed++}-${Math.random().toString(36).slice(2, 6)}`
const nextRecordId = () => globalThis.crypto?.randomUUID?.() || `music-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

function normalizeQueueMetadata(tracks, updatedAt = Date.now()) {
  const list = Array.isArray(tracks) ? tracks : []
  const base = Number.isFinite(Date.parse(updatedAt)) ? Date.parse(updatedAt) : Date.now()
  return list.map((track, index) => ({
    ...track,
    recordId: track.recordId || nextRecordId(),
    // Dữ liệu cũ được backfill theo thứ tự đã thêm trong mảng: cuối mảng là mới nhất.
    addedAt: trackAddedTime(track, base - (list.length - 1 - index) * 1000),
  }))
}

// Các giao diện (độc lập với ảnh nền) — bộ màu từ thiết kế Stitch
const THEMES = [
  { id: 'dusk', label: 'Hoàng hôn' },
  { id: 'rain', label: 'Đêm mưa' },
  { id: 'morning', label: 'Sáng sớm' },
  { id: 'film', label: 'Phim xưa' },
]

function trackFromParsed(p, title = '', addedAt = Date.now()) {
  if (p.type === 'playlist') {
    return { key: nextKey(), recordId: nextRecordId(), kind: 'playlist', playlistId: p.playlistId, title: title || 'Playlist YouTube', addedAt }
  }
  return { key: nextKey(), recordId: nextRecordId(), kind: 'video', videoId: p.videoId, title, addedAt }
}

export default function App() {
  const yt = useYouTube('yt-frame')
  const ambient = useAmbient()

  const [queue, setQueue] = useState(() => normalizeQueueMetadata(load('vibe.queue', [])))
  const [index, setIndex] = useState(0)
  const [ytVolume, setYtVolume] = useState(() => load('vibe.ytVolume', 70))
  const [localPlaylists, setLocalPlaylists] = useState(() => load('vibe.playlists', []))
  const [shuffle, setShuffle] = useState(() => load('vibe.shuffle', false))
  const [autoplay, setAutoplay] = useState(() => load('vibe.autoplay', true))
  const [defaultTrack, setDefaultTrack] = useState(() => load('vibe.defaultTrack', null))
  const [recentLimit, setRecentLimit] = useState(() => load('vibe.recentLimit', 10))

  const [scene, setScene] = useState(() => load('vibe.scene', 'fog'))
  const [userBgs, setUserBgs] = useState(() => load('vibe.userBgs', []))
  const [bgLabels, setBgLabels] = useState(() => load('vibe.bgLabels', {}))
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
  const [leftTab, setLeftTab] = useState(null)   // null | 'music'
  const [rightTab, setRightTab] = useState(null) // null | 'journal' | 'poems'
  const [musicView, setMusicView] = useState('now')
  const journalOpen = rightTab === 'journal'
  const poemsOpen = rightTab === 'poems'
  const toggleRight = (tab) => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches) setLeftTab(null)
    setRightTab((cur) => (cur === tab ? null : tab))
  }
  const [showVideo, setShowVideo] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [recentPlayback, setRecentPlayback] = useState(true)
  const [tagline, setTagline] = useState(() => pickTagline('dusk'))
  const [featuredPoemId, setFeaturedPoemId] = useState(null)
  const [admin, setAdmin] = useState(() => load('vibe.admin', false))
  const [keepAwake, setKeepAwake] = useState(() => load('vibe.keepAwake', true))
  const [seenTs, setSeenTs] = useState(() => load('vibe.seenTs', 0)) // mốc tin đã xem
  const [seenPoemTs, setSeenPoemTs] = useState(() => load('vibe.seenPoemTs', Date.now())) // mốc thơ đã xem
  const [seenHeartTs, setSeenHeartTs] = useState(() => load('vibe.seenHeartTs', Date.now()))
  const [fx, setFx] = useState(() => normalizeFx(load('vibe.fx', ['leaves']))) // mảng: leaves|petals|rain
  const [fxSpeed, setFxSpeed] = useState(() => { const v = load('vibe.fxSpeed', 50); return typeof v === 'number' ? v : 50 }) // 0 chậm .. 100 nhanh
  const [fxDensity, setFxDensity] = useState(() => { const v = load('vibe.fxDensity', 50); return typeof v === 'number' ? v : 50 }) // 0 thưa .. 100 dày
  const [fxSize, setFxSize] = useState(() => { const v = load('vibe.fxSize', 50); return typeof v === 'number' ? v : 50 }) // 0 nhỏ .. 100 to
  const [fxPreset, setFxPreset] = useState(() => load('vibe.fxPreset', 'breeze')) // gió: calm|breeze|windy|storm
  const [fxWindDir, setFxWindDir] = useState(() => load('vibe.fxWindDir', 'auto')) // auto|right|left
  const [fxSwirl, setFxSwirl] = useState(() => { const v = load('vibe.fxSwirl', 50); return typeof v === 'number' ? v : 50 }) // độ chao lượn

  const gist = useGistSync({ ...syncConfig, username })
  const supa = useSupabaseRoom(supaConfig, username)
  const gallery = useSupabaseGallery(supaConfig)
  const roomSettings = useRoomSettings(supaConfig, admin)
  const poemsApi = usePoems(supaConfig, username)
  const [roomHydrated, setRoomHydrated] = useState(false)
  const journal = supa.enabled ? supa.journal : gist
  const playlists = supa.enabled ? supa.playlists : localPlaylists

  const featuredPoem = useMemo(
    () => (poemsApi.poems || []).find((poem) => poem.id === featuredPoemId) || null,
    [poemsApi.poems, featuredPoemId],
  )

  // Số tin chưa xem (của người kia, mới hơn mốc đã xem)
  const unread = useMemo(() => {
    const msgs = journal.messages || []
    return msgs.filter((m) => m.user && m.user !== username && (m.ts || 0) > seenTs).length
  }, [journal.messages, username, seenTs])

  // Số bài Hoài Niệm mới (của người kia, chưa xem)
  const unreadPoems = useMemo(() => {
    const list = poemsApi.poems || []
    return list.filter((p) => p.author && p.author !== username && (p.ts || 0) > seenPoemTs).length
  }, [poemsApi.poems, username, seenPoemTs])
  const heartEvents = useMemo(() => (poemsApi.poems || []).flatMap((poem) =>
    (poem.comments || []).filter((item) => item.type === 'reaction' && item.emoji === '❤️' && item.author !== username)
      .map((item) => ({ ...item, poemId: poem.id }))), [poemsApi.poems, username])
  const latestHeartTs = useMemo(() => heartEvents.reduce((latest, item) => Math.max(latest, item.ts || 0), 0), [heartEvents])
  const unreadHearts = useMemo(() => heartEvents.filter((item) => (item.ts || 0) > seenHeartTs).length, [heartEvents, seenHeartTs])

  // Ảnh nền: dùng thư viện Supabase (chung 2 người) khi có; không thì dùng local.
  const localBackgrounds = useMemo(
    () => [...DEFAULT_BACKGROUNDS, ...userBgs].filter((b) => !hiddenBg.includes(b.id)),
    [userBgs, hiddenBg],
  )
  const useShared = gallery.enabled && gallery.ready
  // 3 chủ đề vintage LUÔN ghép sẵn ở đầu (asset nội bộ, không phụ thuộc Supabase).
  // Lọc trùng phòng khi thư viện Supabase còn dòng cũ trỏ /scenes/*.
  const backgrounds = useMemo(() => {
    const builtins = BUILTIN_SCENES.filter((s) => !hiddenBg.includes(s.id)) // cho phép ẩn/xóa chủ đề dựng sẵn
    const rest = (useShared ? gallery.items : localBackgrounds)
      .filter((b) => !BUILTIN_SCENES.some((s) => s.id === b.id) && !(b.url || '').startsWith('/scenes/'))
    return [...builtins, ...rest].map((b) => (bgLabels[b.id] ? { ...b, label: bgLabels[b.id] } : b))
  }, [useShared, gallery.items, localBackgrounds, hiddenBg, bgLabels])
  const currentBg = backgrounds.find((b) => b.id === bgId) || backgrounds.find((b) => b.url) || backgrounds[0]

  const supaRef = useRef(supa); supaRef.current = supa
  const galleryRef = useRef(gallery); galleryRef.current = gallery
  const sharedRef = useRef(useShared); sharedRef.current = useShared
  const playlistsRef = useRef(playlists); playlistsRef.current = playlists
  const queueRef = useRef(queue); queueRef.current = queue
  const indexRef = useRef(index); indexRef.current = index

  // A queue loaded from one saved playlist is a live view of that playlist.
  // Keep it aligned with Supabase/local realtime updates while preserving the
  // currently playing track whenever that track still exists.
  useEffect(() => {
    if (!queue.length) return
    const sourcePlaylistId = queue[0]?.sourcePlaylistId
    if (!sourcePlaylistId || !queue.every((track) => track.sourcePlaylistId === sourcePlaylistId)) return
    const sourcePlaylist = playlists.find((playlist) => playlist.id === sourcePlaylistId)
    if (!sourcePlaylist) return

    const syncedQueue = sortTracksNewest(sourcePlaylist.tracks).map(({ track, originalIndex }) => ({
      key: nextKey(),
      ...track,
      sourcePlaylistId: sourcePlaylist.id,
      sourcePlaylistName: sourcePlaylist.name,
      sourceTrackIndex: originalIndex,
    }))
    if (queueSignature(syncedQueue) === queueSignature(queue)) return

    const currentTrack = queue[index]
    const matchingIndex = currentTrack ? syncedQueue.findIndex((track) => sameTrack(track, currentTrack)) : -1
    const nextIndex = matchingIndex >= 0 ? matchingIndex : Math.min(index, Math.max(0, syncedQueue.length - 1))
    setQueue(syncedQueue)
    setIndex(nextIndex)
    if (currentTrack && matchingIndex < 0) {
      if (syncedQueue[nextIndex]) setTimeout(() => yt.playTrack(syncedQueue[nextIndex]), 0)
      else setTimeout(() => yt.stop(), 0)
    }
  }, [playlists, queue, index, yt])

  useEffect(() => save('vibe.queue', queue), [queue])
  useEffect(() => save('vibe.playlists', localPlaylists), [localPlaylists])
  useEffect(() => save('vibe.shuffle', shuffle), [shuffle])
  useEffect(() => save('vibe.autoplay', autoplay), [autoplay])
  useEffect(() => save('vibe.defaultTrack', defaultTrack), [defaultTrack])
  useEffect(() => save('vibe.recentLimit', recentLimit), [recentLimit])
  useEffect(() => save('vibe.supabase', supaConfig), [supaConfig])
  useEffect(() => save('vibe.ytVolume', ytVolume), [ytVolume])
  useEffect(() => save('vibe.scene', scene), [scene])
  useEffect(() => save('vibe.bgId', bgId), [bgId])
  useEffect(() => save('vibe.theme', theme), [theme])
  useEffect(() => save('vibe.userBgs', userBgs), [userBgs])
  useEffect(() => save('vibe.bgLabels', bgLabels), [bgLabels])
  useEffect(() => save('vibe.hiddenBg', hiddenBg), [hiddenBg])
  useEffect(() => save('vibe.username', username), [username])
  useEffect(() => save('vibe.sync', syncConfig), [syncConfig])
  useEffect(() => save('vibe.admin', admin), [admin])
  useEffect(() => save('vibe.keepAwake', keepAwake), [keepAwake])
  useEffect(() => save('vibe.seenTs', seenTs), [seenTs])
  useEffect(() => save('vibe.seenPoemTs', seenPoemTs), [seenPoemTs])
  useEffect(() => save('vibe.seenHeartTs', seenHeartTs), [seenHeartTs])
  useEffect(() => save('vibe.fx', fx), [fx])
  useEffect(() => save('vibe.fxSpeed', fxSpeed), [fxSpeed])
  useEffect(() => save('vibe.fxDensity', fxDensity), [fxDensity])
  useEffect(() => save('vibe.fxSize', fxSize), [fxSize])
  useEffect(() => save('vibe.fxPreset', fxPreset), [fxPreset])
  useEffect(() => save('vibe.fxWindDir', fxWindDir), [fxWindDir])
  useEffect(() => save('vibe.fxSwirl', fxSwirl), [fxSwirl])

  // Giữ màn hình sáng khi đang phát (để nhạc không bị ngắt khi máy tự khóa)
  useWakeLock(keepAwake && yt.playing)

  // Tagline dưới tên: đổi theo theme (gợi ý thời tiết) + tự xoay vòng ngẫu nhiên
  useEffect(() => {
    setTagline(pickTagline(theme))
    const id = setInterval(() => setTagline(pickTagline(theme)), 45000)
    return () => clearInterval(id)
  }, [theme])

  // Mỗi lần mở/reload trang chọn một đoạn từ Góc Hoài Niệm. Nếu có nhiều bài,
  // tránh lặp lại bài đã hiện ở lần truy cập ngay trước đó.
  const featuredPoemPickedRef = useRef(false)
  useEffect(() => {
    const list = poemsApi.poems || []
    if (!list.length) { setFeaturedPoemId(null); return }
    if (featuredPoemPickedRef.current && list.some((poem) => poem.id === featuredPoemId)) return
    const previousId = load('vibe.featuredPoemId', '')
    const candidates = list.length > 1 ? list.filter((poem) => poem.id !== previousId) : list
    const next = candidates[Math.floor(Math.random() * candidates.length)] || list[0]
    featuredPoemPickedRef.current = true
    setFeaturedPoemId(next.id)
    save('vibe.featuredPoemId', next.id)
  }, [poemsApi.poems, featuredPoemId])

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
      try { new Notification('Dưới Tán Thông 💌', { body: `${last.user}: ${last.text}`, tag: 'hienmua-chat', renotify: true }) } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal.messages, journalOpen, username])

  // Mở Góc Hoài Niệm -> đánh dấu đã xem hết (mốc = bài mới nhất)
  useEffect(() => {
    if (!poemsOpen) return
    const list = poemsApi.poems || []
    if (list.length) setSeenPoemTs(Math.max(seenPoemTs, list[0].ts || Date.now()))
    if (latestHeartTs) setSeenHeartTs((current) => Math.max(current, latestHeartTs))
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { Notification.requestPermission() } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poemsOpen, poemsApi.poems, latestHeartTs])

  // Có THƠ MỚI: đang xem -> đánh dấu đã xem; không -> thông báo hệ thống (title tự cập nhật)
  const prevPoemLenRef = useRef((poemsApi.poems || []).length)
  useEffect(() => {
    const list = poemsApi.poems || []
    const prev = prevPoemLenRef.current
    prevPoemLenRef.current = list.length
    if (list.length <= prev) return          // chỉ báo khi có bài MỚI (bỏ qua sửa/xoá/bình luận)
    const latest = list[0]                    // thơ sắp xếp mới nhất trước
    if (!latest) return
    if (latest.author === username) { setSeenPoemTs(latest.ts || Date.now()); return }
    const viewing = poemsOpen && (typeof document === 'undefined' || document.visibilityState === 'visible')
    if (viewing) { setSeenPoemTs(latest.ts || Date.now()); return }
    if (Date.now() - (latest.ts || 0) > 60000) return  // tránh báo dồn khi vừa tải trang
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('Dưới Tán Thông ✍️', { body: `Có một hoài niệm mới: ${latest.title || latest.body?.slice(0, 40) || ''}`, tag: 'hienmua-poem', renotify: true }) } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poemsApi.poems, poemsOpen, username])

  const prevHeartTsRef = useRef(latestHeartTs)
  useEffect(() => {
    const previous = prevHeartTsRef.current
    prevHeartTsRef.current = latestHeartTs
    if (!latestHeartTs || latestHeartTs <= previous) return
    const viewing = poemsOpen && (typeof document === 'undefined' || document.visibilityState === 'visible')
    if (viewing) { setSeenHeartTs(latestHeartTs); return }
    if (Date.now() - latestHeartTs > 60000) return
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('Dưới Tán Thông ❤️', { body: 'Có người vừa thả tim một hoài niệm.', tag: 'hienmua-poem-heart', renotify: true }) } catch { /* ignore */ }
    }
  }, [latestHeartTs, poemsOpen])

  // Nhắc số tin/thơ chưa xem ngay trên tiêu đề tab
  useEffect(() => {
    const total = unread + unreadPoems + unreadHearts
    document.title = total > 0 ? `(${total}) Dưới Tán Thông` : 'Dưới Tán Thông — Đà Lạt trong sương'
  }, [unread, unreadPoems, unreadHearts])

  const playAt = useCallback((i) => {
    setRecentPlayback(false)
    setQueue((q) => {
      const t = q[i]
      if (t) { setIndex(i); yt.playTrack(t) }
      return q
    })
  }, [yt])

  const playRecentAt = useCallback((i) => {
    setRecentPlayback(true)
    setQueue((q) => {
      const track = q[i]
      if (track) { setIndex(i); yt.playTrack(track) }
      return q
    })
  }, [yt])

  const setOpeningTrack = useCallback((track) => { setRecentPlayback(true); setDefaultTrack(portableTrack(track)) }, [])
  const clearOpeningTrack = useCallback(() => setDefaultTrack(null), [])

  const onAddMany = useCallback((parsedList) => {
    const list = Array.isArray(parsedList) ? parsedList : [parsedList]
    setQueue((q) => {
      const stamp = Date.now()
      const newTracks = list.map((p, offset) => trackFromParsed(p, '', stamp + offset))
      const nq = [...q, ...newTracks]
      if (q.length === 0 && newTracks.length) {
        setIndex(0)
        setTimeout(() => yt.playTrack(newTracks[0]), 0)
      }
      if (roomSettings.enabled && roomSettings.ready && roomHydrated) {
        const shared = nq.map(({ kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt }) => ({ kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt }))
        setTimeout(() => roomSettings.saveShared({ queue: shared, q_index: q.length ? indexRef.current : 0 }), 0)
      }
      return nq
    })
  }, [yt, roomSettings, roomHydrated])

  const onClear = useCallback(() => { setQueue([]); setIndex(0); yt.stop() }, [yt])

  // ---- Playlist: lưu / tải / xóa (Supabase khi bật, không thì localStorage) ----
  const savePlaylist = useCallback((name) => {
    setQueue((q) => {
      if (!q.length) return q
      const tracks = sortTracksNewest(q).map(({ track }) => portableTrack(track))
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
    if (mode !== 'append') setRecentPlayback(false)
    const tracks = sortTracksNewest(pl.tracks).map(({ track, originalIndex }) => ({
      key: nextKey(), ...track, sourcePlaylistId: pl.id, sourcePlaylistName: pl.name, sourceTrackIndex: originalIndex,
    }))
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

  const renamePlaylist = useCallback((id, name) => {
    if (supaRef.current.enabled) supaRef.current.renamePlaylistRow(id, name)
    else setLocalPlaylists((list) => list.map((p) => (p.id === id ? { ...p, name, ts: Date.now() } : p)))
  }, [])

  const tracksFromParsed = (parsedList) =>
    parsedList.map((p) => { const { key, ...rest } = trackFromParsed(p); return rest })

  // Thêm link vào một playlist đã tạo
  const addToPlaylist = useCallback((playlistId, parsedList) => {
    const pl = playlistsRef.current.find((p) => p.id === playlistId)
    if (!pl) return
    const merged = sortTracksNewest([...pl.tracks, ...tracksFromParsed(parsedList)]).map(({ track }) => track)
    if (supaRef.current.enabled) supaRef.current.updatePlaylistRow(playlistId, merged)
    else setLocalPlaylists((list) => list.map((p) => (p.id === playlistId ? { ...p, tracks: merged, ts: Date.now() } : p)))
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
    const movedTrack = { ...track, addedAt: Date.now() }
    const toTracks = sortTracksNewest([...to.tracks, movedTrack]).map(({ track: item }) => item)
    if (supaRef.current.enabled) {
      supaRef.current.updatePlaylistRow(fromId, remaining)
      supaRef.current.updatePlaylistRow(toId, toTracks)
    } else {
      setLocalPlaylists((list) => list.map((p) => (
        p.id === fromId ? { ...p, tracks: remaining, ts: Date.now() } : p.id === toId ? { ...p, tracks: toTracks, ts: Date.now() } : p
      )))
    }
  }, [])

  // Xoá 1 bài khỏi playlist
  const removeFromPlaylist = useCallback((playlistId, index) => {
    const pl = playlistsRef.current.find((p) => p.id === playlistId)
    if (!pl) return
    const tracks = pl.tracks.filter((_, i) => i !== index)
    if (supaRef.current.enabled) supaRef.current.updatePlaylistRow(playlistId, tracks)
    else setLocalPlaylists((list) => list.map((p) => (p.id === playlistId ? { ...p, tracks, ts: Date.now() } : p)))
  }, [])

  // Tạo playlist mới từ link
  const createPlaylistWith = useCallback((name, parsedList) => {
    const tracks = sortTracksNewest(tracksFromParsed(parsedList)).map(({ track }) => track)
    const nm = name || `Playlist ${new Date().toLocaleDateString('vi-VN')}`
    if (supaRef.current.enabled) supaRef.current.savePlaylistRow(nm, tracks)
    else setLocalPlaylists((list) => [{ id: `pl${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: nm, tracks, ts: Date.now() }, ...list])
  }, [])
  const onRemove = useCallback((i) => {
    setQueue((q) => q.filter((_, idx) => idx !== i))
    setIndex((cur) => (i < cur ? cur - 1 : cur))
  }, [])

  // Link YouTube hỏng/bị chặn: xóa khỏi hàng chờ, đồng thời xóa khỏi playlist
  // nguồn (nếu có), rồi phát ngay bài hợp lệ kế tiếp.
  const removeBrokenFromPlaylist = useCallback((track) => {
    if (!track?.sourcePlaylistId) return
    const pl = playlistsRef.current.find((p) => p.id === track.sourcePlaylistId)
    if (!pl) return
    let sourceIndex = Number.isInteger(track.sourceTrackIndex) ? track.sourceTrackIndex : -1
    const sameTrack = (candidate) => candidate && candidate.kind === track.kind
      && (track.kind === 'playlist' ? candidate.playlistId === track.playlistId : candidate.videoId === track.videoId)
    if (!sameTrack(pl.tracks[sourceIndex])) sourceIndex = pl.tracks.findIndex(sameTrack)
    if (sourceIndex < 0) return
    const tracks = pl.tracks.filter((_, i) => i !== sourceIndex)
    if (supaRef.current.enabled) supaRef.current.updatePlaylistRow(pl.id, tracks)
    else setLocalPlaylists((list) => list.map((p) => (p.id === pl.id ? { ...p, tracks } : p)))
  }, [])

  const onPlaybackError = useCallback((_code, failedTrack) => {
    const failed = failedTrack || queueRef.current[indexRef.current]
    if (!failed) return
    removeBrokenFromPlaylist(failed)
    setQueue((q) => {
      let failedIndex = q.findIndex((t) => failed.key && t.key === failed.key)
      if (failedIndex < 0) failedIndex = Math.max(0, Math.min(indexRef.current, q.length - 1))
      const nextQueue = q.filter((_, i) => i !== failedIndex)
      if (!nextQueue.length) {
        setIndex(0)
        setTimeout(() => yt.stop(), 0)
        return nextQueue
      }
      const nextIndex = Math.min(failedIndex, nextQueue.length - 1)
      setIndex(nextIndex)
      setTimeout(() => yt.playTrack(nextQueue[nextIndex]), 0)
      return nextQueue
    })
  }, [removeBrokenFromPlaylist, yt])

  const onNext = useCallback(() => {
    setQueue((q) => {
      if (!q.length) return q
      let ni
      const recent = recentPlayback ? recentQueueIndexes(q, recentLimit) : []
      if (recent.length) {
        const position = Math.max(0, recent.indexOf(index))
        if (shuffle && recent.length > 1) {
          do { ni = recent[Math.floor(Math.random() * recent.length)] } while (ni === index)
        } else ni = recent[(position + 1) % recent.length]
      } else if (shuffle && q.length > 1) {
        do { ni = Math.floor(Math.random() * q.length) } while (ni === index)
      } else {
        ni = (index + 1) % q.length
      }
      setIndex(ni); yt.playTrack(q[ni]); return q
    })
  }, [index, yt, shuffle, recentPlayback, defaultTrack, recentLimit])

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
      const recent = recentPlayback ? recentQueueIndexes(q, recentLimit) : []
      const position = recent.indexOf(index)
      const pi = recent.length
        ? recent[(position <= 0 ? recent.length : position) - 1]
        : (index - 1 + q.length) % q.length
      setIndex(pi); yt.playTrack(q[pi]); return q
    })
  }, [index, yt, recentPlayback, defaultTrack, recentLimit])

  useEffect(() => { yt.setOnEnded(onNext) }, [yt, onNext])
  useEffect(() => { yt.setOnError(onPlaybackError) }, [yt, onPlaybackError])
  useEffect(() => { if (yt.ready) yt.setVolume(ytVolume) }, [ytVolume, yt.ready, yt])

  // Khi mở trang, ưu tiên bài nhạc mặc định do admin đã chọn. Nếu chưa có hàng
  // chờ chung thì mới chọn ngẫu nhiên từ playlist. Trình duyệt có thể chặn âm
  // thanh tự phát -> lần chạm đầu tiên sẽ tiếp tục bài đã chuẩn bị.
  const ytLiveRef = useRef(yt); ytLiveRef.current = yt
  const autoStartedRef = useRef(false)
  const pendingAutoRef = useRef(false)
  useEffect(() => {
    if (autoStartedRef.current || !yt.ready || (roomSettings.enabled && !roomHydrated)) return
    let cancelled = false
    const prepareMusic = () => {
      if (autoStartedRef.current || cancelled) return
      if (defaultTrack) {
        setRecentPlayback(true)
        const existingIndex = queue.findIndex((track) => sameTrack(track, defaultTrack))
        const selectedTrack = existingIndex >= 0 ? queue[existingIndex] : { key: nextKey(), ...defaultTrack }
        const selectedIndex = existingIndex >= 0 ? existingIndex : 0
        if (existingIndex < 0) setQueue((q) => [selectedTrack, ...q])
        autoStartedRef.current = true
        setIndex(selectedIndex)
        pendingAutoRef.current = autoplay
        setTimeout(() => {
          if (autoplay) ytLiveRef.current.playTrack(selectedTrack)
          else ytLiveRef.current.cueTrack(selectedTrack)
        }, 0)
        return
      }
      if (queue.length) {
        const newest = queue
          .map((track, queueIndex) => ({ track, queueIndex }))
          .sort((a, b) => trackAddedTime(b.track, b.queueIndex) - trackAddedTime(a.track, a.queueIndex))
          .slice(0, recentLimit)
        const selectedIndex = newest[0]?.queueIndex ?? Math.max(0, Math.min(index, queue.length - 1))
        const track = queue[selectedIndex]
        setRecentPlayback(true)
        autoStartedRef.current = true
        setIndex(selectedIndex)
        pendingAutoRef.current = autoplay
        setTimeout(() => {
          if (autoplay) ytLiveRef.current.playTrack(track)
          else ytLiveRef.current.cueTrack(track)
        }, 0)
        return
      }

      // Chưa có hàng chờ chung -> chọn ngẫu nhiên playlist và một bài trong đó.
      const pls = (playlistsRef.current || []).filter((pl) => pl.tracks && pl.tracks.length)
      if (!pls.length) return
      autoStartedRef.current = true
      const pl = pls[Math.floor(Math.random() * pls.length)]
      const tracks = sortTracksNewest(pl.tracks).map(({ track, originalIndex }) => ({
        key: nextKey(), ...track, sourcePlaylistId: pl.id, sourcePlaylistName: pl.name, sourceTrackIndex: originalIndex,
      }))
      const i = Math.floor(Math.random() * tracks.length)
      setQueue(tracks)
      setIndex(i)
      pendingAutoRef.current = autoplay
      setTimeout(() => {
        if (autoplay) ytLiveRef.current.playTrack(tracks[i])
        else ytLiveRef.current.cueTrack(tracks[i])
      }, 0)
    }
    if (queue.length || (playlists || []).some((pl) => pl.tracks && pl.tracks.length)) prepareMusic()
    else { const timer = setTimeout(prepareMusic, 1500); return () => { cancelled = true; clearTimeout(timer) } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yt.ready, autoplay, defaultTrack, playlists, queue, index, recentLimit, roomHydrated, roomSettings.enabled])
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
    const track = queueRef.current[index]
    if (!track) return
    setQueue((q) => {
      if (!q[index] || q[index].title === yt.nowTitle) return q
      const nq = [...q]; nq[index] = { ...nq[index], title: yt.nowTitle }; return nq
    })
    // Sau lần phát đầu tiên, ghi lại đúng tiêu đề YouTube vào playlist đã lưu.
    if (track.kind !== 'video' || !track.sourcePlaylistId) return
    const pl = playlistsRef.current.find((p) => p.id === track.sourcePlaylistId)
    if (!pl) return
    let sourceIndex = Number.isInteger(track.sourceTrackIndex) ? track.sourceTrackIndex : -1
    if (pl.tracks[sourceIndex]?.videoId !== track.videoId) {
      sourceIndex = pl.tracks.findIndex((t) => t.kind === 'video' && t.videoId === track.videoId)
    }
    if (sourceIndex < 0 || pl.tracks[sourceIndex].title === yt.nowTitle) return
    const tracks = pl.tracks.map((t, i) => (i === sourceIndex ? { ...t, title: yt.nowTitle } : t))
    if (supaRef.current.enabled) supaRef.current.updatePlaylistRow(pl.id, tracks)
    else setLocalPlaylists((list) => list.map((p) => (p.id === pl.id ? { ...p, tracks } : p)))
  }, [yt.nowTitle, index])

  // Điều khiển nhạc trên màn hình khóa / trung tâm thông báo (MediaSession)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const track = queue[index]
    try {
      if (yt.nowTitle && typeof window.MediaMetadata === 'function') {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: yt.nowTitle,
          artist: 'Dưới Tán Thông',
          album: track?.sourcePlaylistName || 'Mới đăng',
          artwork: track?.videoId
            ? [{ src: `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`, sizes: '480x360', type: 'image/jpeg' }]
            : [],
        })
      }
      navigator.mediaSession.playbackState = yt.playing ? 'playing' : 'paused'
      if (yt.duration > 0) navigator.mediaSession.setPositionState({
        duration: yt.duration,
        playbackRate: 1,
        position: Math.min(Math.max(0, yt.currentTime || 0), yt.duration),
      })
    } catch { /* ignore */ }
  }, [queue, index, yt.nowTitle, yt.playing, yt.currentTime, yt.duration])
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn) } catch { /* ignore */ } }
    set('play', () => yt.play())
    set('pause', () => yt.pause())
    set('previoustrack', () => onPrev())
    set('nexttrack', () => onNext())
    set('seekbackward', (details) => yt.seekTo(Math.max(0, yt.currentTime - (details.seekOffset || 10))))
    set('seekforward', (details) => yt.seekTo(Math.min(yt.duration || Infinity, yt.currentTime + (details.seekOffset || 10))))
    set('seekto', (details) => { if (Number.isFinite(details.seekTime)) yt.seekTo(details.seekTime) })
    return () => {
      set('play', null); set('pause', null); set('previoustrack', null); set('nexttrack', null)
      set('seekbackward', null); set('seekforward', null); set('seekto', null)
    }
  }, [yt, onNext, onPrev])

  // ---- Mặc định chung của phòng: admin lưu, mọi người nhận khi vào + realtime ----
  const sharedSettingsRef = useRef({ visualSig: '', musicSig: '' })

  // Chờ truy vấn đầu tiên xong rồi mới cho admin phát thay đổi. Việc này tránh
  // localStorage cũ ghi đè bản mặc định chung trong lúc Supabase còn đang tải.
  useEffect(() => {
    if (!roomSettings.enabled) { setRoomHydrated(true); return }
    if (!roomSettings.ready) { setRoomHydrated(false); return }
    const s = roomSettings.settings
    if (!s) { setRoomHydrated(true); return }
    if (s.updated_by === roomSettings.clientId) { setRoomHydrated(true); return }

    const nextScene = s.scene || scene
    const nextBgId = s.bg_id || bgId
    const nextTheme = s.theme || theme
    const nextFx = s.fx_modes == null ? fx : normalizeFx(s.fx_modes)
    const nextFxSpeed = boundedSetting(s.fx_speed, fxSpeed)
    const nextFxDensity = boundedSetting(s.fx_density, fxDensity)
    const nextFxSize = boundedSetting(s.fx_size, fxSize)
    const nextFxPreset = s.fx_preset || fxPreset
    const nextFxWindDir = s.fx_wind_dir || fxWindDir
    const nextFxSwirl = boundedSetting(s.fx_swirl, fxSwirl)
    const nextVolume = boundedSetting(s.yt_volume, ytVolume)
    const nextAutoplay = typeof s.autoplay === 'boolean' ? s.autoplay : autoplay
    const nextDefaultTrack = Object.prototype.hasOwnProperty.call(s, 'default_track') ? portableTrack(s.default_track) : defaultTrack
    const storedQueue = Array.isArray(s.queue)
      ? normalizeQueueMetadata(s.queue.map(({ kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt }) => ({ kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt })), s.updated_at)
      : normalizeQueueMetadata(queue.map(({ kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt }) => ({ kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt })))
    const nextIndex = storedQueue.length
      ? Math.max(0, Math.min(Number.isInteger(s.q_index) ? s.q_index : 0, storedQueue.length - 1))
      : 0

    const visualPayload = {
      scene: nextScene, bg_id: nextBgId, theme: nextTheme, fx_modes: nextFx,
      fx_speed: nextFxSpeed, fx_density: nextFxDensity, fx_size: nextFxSize,
      fx_preset: nextFxPreset, fx_wind_dir: nextFxWindDir, fx_swirl: nextFxSwirl,
    }
    const musicPayload = { queue: storedQueue, q_index: nextIndex, yt_volume: nextVolume, autoplay: nextAutoplay, default_track: nextDefaultTrack }
    sharedSettingsRef.current.visualSig = `${supaConfig.room}|${JSON.stringify(visualPayload)}`
    sharedSettingsRef.current.musicSig = `${supaConfig.room}|${JSON.stringify(musicPayload)}`

    if (nextScene !== scene) setScene(nextScene)
    if (nextBgId !== bgId) setBgId(nextBgId)
    setHiddenBg((hidden) => (hidden.includes(nextBgId) ? hidden.filter((id) => id !== nextBgId) : hidden))
    if (nextTheme !== theme) setTheme(nextTheme)
    if (JSON.stringify(nextFx) !== JSON.stringify(fx)) setFx(nextFx)
    if (nextFxSpeed !== fxSpeed) setFxSpeed(nextFxSpeed)
    if (nextFxDensity !== fxDensity) setFxDensity(nextFxDensity)
    if (nextFxSize !== fxSize) setFxSize(nextFxSize)
    if (nextFxPreset !== fxPreset) setFxPreset(nextFxPreset)
    if (nextFxWindDir !== fxWindDir) setFxWindDir(nextFxWindDir)
    if (nextFxSwirl !== fxSwirl) setFxSwirl(nextFxSwirl)
    if (nextVolume !== ytVolume) setYtVolume(nextVolume)
    if (nextAutoplay !== autoplay) setAutoplay(nextAutoplay)
    if (JSON.stringify(nextDefaultTrack) !== JSON.stringify(defaultTrack)) setDefaultTrack(nextDefaultTrack)
    if (queueSignature(storedQueue) !== queueSignature(queue)) {
      setQueue(storedQueue.map((track) => ({ key: nextKey(), ...track })))
    }
    if (nextIndex !== index) setIndex(nextIndex)
    setRoomHydrated(true)
    // Chỉ chạy khi có snapshot phòng mới; các giá trị hiện tại là fallback tương thích dữ liệu cũ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSettings.enabled, roomSettings.ready, roomSettings.settings, roomSettings.clientId])

  const sharedVisualPayload = {
    scene, bg_id: bgId, theme, fx_modes: fx,
    fx_speed: fxSpeed, fx_density: fxDensity, fx_size: fxSize,
    fx_preset: fxPreset, fx_wind_dir: fxWindDir, fx_swirl: fxSwirl,
  }
  const sharedVisualSig = `${supaConfig.room}|${JSON.stringify(sharedVisualPayload)}`
  useEffect(() => {
    if (!admin || !roomSettings.enabled || !roomSettings.ready || !roomHydrated) return
    if (sharedVisualSig === sharedSettingsRef.current.visualSig) return
    const timer = setTimeout(() => {
      sharedSettingsRef.current.visualSig = sharedVisualSig
      roomSettings.save(sharedVisualPayload)
    }, 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedVisualSig, admin, roomSettings.enabled, roomSettings.ready, roomHydrated])

  const sharedQueue = queue.map(({ kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt }) => ({ kind, videoId, playlistId, title, sourcePlaylistId, sourcePlaylistName, sourceTrackIndex, recordId, addedAt }))
  const sharedMusicPayload = {
    queue: sharedQueue,
    q_index: sharedQueue.length ? Math.max(0, Math.min(index, sharedQueue.length - 1)) : 0,
    yt_volume: ytVolume,
    autoplay,
    default_track: portableTrack(defaultTrack),
  }
  const sharedMusicSig = `${supaConfig.room}|${JSON.stringify(sharedMusicPayload)}`
  useEffect(() => {
    if (!admin || !recentPlayback || !roomSettings.enabled || !roomSettings.ready || !roomHydrated) return
    if (sharedMusicSig === sharedSettingsRef.current.musicSig) return
    const timer = setTimeout(() => {
      sharedSettingsRef.current.musicSig = sharedMusicSig
      roomSettings.save(sharedMusicPayload)
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedMusicSig, admin, recentPlayback, roomSettings.enabled, roomSettings.ready, roomHydrated])

  const toggleLeft = (tab) => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches) setRightTab(null)
    setLeftTab((cur) => (cur === tab ? null : tab))
  }
  const currentQueueTrack = queue[index]
  const activePlaylistName = currentQueueTrack?.sourcePlaylistId
    ? (playlists.find((p) => p.id === currentQueueTrack.sourcePlaylistId)?.name || currentQueueTrack.sourcePlaylistName || '')
    : (currentQueueTrack?.kind === 'playlist' ? (currentQueueTrack.title || 'Playlist YouTube') : '')

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
    if (BUILTIN_SCENES.some((s) => s.id === id)) { // chủ đề dựng sẵn -> ẩn cục bộ (có thể khôi phục)
      setHiddenBg((h) => (h.includes(id) ? h : [...h, id]))
      setBgId((cur) => (cur === id ? '' : cur))
      return
    }
    if (sharedRef.current) { galleryRef.current.removeImage(id); setBgId((cur) => (cur === id ? '' : cur)) }
    else removeBackground(id)
  }, [removeBackground])

  const renameImage = useCallback(async (id, label) => {
    const nextLabel = label?.trim()
    if (!nextLabel) return false
    if (BUILTIN_SCENES.some((s) => s.id === id)) {
      setBgLabels((labels) => ({ ...labels, [id]: nextLabel }))
      return true
    }
    if (sharedRef.current) return galleryRef.current.renameImage(id, nextLabel)
    if (DEFAULT_BACKGROUNDS.some((b) => b.id === id)) {
      setBgLabels((labels) => ({ ...labels, [id]: nextLabel }))
      return true
    }
    setUserBgs((list) => list.map((b) => (b.id === id ? { ...b, label: nextLabel } : b)))
    return true
  }, [])

  // Máy có WebGL -> dùng LeafEngine (3D); không thì rơi về hiệu ứng CSS.
  const webglOK = useMemo(() => hasWebGL(), [])
  return (
    <div className={`app ${uiHidden ? 'is-immersive' : ''} ${leftTab ? 'is-left-open' : ''} ${rightTab ? 'is-right-open' : ''} ${musicView === 'now' ? 'is-music-now' : ''}`} data-theme={theme}>
      <Scene scene={scene} photo={currentBg?.url || ''} />
      {webglOK && fx.length > 0 ? (
        <Suspense fallback={<FallingFx modes={fx} speed={fxSpeed} density={fxDensity} size={fxSize} />}>
          <LeafEngine modes={fx} speed={fxSpeed} density={fxDensity} sizeLevel={fxSize} preset={fxPreset} windDir={fxWindDir} swirl={fxSwirl} />
        </Suspense>
      ) : (
        <FallingFx modes={fx} speed={fxSpeed} density={fxDensity} size={fxSize} />
      )}


      <div className="stage">
        <header className="topbar">
          <div className="brand">
            <h1 className="brand__title">
              <img className="brand__lockup" src="/brand-pine-wordmark-header.png" alt="Dưới Tán Thông" width="2172" height="724" />
            </h1>
            <div className="brand__name">
              <p className="brand__tagline">{tagline}</p>
              {featuredPoem && (
                <article className="brand__poem" title="Một đoạn ngẫu nhiên từ Góc Hoài Niệm">
                  {featuredPoem.title && <div className="brand__poem-head"><strong>{featuredPoem.title}</strong></div>}
                  <div className="brand__poem-body">{featuredPoem.body}</div>
                </article>
              )}
            </div>
          </div>
        </header>

        {/* Drawer trái: Nhạc (trượt từ cạnh trái) */}
        <aside className={`drawer drawer--left ${leftTab ? 'is-open' : ''}`}>
          <div className="drawer__tabs">
            <strong className="drawer__title">Nhạc</strong>
            <button className="drawer__close" onClick={() => setLeftTab(null)} title="Đóng">✕</button>
          </div>
          <div className="drawer__body">
            <Player
                queue={queue} index={index} yt={yt} playlistName={activePlaylistName}
                onNext={onNext} onPrev={onPrev} ytVolume={ytVolume} setYtVolume={setYtVolume}
                onAddMany={onAddMany} onSelect={playAt} onSelectRecent={playRecentAt} onRemove={onRemove} onClear={onClear}
                showVideo={showVideo} onToggleVideo={() => setShowVideo((v) => !v)}
                shuffle={shuffle} onToggleShuffle={onToggleShuffle}
                playlists={playlists} onSavePlaylist={savePlaylist}
                onLoadPlaylist={loadPlaylist} onDeletePlaylist={deletePlaylist}
                onAddToPlaylist={addToPlaylist} onCreatePlaylist={createPlaylistWith}
                onMoveTrack={moveTrack} onRemoveFromPlaylist={removeFromPlaylist} onRenamePlaylist={renamePlaylist}
                admin={admin} defaultTrack={defaultTrack}
                onSetDefaultTrack={setOpeningTrack} onClearDefaultTrack={clearOpeningTrack}
                recentLimit={recentLimit} onRecentLimitChange={setRecentLimit}
                onTabChange={setMusicView}
              />
          </div>
        </aside>

        {/* Drawer phải: Nhật ký / Hoài niệm (trượt từ cạnh phải) */}
        <aside className={`drawer drawer--right ${rightTab ? 'is-open' : ''}`}>
          <div className="drawer__body drawer__body--flush">
            {rightTab === 'poems' ? (
              <Poems
                poems={poemsApi.poems} username={username} admin={admin}
                onAddPoem={poemsApi.addPoem} onEditPoem={poemsApi.editPoem} onDeletePoem={poemsApi.deletePoem}
                onAddComment={poemsApi.addComment} onDeleteComment={poemsApi.deleteComment}
                onToggleReaction={poemsApi.toggleReaction}
                onClose={() => setRightTab(null)}
              />
            ) : (
              <Journal
                journal={journal} username={username} setUsername={setUsername}
                onClose={() => setRightTab(null)}
                admin={admin}
              />
            )}
          </div>
        </aside>
      </div>

      <Dock
        yt={yt} queue={queue} index={index}
        playlistName={activePlaylistName}
        onNext={onNext} onPrev={onPrev} ytVolume={ytVolume} setYtVolume={setYtVolume}
        shuffle={shuffle} onToggleShuffle={onToggleShuffle}
        unread={unread} unreadPoems={unreadPoems + unreadHearts}
        leftTab={leftTab} onToggleLeft={toggleLeft}
        journalOpen={journalOpen} onToggleJournal={() => toggleRight('journal')}
        poemsOpen={rightTab === 'poems'} onTogglePoems={() => toggleRight('poems')}
        onOpenSettings={() => setSettingsOpen(true)}
        onHideUI={() => setUiHidden(true)}
      />

      {/* Chế độ ngắm cảnh: chỉ còn vài toggle cần thiết */}
      {uiHidden && (
        <div className="immersive-bar">
          <button className="ctrl" onClick={onPrev} title="Bài trước" disabled={!queue.length} aria-label="Bài trước"><IconPrev /></button>
          <button className="ctrl ctrl--main" onClick={yt.toggle} title="Phát / Dừng" disabled={!yt.current}
            aria-label={yt.playing ? 'Dừng' : 'Phát'}>
            {yt.playing ? <IconPause /> : <IconPlay />}
          </button>
          <button className="ctrl" onClick={onNext} title="Bài sau" disabled={!queue.length} aria-label="Bài sau"><IconNext /></button>
          <button className="ctrl" onClick={() => setUiHidden(false)} title="Hiện giao diện">◉</button>
        </div>
      )}

      <SettingsModal
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        admin={admin} setAdmin={setAdmin}
        theme={theme} setTheme={setTheme} themes={THEMES}
        keepAwake={keepAwake} setKeepAwake={setKeepAwake}
        autoplay={autoplay} setAutoplay={setAutoplay}
        fx={fx} setFx={setFx} fxSpeed={fxSpeed} setFxSpeed={setFxSpeed}
        fxDensity={fxDensity} setFxDensity={setFxDensity}
        fxSize={fxSize} setFxSize={setFxSize}
        fxPreset={fxPreset} setFxPreset={setFxPreset}
        fxWindDir={fxWindDir} setFxWindDir={setFxWindDir} fxSwirl={fxSwirl} setFxSwirl={setFxSwirl}
        backgrounds={backgrounds} bgId={bgId} setBgId={setBgId}
        onAddImage={addImage} onRemoveImage={removeImage} onRenameImage={renameImage}
        shared={useShared} galleryError={gallery.error}
        hiddenCount={hiddenBg.length} onRestoreBg={() => setHiddenBg([])}
      />
    </div>
  )
}
