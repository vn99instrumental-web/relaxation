import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { WindController } from './WindController'
import { LeafSimulation } from './LeafSimulation'
import { createLeafMaterial } from './leafMaterial'
import { makeAdaptive } from './quality'
import { LEAF_CONFIG } from './config'

// Cảnh lá/cánh hoa: 1 InstancedMesh (1 lệnh vẽ), mỗi lá lấy 1 ô trong atlas.
// Gió + vật lý cập nhật mỗi khung; ghi chỉ số ra `stats` cho Debug overlay.
export default function LeafField({ mode = 'leaves', speed = 50, sizeLevel = 50, preset = 'breeze', windDir = 'auto', swirl = 50, maxLeaves = 120, stats }) {
  const { camera, size } = useThree()
  const atlas = LEAF_CONFIG.atlas
  const texUrl = `${import.meta.env.BASE_URL || '/'}${atlas.url}`
  const texture = useLoader(THREE.TextureLoader, texUrl)

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.needsUpdate = true
  }, [texture])

  const rig = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1, 1)
    const material = createLeafMaterial(texture, [1 / atlas.cols, 1 / atlas.rows])
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

    const zero = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = 0; i < maxLeaves; i++) mesh.setMatrixAt(i, zero)
    mesh.instanceMatrix.needsUpdate = true

    const wind = new WindController()
    const sim = new LeafSimulation({ mesh, uvArray, alphaArray, wind, max: maxLeaves })
    const adaptive = makeAdaptive(maxLeaves)
    return { geom, material, mesh, uvAttr, alphaAttr, wind, sim, adaptive }
  }, [texture, maxLeaves, atlas.cols, atlas.rows])

  useEffect(() => () => {
    rig.geom.dispose(); rig.material.dispose(); rig.mesh.dispose()
  }, [rig])

  useEffect(() => { rig.sim.setMode(mode) }, [rig, mode])
  useEffect(() => { rig.wind.setStrength(speed) }, [rig, speed])
  useEffect(() => { rig.wind.setPreset(preset) }, [rig, preset])
  useEffect(() => { rig.wind.setDirectionMode(windDir) }, [rig, windDir])
  useEffect(() => {
    const s = Math.min(100, Math.max(0, Number(sizeLevel) || 0)) / 100
    rig.sim.setSizeScale(0.6 + s * 0.8)   // 0.6 .. 1.4 (=1.0 tại 50)
  }, [rig, sizeLevel])
  useEffect(() => {
    const s = Math.min(100, Math.max(0, Number(swirl) || 0)) / 100
    rig.wind.setTurbulenceScale(0.3 + s * 1.5)   // rơi thẳng .. chao lượn nhiều
    rig.sim.setFlutterScale(0.4 + s * 1.4)
  }, [rig, swirl])

  const tRef = useRef(0)
  const fpsRef = useRef(60)

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta)
    tRef.current += dt
    const { wind, sim, adaptive, uvAttr, alphaAttr } = rig

    wind.update(dt)
    const fov = (camera.fov * Math.PI) / 180
    const aspect = size.width / Math.max(1, size.height)
    sim.setBounds(camera.position.z, fov, aspect)
    sim.update(dt, adaptive.cap, tRef.current)
    uvAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    adaptive.tick(delta * 1000)

    if (stats) {
      fpsRef.current = fpsRef.current * 0.9 + (1 / Math.max(1e-3, delta)) * 0.1
      const s = stats.current
      s.fps = fpsRef.current
      s.leaves = sim.activeCount
      s.cap = adaptive.cap
      s.spawnRate = sim.emitter.lastLambda
      s.availability = sim.emitter.availability
      s.windSpeed = wind.windSpeed
      s.windDir = wind.windDirectionDeg
      s.gust = wind.gust
    }
  })

  return <primitive object={rig.mesh} />
}
