import { useEffect, useMemo, useState } from 'react'

// Hiệu ứng rơi nhẹ (bản dự phòng, chỉ CSS — dùng khi máy không có WebGL):
// LÁ (thon, có gân), CÁNH HOA (tròn mềm) và MƯA (vệt mảnh, rơi nhanh). Chọn
// nhiều loại cùng lúc. Rơi theo chiều gió, gió tự đổi hướng theo thời gian.
const LEAF_COLORS = ['#c98a3e', '#b56b39', '#9c7a3c', '#a85f2e', '#7f7a3a']
const PETAL_COLORS = ['#f0b9c6', '#f6d0da', '#eec7bb', '#f4dbd4', '#e4b7bd']
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const clamp = (s) => Math.min(100, Math.max(0, Number(s) || 0))
// speed 0..100 (0 chậm, 100 nhanh) -> hệ số nhân thời gian rơi (2.0 .. 0.4)
const speedMult = (s) => 2.0 - (clamp(s) / 100) * 1.6
// density 0..100 -> hệ số số lượng (0.4 .. 1.7, =1.05 tại 50)
const densMult = (s) => 0.4 + (clamp(s) / 100) * 1.3
// size 0..100 -> hệ số kích thước (0.6 .. 1.4, =1.0 tại 50)
const sizeMult = (s) => 0.6 + (clamp(s) / 100) * 0.8

// Lá: thon dài, nhọn hai đầu, có gân giữa + gân phụ + cuống
function LeafSVG({ c }) {
  return (
    <svg viewBox="0 0 24 26" className="fx-svg">
      <path d="M12 1c3 5 3 13 0 20-3-7-3-15 0-20z" fill={c} />
      <path d="M12 3v17M12 8l-2.4 2M12 8l2.4 2M12 12l-2.4 2M12 12l2.4 2M12 20v4"
        stroke="rgba(30,20,8,0.35)" strokeWidth="0.9" strokeLinecap="round" fill="none" />
    </svg>
  )
}
// Cánh hoa: bản rộng, tròn mềm, khuyết nhẹ ở đầu (kiểu hoa anh đào)
function PetalSVG({ c }) {
  return (
    <svg viewBox="0 0 24 24" className="fx-svg">
      <path d="M12 2C6 5 4 12 8 18c1.5 2.4 3 2.9 4 0.9 1 2 2.5 1.5 4-0.9 4-6 2-13-4-16z" fill={c} />
    </svg>
  )
}

export default function FallingFx({ modes = [], speed = 50, density = 50, size = 50 }) {
  const set = Array.isArray(modes) ? modes : [modes]
  const mult = speedMult(speed)
  const dens = densMult(density)
  const sz = sizeMult(size)
  const nLeaf = set.includes('leaves') ? Math.round(10 * dens) : 0
  const nPetal = set.includes('petals') ? Math.round(12 * dens) : 0
  const nRain = set.includes('rain') ? Math.round(42 * dens) : 0
  const nMist = set.includes('drizzle') ? Math.round(70 * dens) : 0
  const total = nLeaf + nPetal + nRain + nMist

  const particles = useMemo(() => {
    const arr = []
    let id = 0
    const addFall = (type, n) => {
      for (let i = 0; i < n; i++) {
        arr.push({
          id: id++, type,
          left: rand(0, 100),
          size: (type === 'petal' ? rand(11, 17) : rand(13, 22)) * sz,
          fall: rand(15, 27),
          delay: -rand(0, 27),
          sway: rand(2.6, 4.6),
          drift: rand(-16, 16),
          spin: rand(160, 520) * (Math.random() < 0.5 ? -1 : 1),
          opacity: rand(0.5, 0.82),
          color: pick(type === 'petal' ? PETAL_COLORS : LEAF_COLORS),
        })
      }
    }
    addFall('leaf', nLeaf)
    addFall('petal', nPetal)
    for (let i = 0; i < nRain; i++) {
      arr.push({
        id: id++, type: 'rain',
        left: rand(-4, 100),
        streak: rand(38, 86) * sz,
        fall: rand(0.7, 1.5),
        delay: -rand(0, 2),
        drift: rand(-10, 10),
        opacity: rand(0.25, 0.6),
      })
    }
    // mưa phùn: vệt rất ngắn, mảnh, mờ, rơi chậm & bay lất phất nhiều hơn
    for (let i = 0; i < nMist; i++) {
      arr.push({
        id: id++, type: 'mist',
        left: rand(-4, 100),
        streak: rand(8, 18) * sz,
        fall: rand(1.8, 3.2),
        delay: -rand(0, 3),
        drift: rand(-28, 28),
        opacity: rand(0.12, 0.32),
      })
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nLeaf, nPetal, nRain, nMist, sz])

  // Gió: đổi hướng/độ mạnh chậm rãi
  const [wind, setWind] = useState(0)
  useEffect(() => {
    if (!total) return undefined
    let t
    const gust = () => {
      const dir = Math.random() < 0.5 ? -1 : 1
      setWind(dir * rand(15, 130))
      t = setTimeout(gust, rand(6000, 12000))
    }
    gust()
    return () => clearTimeout(t)
  }, [total])

  if (!total) return null

  return (
    <div className="fx" aria-hidden="true" style={{ '--wind-x': `${wind}px` }}>
      {particles.map((p) => (p.type === 'rain' || p.type === 'mist' ? (
        <span key={p.id} className={`fx-drop fx-drop--rain ${p.type === 'mist' ? 'fx-drop--mist' : ''}`} style={{
          left: `${p.left}%`, height: p.streak,
          animationDuration: `${(p.fall * mult).toFixed(2)}s`, animationDelay: `${(p.delay * mult).toFixed(2)}s`,
          '--drift': `${p.drift}px`,
        }}>
          <span className="fx-wind"><span className="fx-rainline" style={{ opacity: p.opacity }} /></span>
        </span>
      ) : (
        <span key={p.id} className="fx-drop" style={{
          left: `${p.left}%`, width: p.size, height: p.size,
          animationDuration: `${(p.fall * mult).toFixed(1)}s`, animationDelay: `${(p.delay * mult).toFixed(1)}s`,
          '--drift': `${p.drift}px`,
        }}>
          <span className="fx-wind">
            <span className="fx-sway" style={{ animationDuration: `${(p.sway * (0.7 + 0.3 * mult)).toFixed(1)}s`, opacity: p.opacity, '--spin': `${p.spin}deg` }}>
              {p.type === 'leaf' ? <LeafSVG c={p.color} /> : <PetalSVG c={p.color} />}
            </span>
          </span>
        </span>
      )))}
    </div>
  )
}
