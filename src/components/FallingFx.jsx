import { useMemo } from 'react'

// Hiệu ứng rơi nhẹ, thưa: lá thu và/hoặc cánh hoa. Chỉ CSS animation, nhẹ máy.
// mode: 'none' | 'leaves' | 'petals' | 'both'
const LEAF_COLORS = ['#c98a3e', '#b56b39', '#a9863f', '#9c7a3c', '#c07b46']
const PETAL_COLORS = ['#e7b1bd', '#f0c8d2', '#e9c6b8', '#f2d6cf', '#dcb0a6']
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function LeafSVG({ c }) {
  return (
    <svg viewBox="0 0 24 24" className="fx-svg">
      <path d="M12 1c5 4 7 10 4 16-1 3-3 5-4 6-1-1-3-3-4-6-3-6-1-12 4-16z" fill={c} />
      <path d="M12 4v15" stroke="rgba(0,0,0,0.2)" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  )
}
function PetalSVG({ c }) {
  return (
    <svg viewBox="0 0 24 24" className="fx-svg">
      <path d="M12 2c6 3 8 9 6 14-1 3-4 5-6 6-2-1-5-3-6-6-2-5 0-11 6-14z" fill={c} />
    </svg>
  )
}

export default function FallingFx({ mode = 'none' }) {
  const count = { leaves: 10, petals: 12, both: 14 }[mode] || 0
  const particles = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      const type = mode === 'both' ? (Math.random() < 0.5 ? 'leaf' : 'petal') : (mode === 'petals' ? 'petal' : 'leaf')
      arr.push({
        id: i, type,
        left: rand(0, 100),
        size: type === 'petal' ? rand(11, 18) : rand(13, 22),
        fall: rand(15, 27),
        delay: -rand(0, 27),   // âm -> vào giữa chừng, rơi lệch nhau
        sway: rand(2.6, 4.6),
        drift: rand(-45, 45),
        spin: rand(160, 520) * (Math.random() < 0.5 ? -1 : 1),
        opacity: rand(0.5, 0.82),
        color: pick(type === 'petal' ? PETAL_COLORS : LEAF_COLORS),
      })
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  if (!count) return null
  return (
    <div className="fx" aria-hidden="true">
      {particles.map((p) => (
        <span key={p.id} className="fx-drop" style={{
          left: `${p.left}%`, width: p.size, height: p.size,
          animationDuration: `${p.fall}s`, animationDelay: `${p.delay}s`, '--drift': `${p.drift}px`,
        }}>
          <span className="fx-sway" style={{ animationDuration: `${p.sway}s`, opacity: p.opacity, '--spin': `${p.spin}deg` }}>
            {p.type === 'leaf' ? <LeafSVG c={p.color} /> : <PetalSVG c={p.color} />}
          </span>
        </span>
      ))}
    </div>
  )
}
