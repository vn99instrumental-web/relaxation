import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { WindController } from './WindController'
import { LeafSimulation } from './LeafSimulation'
import { createLeafMaterial } from './leafMaterial'
import { makeAdaptive } from './quality'

// Cảnh 3D chứa toàn bộ lá/cánh hoa: 1 InstancedMesh duy nhất (1 lệnh vẽ),
// mỗi lá là 1 tấm phẳng lấy 1 ô trong atlas. Gió + vật lý cập nhật mỗi khung.
export default function LeafField({ mode = 'leaves', speed = 50, sizeLevel = 50, maxLeaves = 120 }) {
  const { camera, size } = useThree()
  const texture = useLoader(THREE.TextureLoader, `${import.meta.env.BASE_URL || '/'}leaves/leaf-atlas.webp`)

  // Chuẩn bị texture 1 lần
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.needsUpdate = true
  }, [texture])

  // Dựng mesh + thuộc tính instance + gió + mô phỏng (chỉ 1 lần theo maxLeaves)
  const rig = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1, 1)
    const material = createLeafMaterial(texture)
    const mesh = new THREE.InstancedMesh(geom, material, maxLeaves)
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const uvArray = new Float32Array(maxLeaves * 2)
    const alphaArray = new Float32Array(maxLeaves)
    const uvAttr = new THREE.InstancedBufferAttribute(uvArray, 2)
    const alphaAttr = new THREE.InstancedBufferAttribute(alphaArray, 1)
    uvAttr.setUsage(THREE.DynamicDrawUsage)
    alphaAttr.setUsage(THREE.DynamicDrawUsage)
    geom.setAttribute('instanceUvOffset', uvAttr)
    geom.setAttribute('instanceAlpha', alphaAttr)

    // ẩn hết lúc đầu (matrix scale 0)
    const zero = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = 0; i < maxLeaves; i++) mesh.setMatrixAt(i, zero)
    mesh.instanceMatrix.needsUpdate = true

    const wind = new WindController()
    const sim = new LeafSimulation({ mesh, uvArray, alphaArray, wind, max: maxLeaves })
    const adaptive = makeAdaptive(maxLeaves)
    return { geom, material, mesh, uvAttr, alphaAttr, wind, sim, adaptive }
  }, [texture, maxLeaves])

  // Dọn dẹp khi tháo
  useEffect(() => () => {
    rig.geom.dispose(); rig.material.dispose(); rig.mesh.dispose()
  }, [rig])

  // Cập nhật chế độ (lá / cánh hoa / cả hai), tốc độ gió, và kích thước lá
  useEffect(() => { rig.sim.setMode(mode) }, [rig, mode])
  useEffect(() => { rig.wind.setBase(speed) }, [rig, speed])
  useEffect(() => {
    const s = Math.min(100, Math.max(0, Number(sizeLevel) || 0)) / 100
    rig.sim.setSizeScale(0.6 + s * 0.8)   // 0.6 .. 1.4 (=1.0 tại 50)
  }, [rig, sizeLevel])

  const tRef = useRef(0)

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta)   // chặn bước nhảy lớn khi tab vừa hiện lại
    tRef.current += dt
    const { wind, sim, adaptive, uvAttr, alphaAttr } = rig

    wind.update(dt)

    // Biên khung nhìn theo camera hiện tại (để lá phủ kín màn hình)
    const fov = (camera.fov * Math.PI) / 180
    const aspect = size.width / Math.max(1, size.height)
    sim.setBounds(camera.position.z, fov, aspect)

    sim.update(dt, adaptive.cap, tRef.current)
    uvAttr.needsUpdate = true
    alphaAttr.needsUpdate = true

    adaptive.tick(delta * 1000)
  })

  return <primitive object={rig.mesh} />
}
