import { useEffect, useRef } from 'react'

// Cảnh Đà Lạt 90s: nền gradient theo preset, sương trôi, mưa phùn (canvas),
// tia nắng xuyên sương (ray), hạt phim + vignette cho cảm giác hoài niệm.
//
// props:
//   scene: 'fog' | 'rain' | 'ray'
//   rain: 0..1 mật độ mưa (đồng bộ với âm lượng mưa)
//   photo: URL ảnh nền tùy chọn (có thể rỗng)
export default function Scene({ scene = 'fog', rain = 0.4, photo = '' }) {
  const canvasRef = useRef(null)
  const rainRef = useRef(rain)
  rainRef.current = rain

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let drops = []
    let w = 0
    let h = 0

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * window.devicePixelRatio
      h = canvas.height = canvas.offsetHeight * window.devicePixelRatio
      const count = Math.floor((w * h) / 26000)
      drops = new Array(count).fill(0).map(() => newDrop(true))
    }
    function newDrop(init) {
      return {
        x: Math.random() * w,
        y: init ? Math.random() * h : -20,
        len: 8 + Math.random() * 18,
        speed: 4 + Math.random() * 7,
        drift: -0.6 + Math.random() * 0.4,
        alpha: 0.06 + Math.random() * 0.18,
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const density = rainRef.current
      const visible = Math.floor(drops.length * Math.min(1, density * 1.2 + 0.05))
      ctx.lineCap = 'round'
      for (let i = 0; i < visible; i++) {
        const d = drops[i]
        ctx.strokeStyle = `rgba(200, 224, 224, ${d.alpha})`
        ctx.lineWidth = 1.1 * window.devicePixelRatio
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x + d.drift * d.len, d.y + d.len)
        ctx.stroke()
        d.y += d.speed * (0.6 + density)
        d.x += d.drift
        if (d.y > h) Object.assign(d, newDrop(false))
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className={`scene scene--${scene}`} aria-hidden="true">
      {photo ? (
        <div className="scene__photo" style={{ backgroundImage: `url("${photo}")` }} />
      ) : (
        <div className="scene__gradient" />
      )}

      {/* Dãy núi / hàng thông xa mờ trong sương */}
      <div className="scene__ridges">
        <div className="ridge ridge--far" />
        <div className="ridge ridge--mid" />
        <div className="ridge ridge--near" />
      </div>

      {/* Tia nắng xuyên sương */}
      <div className="scene__rays">
        <span /><span /><span /><span /><span />
      </div>

      {/* Các lớp sương trôi */}
      <div className="scene__fog">
        <div className="fog fog--1" />
        <div className="fog fog--2" />
        <div className="fog fog--3" />
      </div>

      {/* Mưa phùn */}
      <canvas ref={canvasRef} className="scene__rain" />

      {/* Hạt phim + vignette 90s */}
      <div className="scene__grain" />
      <div className="scene__vignette" />
    </div>
  )
}
