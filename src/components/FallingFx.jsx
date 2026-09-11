import { useEffect, useMemo, useState } from 'react'

// Hiệu ứng rơi nhẹ, thưa: LÁ (thon, có gân, nhọn) và CÁNH HOA (tròn, mềm, khuyết
// đầu như hoa anh đào) — hai hình rõ ràng khác nhau. Rơi theo chiều gió, gió tự
// đổi hướng theo thời gian. Chỉ CSS animation nên nhẹ máy.
const LEAF_COLORS = ['#c98a3e', '#b56b39', '#9c7a3c', '#a85f2e', '#7f7a3a']
const PETAL_COLORS = ['#f0b9c6', '#f6d0da', '#eec7bb', '#f4dbd4', '#e4b7bd']
const SPEED = { slow: 1.8, normal: 1, fast: 0.55 }
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

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

export default function FallingFx({ mode = 'none', speed = 'normal' }) {
  const mult = SPEED[speed] || 1
  const count = { leaves: 10, petals: 12, both: 14 }[mode] || 0

  const particles = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const type = mode === 'both' ? (Math.random() < 0.5 ? 'leaf' : 'petal') : (mode === 'petals' ? 'petal' : 'leaf')
      arr.push({
        id: i, type,
        left: rand(0, 100),
        size: type === 'petal' ? rand(11, 17) : rand(13, 22),
        fall: rand(15, 27),
        delay: -rand(0, 27),
        sway: rand(2.6, 4.6),
        drift: rand(-16, 16),                 // rung ngang tự nhiên (nhỏ)
        spin: rand(160, 520) * (Math.random() < 0.5 ? -1 : 1),
        opacity: rand(0.5, 0.82),
        color: pick(type === 'petal' ? PETAL_COLORS : LEAF_COLORS),
      })
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Gió: đổi hướng/độ mạnh chậm rãi
  const [wind, setWind] = useState(0)
  useEffect(() => {
    if (!count) return undefined
    let t
    const gust = () => {
      const dir = Math.random() < 0.5 ? -1 : 1
      setWind(dir * rand(15, 130))
      t = setTimeout(gust, rand(6000, 12000))
    }
    gust()
    return () => clearTimeout(t)
  }, [count])

  if (!count) return null
  return (
    <div className="fx" aria-hidden="true" style={{ '--wind-x': `${wind}px` }}>
      {particles.map((p) => (
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
      ))}
    </div>
  )
}
