import { useEffect, useRef, useState } from 'react'

// Cảnh Đà Lạt cổ điển vẽ bằng SVG: trời chiều, mặt trời mờ sau sương,
// những dãy đồi thông xa dần, mặt hồ phẳng lặng, hàng thông tiền cảnh và
// một mái nhà cổ. Bên trên là sương trôi, mưa phùn (canvas), tia nắng,
// hạt phim + vignette cho cảm giác một tấm ảnh cũ đã ngả màu.
//
// props: scene 'fog'|'rain'|'ray', rain 0..1, photo URL (tùy chọn)
export default function Scene({ scene = 'fog', rain = 0.4, photo = '' }) {
  const canvasRef = useRef(null)
  const rainRef = useRef(rain)
  rainRef.current = rain

  // Nếu ảnh lỗi (chặn mạng, sai URL) thì quay về tranh vẽ vector.
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [photo])
  const usePhoto = photo && !failed

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf, drops = [], w = 0, h = 0

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
        alpha: 0.05 + Math.random() * 0.16,
      }
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const density = rainRef.current
      const visible = Math.floor(drops.length * Math.min(1, density * 1.2 + 0.05))
      ctx.lineCap = 'round'
      for (let i = 0; i < visible; i++) {
        const d = drops[i]
        ctx.strokeStyle = `rgba(226, 214, 188, ${d.alpha})`
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
    resize(); draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <div className={`scene scene--${scene}`} aria-hidden="true">
      {usePhoto ? (
        <div className="scene__photo">
          <img src={photo} alt="" className="scene__photo-img" onError={() => setFailed(true)} />
        </div>
      ) : (
        <DalatSVG />
      )}

      {/* Tia nắng xuyên sương */}
      <div className="scene__rays"><span /><span /><span /><span /><span /></div>

      {/* Sương trôi */}
      <div className="scene__fog">
        <div className="fog fog--1" /><div className="fog fog--2" /><div className="fog fog--3" />
      </div>

      {/* Mưa phùn */}
      <canvas ref={canvasRef} className="scene__rain" />

      {/* Chất phim cũ */}
      <div className="scene__grain" />
      <div className="scene__vignette" />
    </div>
  )
}

// Bức tranh phong cảnh — toàn bộ là vector nên nét và nhẹ.
// Bố cục: trời chiều chiếm nửa trên (lộ ra quanh các panel), núi đưa cao,
// hồ và hàng thông tiền cảnh ở dưới.
function DalatSVG() {
  return (
    <svg className="scene__svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a978" />
          <stop offset="30%" stopColor="#b89568" />
          <stop offset="58%" stopColor="#94835f" />
          <stop offset="100%" stopColor="#4c574c" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f7e9c8" stopOpacity="0.98" />
          <stop offset="34%" stopColor="#eecf97" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#eecf97" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a866f" />
          <stop offset="100%" stopColor="#3c473f" />
        </linearGradient>
        <linearGradient id="mistBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2d7bd" stopOpacity="0" />
          <stop offset="55%" stopColor="#e2d7bd" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e2d7bd" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* trời + mặt trời chiều */}
      <rect x="0" y="0" width="1600" height="900" fill="url(#sky)" />
      <circle cx="1120" cy="180" r="360" fill="url(#sun)" />
      <circle cx="1120" cy="180" r="60" fill="#f6e6bf" opacity="0.8" />

      {/* mây phai trên cao */}
      <g fill="#e6d8b8">
        <ellipse cx="360" cy="150" rx="220" ry="20" opacity="0.16" />
        <ellipse cx="620" cy="205" rx="300" ry="18" opacity="0.12" />
        <ellipse cx="1180" cy="300" rx="340" ry="22" opacity="0.12" />
        <ellipse cx="240" cy="300" rx="260" ry="16" opacity="0.10" />
      </g>

      {/* núi xa nhất (đưa lên cao để lộ quanh panel) */}
      <g opacity="0.46">
        <path d="M0 360 Q 300 300 640 345 T 1600 322 L1600 900 L0 900 Z" fill="#8f8767" />
        <PineRow y={345} count={52} width={1600} h={15} color="#8f8767" />
      </g>

      {/* núi giữa */}
      <g opacity="0.68">
        <path d="M0 452 Q 420 388 860 438 T 1600 414 L1600 900 L0 900 Z" fill="#657056" />
        <PineRow y={438} count={44} width={1600} h={22} color="#657056" />
      </g>

      {/* dải sương giữa các lớp núi */}
      <rect x="0" y="360" width="1600" height="150" fill="url(#mistBand)" opacity="0.85" />

      {/* mặt hồ phẳng lặng */}
      <rect x="0" y="560" width="1600" height="200" fill="url(#lake)" />
      <g opacity="0.2" fill="#ece0c2">
        <rect x="120" y="592" width="380" height="3" rx="1.5" />
        <rect x="260" y="630" width="520" height="2.5" rx="1.5" />
        <rect x="820" y="606" width="440" height="3" rx="1.5" />
        <rect x="980" y="664" width="380" height="2.5" rx="1.5" />
        <rect x="180" y="700" width="300" height="2.5" rx="1.5" />
      </g>

      {/* bờ gần + mái nhà cổ */}
      <path d="M0 690 Q 520 656 1600 700 L1600 900 L0 900 Z" fill="#2f382f" />
      <g transform="translate(1210 596)" opacity="0.94">
        <polygon points="0,64 74,6 148,64" fill="#3d302a" />
        <rect x="16" y="64" width="116" height="66" fill="#4c3d33" />
        <rect x="42" y="84" width="22" height="30" fill="#e0bd7c" opacity="0.8" />
        <rect x="88" y="84" width="22" height="30" fill="#e0bd7c" opacity="0.8" />
      </g>

      {/* hàng thông tiền cảnh hai bên */}
      <g fill="#1e261d">
        <Pine x={72} baseY={905} scale={2.6} />
        <Pine x={200} baseY={910} scale={1.9} />
        <Pine x={1528} baseY={905} scale={2.8} />
        <Pine x={1408} baseY={912} scale={1.8} />
      </g>
    </svg>
  )
}

// Một cây thông cách điệu (tam giác chồng).
function Pine({ x, baseY, scale = 1 }) {
  const s = 40 * scale
  const t = (n) => `M ${x} ${baseY - n * s - s * 1.7} l ${s * 0.9} ${s} l ${-s * 0.55} 0 l ${s * 0.75} ${s * 0.9} l ${-s * 0.5} 0 l ${s * 0.8} ${s} l ${-s * 3} 0 l ${s * 0.8} ${-s} l ${-s * 0.5} 0 l ${s * 0.75} ${-s * 0.9} l ${-s * 0.55} 0 Z`
  return (
    <g>
      <path d={t(0)} />
      <rect x={x - s * 0.12} y={baseY - s * 0.2} width={s * 0.24} height={s * 0.5} fill="#20281f" />
    </g>
  )
}

// Một hàng ngọn thông lô nhô chạy dọc đỉnh đồi.
function PineRow({ y, count, width, h, color }) {
  const step = width / count
  const pts = []
  for (let i = 0; i <= count; i++) {
    const cx = i * step
    const hh = h * (0.6 + Math.abs(Math.sin(i * 1.7)) * 0.7)
    pts.push(`M ${cx - step * 0.5} ${y} L ${cx} ${y - hh} L ${cx + step * 0.5} ${y} Z`)
  }
  return <path d={pts.join(' ')} fill={color} />
}
