import { useEffect, useState } from 'react'

// HUD gỡ lỗi (chỉ dùng khi phát triển). Đọc `stats` qua interval ~6 lần/giây
// nên KHÔNG ép React render 60fps. Không xuất hiện ở production trừ khi bật cờ.
export default function DebugOverlay({ stats, tier }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 160)
    return () => clearInterval(id)
  }, [])
  const s = stats.current
  const row = (k, v) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
      <span style={{ opacity: 0.7 }}>{k}</span><span>{v}</span>
    </div>
  )
  return (
    <div style={{
      position: 'fixed', top: 10, left: 10, zIndex: 60, pointerEvents: 'none',
      font: '11px/1.5 ui-monospace, Menlo, monospace', color: '#d6f5c8',
      background: 'rgba(8,12,8,0.72)', border: '1px solid rgba(160,200,150,0.25)',
      borderRadius: 8, padding: '8px 10px', minWidth: 168, backdropFilter: 'blur(3px)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#a9e58a' }}>🍃 Leaf Engine · debug</div>
      {row('quality', tier)}
      {row('fps', (s.fps || 0).toFixed(0))}
      {row('leaves', `${s.leaves || 0}/${s.cap || 0}`)}
      {row('drops', s.drops || 0)}
      {row('spawn/s', (s.spawnRate || 0).toFixed(2))}
      {row('availability', (s.availability ?? 1).toFixed(2))}
      {row('wind', (s.windSpeed || 0).toFixed(2))}
      {row('dir°', (s.windDir || 0).toFixed(0))}
      {row('gust', (s.gust || 0).toFixed(2))}
    </div>
  )
}
