import { useEffect, useRef } from 'react'

// Giữ màn hình sáng khi đang phát nhạc (Screen Wake Lock API) để điện thoại
// không tự khóa màn hình làm ngắt nhạc. Wake lock bị nhả khi rời tab/khóa máy,
// nên tự xin lại mỗi khi quay lại tab. Trình duyệt không hỗ trợ thì bỏ qua êm.
export function useWakeLock(active) {
  const ref = useRef(null)

  useEffect(() => {
    let cancelled = false
    const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

    const acquire = async () => {
      if (cancelled || !active || !supported) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      try { ref.current = await navigator.wakeLock.request('screen') } catch { /* bị chặn/không hỗ trợ */ }
    }
    const release = async () => {
      try { await ref.current?.release() } catch { /* ignore */ }
      ref.current = null
    }

    if (active) acquire()
    else release()

    // Khi quay lại tab (mở lại màn hình) mà vẫn đang phát -> xin lại wake lock
    const onVisible = () => {
      if (!cancelled && active && document.visibilityState === 'visible' && !ref.current) acquire()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      release()
    }
  }, [active])
}
