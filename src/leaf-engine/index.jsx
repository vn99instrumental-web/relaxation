import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import LeafField from './LeafField'
import RainField from './RainField'
import DebugOverlay from './DebugOverlay'
import { pickProfile, prefersReducedMotion } from './quality'

// LeafEngine: lớp canvas WebGL SAU giao diện, nền trong suốt, không chặn chuột.
// Vẽ nhiều hiệu ứng cùng lúc (lá / cánh hoa / mưa). Tự chọn chất lượng theo
// thiết bị, tạm dừng khi tab ẩn. Bật debug bằng ?fxdebug=1.
export default function LeafEngine({
  modes = ['leaves'], speed = 50, density = 50, sizeLevel = 50, preset = 'breeze',
  windDir = 'auto', swirl = 50, debug = false,
}) {
  const profile = useMemo(() => pickProfile(), [])
  const reduce = useMemo(() => prefersReducedMotion(), [])
  const stats = useRef({ fps: 60, leaves: 0, drops: 0, cap: 0, spawnRate: 0, availability: 1, windSpeed: 0, windDir: 0, gust: 0 })
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  )
  const dbg = useMemo(() => {
    if (debug) return true
    try { return new URLSearchParams(window.location.search).has('fxdebug') } catch { return false }
  }, [debug])

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const set = Array.isArray(modes) ? modes : [modes]
  const hasLeaves = set.includes('leaves')
  const hasPetals = set.includes('petals')
  const hasRain = set.includes('rain')

  if (reduce || (!hasLeaves && !hasPetals && !hasRain)) return null

  const leafMode = hasLeaves && hasPetals ? 'both' : hasLeaves ? 'leaves' : hasPetals ? 'petals' : null

  // Thanh mật độ 0..100 -> hệ số 0.35..1.65 (=1.0 tại 50)
  const d = Math.min(100, Math.max(0, Number(density) || 0)) / 100
  const factor = 0.35 + d * 1.3
  const maxLeaves = Math.max(8, Math.round(profile.maxLeaves * (leafMode === 'both' ? 0.85 : 1) * factor))
  const maxDrops = Math.max(20, Math.round(profile.maxLeaves * 2.2 * factor))

  return (
    <>
      <div className="leaf-canvas" aria-hidden="true">
        <Canvas
          frameloop={visible ? 'always' : 'never'}
          dpr={profile.dpr}
          gl={{ antialias: profile.antialias, alpha: true, powerPreference: 'low-power' }}
          camera={{ fov: 45, position: [0, 0, 14], near: 0.1, far: 60 }}
          style={{ background: 'transparent' }}
        >
          {leafMode && <LeafField mode={leafMode} speed={speed} sizeLevel={sizeLevel} preset={preset} windDir={windDir} swirl={swirl} maxLeaves={maxLeaves} stats={stats} />}
          {hasRain && <RainField speed={speed} sizeLevel={sizeLevel} preset={preset} windDir={windDir} swirl={swirl} maxDrops={maxDrops} stats={stats} />}
        </Canvas>
      </div>
      {dbg && <DebugOverlay stats={stats} tier={profile.tier} />}
    </>
  )
}
