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

// Quản lý 1 player YouTube ẩn + hàng chờ do mình tự điều khiển.
// Mỗi track: { key, kind: 'video'|'playlist', videoId?, playlistId?, title }
export function useYouTube(mountId) {
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(null) // track đang phát
  const [nowTitle, setNowTitle] = useState('')
  const [buffering, setBuffering] = useState(false)
  const onEndedRef = useRef(() => {})

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
          onReady: () => setReady(true),
          onStateChange: (e) => {
            const S = window.YT.PlayerState
            if (e.data === S.PLAYING) {
              setPlaying(true)
              setBuffering(false)
              try {
                const d = playerRef.current.getVideoData()
                if (d && d.title) setNowTitle(d.title)
              } catch { /* ignore */ }
            } else if (e.data === S.PAUSED) {
              setPlaying(false)
            } else if (e.data === S.BUFFERING) {
              setBuffering(true)
            } else if (e.data === S.ENDED) {
              setPlaying(false)
              onEndedRef.current()
            }
          },
          onError: () => {
            // Video bị chặn/xóa -> nhảy bài tiếp theo cho khỏi kẹt.
            onEndedRef.current()
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

  const playTrack = useCallback((track) => {
    const p = playerRef.current
    if (!p || !track) return
    setCurrent(track)
    setNowTitle(track.title || '')
    if (track.kind === 'playlist') {
      p.loadPlaylist({ list: track.playlistId, listType: 'playlist', index: 0 })
    } else {
      p.loadVideoById(track.videoId)
    }
  }, [])

  const play = useCallback(() => { try { playerRef.current?.playVideo() } catch { /* ignore */ } }, [])
  const pause = useCallback(() => { try { playerRef.current?.pauseVideo() } catch { /* ignore */ } }, [])
  const toggle = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    const S = window.YT.PlayerState
    if (p.getPlayerState() === S.PLAYING) p.pauseVideo()
    else p.playVideo()
  }, [])

  const setVolume = useCallback((v) => {
    try { playerRef.current?.setVolume(Math.round(v)) } catch { /* ignore */ }
  }, [])

  const setOnEnded = useCallback((fn) => { onEndedRef.current = fn }, [])

  return { ready, playing, buffering, current, nowTitle, playTrack, play, pause, toggle, setVolume, setOnEnded }
}
