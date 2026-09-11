import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import LeafField from './LeafField'
import RainField from './RainField'
import { pickProfile, prefersReducedMotion } from './quality'

// LeafEngine: lớp canvas WebGL nằm SAU toàn bộ giao diện, nền trong suốt,
// không chặn chuột. Vẽ lá / cánh hoa / mưa. Tự chọn hồ sơ chất lượng theo thiết
// bị và tạm dừng khi tab bị ẩn (không đụng tới trình phát nhạc).
export default function LeafEngine({ mode = 'leaves', speed = 50, density = 50 }) {
  const profile = useMemo(() => pickProfile(), [])
  const reduce = useMemo(() => prefersReducedMotion(), [])
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  )

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (mode === 'none' || reduce) return null

  // Thanh mật độ 0..100 -> hệ số 0.35..1.65 (=1.0 tại 50)
  const d = Math.min(100, Math.max(0, Number(density) || 0)) / 100
  const factor = 0.35 + d * 1.3

  const isRain = mode === 'rain'
  // "cả hai" ít hơn chút (2 loại cùng lúc); mưa nhiều hạt hơn lá
  const maxLeaves = Math.max(8, Math.round(profile.maxLeaves * (mode === 'both' ? 0.85 : 1) * factor))
  const maxDrops = Math.max(20, Math.round(profile.maxLeaves * 2.2 * factor))

  return (
    <div className="leaf-canvas" aria-hidden="true">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={profile.dpr}
        gl={{ antialias: profile.antialias, alpha: true, powerPreference: 'low-power' }}
        camera={{ fov: 45, position: [0, 0, 14], near: 0.1, far: 60 }}
        style={{ background: 'transparent' }}
      >
        {isRain
          ? <RainField speed={speed} maxDrops={maxDrops} />
          : <LeafField mode={mode} speed={speed} maxLeaves={maxLeaves} />}
      </Canvas>
    </div>
  )
}
