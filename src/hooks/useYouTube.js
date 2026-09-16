import { useEffect, useRef, useState, useCallback } from 'react'

// Nạp script IFrame API của YouTube đúng 1 lần.
let apiPromise = null
function loadYouTubeAPI() {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      resolve(window.YT)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return apiPromise
}

function applyTrack(player, track, autoplay) {
  if (!player || !track) return false
  const method = track.kind === 'playlist'
    ? (autoplay ? 'loadPlaylist' : 'cuePlaylist')
    : (autoplay ? 'loadVideoById' : 'cueVideoById')
  if (typeof player[method] !== 'function') return false
  if (track.kind === 'playlist') player[method]({ list: track.playlistId, listType: 'playlist', index: 0 })
  else player[method](track.videoId)
  return true
}

// Quản lý 1 player YouTube ẩn + hàng chờ do mình tự điều khiển.
// Mỗi track: { key, kind: 'video'|'playlist', videoId?, playlistId?, title }
export function useYouTube(mountId) {
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(null) // track đang phát
  const [nowTitle, setNowTitle] = useState('')
  const [buffering, setBuffering] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const currentRef = useRef(null)
  const onEndedRef = useRef(() => {})
  const onErrorRef = useRef(() => {})
  const errorHandledRef = useRef(false)
  const pendingTrackRef = useRef(null)
  // Giữ nhạc chạy nền: khi trình duyệt tự DỪNG lúc tab bị ẩn/khóa màn mà mình
  // vẫn muốn phát, thử phát lại (có giới hạn để tránh lặp vô hạn trên máy chặn).
  const intendedPlayingRef = useRef(false)
  const resumeTriesRef = useRef(0)
  const resumeTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    loadYouTubeAPI().then((YT) => {
      if (cancelled) return
      playerRef.current = new YT.Player(mountId, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            setReady(true)
            const pending = pendingTrackRef.current
            if (pending && applyTrack(event.target, pending.track, pending.autoplay)) pendingTrackRef.current = null
          },
          onStateChange: (e) => {
            const S = window.YT.PlayerState
            if (e.data === S.PLAYING) {
              setPlaying(true)
              setBuffering(false)
              intendedPlayingRef.current = true
              try {
                const d = playerRef.current.getVideoData()
                if (d && d.title) setNowTitle(d.title)
                setDuration(Number(playerRef.current.getDuration()) || 0)
              } catch { /* ignore */ }
            } else if (e.data === S.PAUSED) {
              setPlaying(false)
              // Bị trình duyệt tự dừng khi tab ẩn/khóa màn -> thử phát tiếp.
              const hidden = typeof document !== 'undefined' && document.visibilityState !== 'visible'
              if (hidden && intendedPlayingRef.current && resumeTriesRef.current < 10) {
                resumeTriesRef.current += 1
                clearTimeout(resumeTimerRef.current)
                resumeTimerRef.current = setTimeout(() => {
                  try { playerRef.current?.playVideo() } catch { /* ignore */ }
                }, 350)
              }
            } else if (e.data === S.BUFFERING) {
              setBuffering(true)
            } else if (e.data === S.ENDED) {
              setPlaying(false)
              onEndedRef.current()
            }
          },
          onError: (e) => {
            // YouTube có thể phát nhiều sự kiện lỗi liên tiếp cho cùng một link.
            if (errorHandledRef.current) return
            errorHandledRef.current = true
            setPlaying(false)
            setBuffering(false)
            onErrorRef.current(e?.data, currentRef.current)
          },
        },
      })
    })
    return () => {
      cancelled = true
      try { playerRef.current?.destroy() } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ẩn/khóa màn: cho phép một loạt lần thử phát-lại mới. Quay lại tab mà vẫn
  // muốn phát nhưng đã bị dừng -> phát tiếp ngay.
  useEffect(() => {
    const onVis = () => {
      resumeTriesRef.current = 0
      if (document.visibilityState === 'visible' && intendedPlayingRef.current) {
        try {
          const S = window.YT?.PlayerState
          if (playerRef.current?.getPlayerState?.() !== S?.PLAYING) playerRef.current?.playVideo()
        } catch { /* ignore */ }
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); clearTimeout(resumeTimerRef.current) }
  }, [])

  const playTrack = useCallback((track) => {
    const p = playerRef.current
    if (!track) return
    errorHandledRef.current = false
    intendedPlayingRef.current = true
    resumeTriesRef.current = 0
    currentRef.current = track
    setCurrent(track)
    setNowTitle(track.title || '')
    setCurrentTime(0)
    setDuration(0)
    if (!applyTrack(p, track, true)) pendingTrackRef.current = { track, autoplay: true }
  }, [])

  useEffect(() => {
    if (!ready) return undefined
    const readProgress = () => {
      try {
        const p = playerRef.current
        setCurrentTime(Number(p?.getCurrentTime?.()) || 0)
        setDuration(Number(p?.getDuration?.()) || 0)
      } catch { /* ignore */ }
    }
    readProgress()
    const timer = window.setInterval(readProgress, 500)
    return () => window.clearInterval(timer)
  }, [ready])

  const cueTrack = useCallback((track) => {
    const p = playerRef.current
    if (!track) return
    errorHandledRef.current = false
    intendedPlayingRef.current = false
    currentRef.current = track
    setCurrent(track)
    setNowTitle(track.title || '')
    setCurrentTime(0)
    setDuration(0)
    if (!applyTrack(p, track, false)) pendingTrackRef.current = { track, autoplay: false }
  }, [])

  const play = useCallback(() => {
    intendedPlayingRef.current = true
    resumeTriesRef.current = 0
    try { playerRef.current?.playVideo() } catch { /* ignore */ }
  }, [])
  const pause = useCallback(() => {
    intendedPlayingRef.current = false
    clearTimeout(resumeTimerRef.current)
    try { playerRef.current?.pauseVideo() } catch { /* ignore */ }
  }, [])
  const toggle = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    const S = window.YT.PlayerState
    if (p.getPlayerState() === S.PLAYING) {
      intendedPlayingRef.current = false
      clearTimeout(resumeTimerRef.current)
      p.pauseVideo()
    } else {
      intendedPlayingRef.current = true
      resumeTriesRef.current = 0
      p.playVideo()
    }
  }, [])

  const setVolume = useCallback((v) => {
    try { playerRef.current?.setVolume(Math.round(v)) } catch { /* ignore */ }
  }, [])

  const seekTo = useCallback((seconds) => {
    const value = Number(seconds)
    if (!Number.isFinite(value)) return
    try {
      playerRef.current?.seekTo(Math.max(0, value), true)
      setCurrentTime(Math.max(0, value))
    } catch { /* ignore */ }
  }, [])

  const stop = useCallback(() => {
    intendedPlayingRef.current = false
    clearTimeout(resumeTimerRef.current)
    try { playerRef.current?.stopVideo() } catch { /* ignore */ }
    currentRef.current = null
    setCurrent(null)
    setNowTitle('')
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    setBuffering(false)
  }, [])

  const setOnEnded = useCallback((fn) => { onEndedRef.current = fn }, [])
  const setOnError = useCallback((fn) => { onErrorRef.current = fn }, [])

  return {
    ready, playing, buffering, current, nowTitle, currentTime, duration,
    playTrack, cueTrack, play, pause, toggle, stop, seekTo, setVolume, setOnEnded, setOnError,
  }
}
