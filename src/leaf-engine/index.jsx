import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import LeafField from './LeafField'
import { pickProfile, prefersReducedMotion } from './quality'

// LeafEngine: lớp canvas WebGL nằm SAU toàn bộ giao diện, nền trong suốt,
// không chặn chuột. Tự chọn hồ sơ chất lượng theo thiết bị và tạm dừng khi
// tab bị ẩn (tiết kiệm pin, không đụng tới trình phát nhạc).
export default function LeafEngine({ mode = 'leaves', speed = 50 }) {
  const profile = useMemo(() => pickProfile(), [])
  const reduce = useMemo(() => prefersReducedMotion(), [])
  const [visible, setVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  )

  // Tạm dừng vòng lặp vẽ khi rời tab -> tiết kiệm CPU/GPU/pin
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (mode === 'none' || reduce) return null

  // Ít lá hơn khi chọn "cả hai" để giữ mật độ hợp lý (2 loại cùng lúc)
  const maxLeaves = mode === 'both'
    ? Math.round(profile.maxLeaves * 0.85)
    : profile.maxLeaves

  return (
    <div className="leaf-canvas" aria-hidden="true">
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={profile.dpr}
        gl={{ antialias: profile.antialias, alpha: true, powerPreference: 'low-power' }}
        camera={{ fov: 45, position: [0, 0, 14], near: 0.1, far: 60 }}
        style={{ background: 'transparent' }}
      >
        <LeafField mode={mode} speed={speed} maxLeaves={maxLeaves} />
      </Canvas>
    </div>
  )
}
