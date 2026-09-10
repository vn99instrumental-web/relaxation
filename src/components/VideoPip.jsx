import { useEffect, useRef, useState } from 'react'

// Cửa sổ video nhỏ, KÉO DI CHUYỂN được. Luôn tồn tại trong DOM để nhạc tiếp
// tục phát; khi ẩn thì đưa khung ra ngoài màn hình chứ không gỡ bỏ.
export default function VideoPip({ showVideo, onClose }) {
  const [pos, setPos] = useState(null) // {x, y} — null = dùng vị trí mặc định (góc phải trên)
  const [dragging, setDragging] = useState(false)
  const start = useRef(null)

  useEffect(() => {
    if (pos) return
    const x = Math.max(12, window.innerWidth - 300)
    setPos({ x, y: 72 })
  }, [pos])

  useEffect(() => {
    if (!dragging) return
    const move = (e) => {
      const s = start.current
      if (!s) return
      let x = s.ox + (e.clientX - s.sx)
      let y = s.oy + (e.clientY - s.sy)
      x = Math.min(Math.max(6, x), window.innerWidth - 260)
      y = Math.min(Math.max(6, y), window.innerHeight - 120)
      setPos({ x, y })
    }
    const up = () => setDragging(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [dragging])

  const onDown = (e) => {
    if (!pos) return
    start.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    setDragging(true)
  }

  const style = pos ? { left: pos.x, top: pos.y, right: 'auto' } : undefined

  return (
    <div className={`pip ${showVideo ? 'is-shown' : 'is-hidden'} ${dragging ? 'is-dragging' : ''}`} style={style}>
      <div className="pip__bar" onPointerDown={onDown} title="Kéo để di chuyển">
        <span className="pip__label">⠿ Video</span>
        <button className="pip__close" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} title="Ẩn video">✕</button>
      </div>
      <div className="pip__frame"><div id="yt-frame" /></div>
    </div>
  )
}
