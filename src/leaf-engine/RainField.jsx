import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { WindController } from './WindController'
import { RainSimulation } from './RainSimulation'
import { createRainMaterial } from './rainMaterial'
import { makeAdaptive } from './quality'

// Cảnh mưa: 1 InstancedMesh các vệt mảnh (1 lệnh vẽ). Gió + vật lý mỗi khung.
export default function RainField({ speed = 50, sizeLevel = 50, preset = 'breeze', windDir = 'auto', swirl = 50, maxDrops = 280, variant = 'rain', stats }) {
  const { camera, size } = useThree()

  const rig = useMemo(() => {
    const geom = new THREE.PlaneGeometry(1, 1)
    const material = createRainMaterial(variant)
    const mesh = new THREE.InstancedMesh(geom, material, maxDrops)
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const alphaArray = new Float32Array(maxDrops)
    const alphaAttr = new THREE.InstancedBufferAttribute(alphaArray, 1)
    alphaAttr.setUsage(THREE.DynamicDrawUsage)
    geom.setAttribute('instanceAlpha', alphaAttr)

    const zero = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = 0; i < maxDrops; i++) mesh.setMatrixAt(i, zero)
    mesh.instanceMatrix.needsUpdate = true

    const wind = new WindController()
    const sim = new RainSimulation({ mesh, alphaArray, wind, max: maxDrops, variant })
    const adaptive = makeAdaptive(maxDrops)
    return { geom, material, mesh, alphaAttr, wind, sim, adaptive }
  }, [maxDrops, variant])

  useEffect(() => () => {
    rig.geom.dispose(); rig.material.dispose(); rig.mesh.dispose()
  }, [rig])

  // Thanh tốc độ: điều tiết cường độ mưa + gió nền (mưa hơi xiên theo gió)
  useEffect(() => {
    const s = Math.min(100, Math.max(0, Number(speed) || 0)) / 100
    rig.sim.setIntensity(0.5 + s * 1.2)   // 0.5 .. 1.7
    rig.wind.setBase(28 + s * 34)         // gió nhẹ, tăng theo tốc độ
  }, [rig, speed])
  useEffect(() => {
    const s = Math.min(100, Math.max(0, Number(sizeLevel) || 0)) / 100
    rig.sim.setSizeScale(0.6 + s * 0.8)   // 0.6 .. 1.4 (=1.0 tại 50)
  }, [rig, sizeLevel])
  useEffect(() => { rig.wind.setPreset(preset) }, [rig, preset]) // hướng/độ nhiễu theo preset
  useEffect(() => { rig.wind.setDirectionMode(windDir) }, [rig, windDir])
  useEffect(() => {
    const s = Math.min(100, Math.max(0, Number(swirl) || 0)) / 100
    rig.wind.setTurbulenceScale(0.3 + s * 1.5) // mưa xiên/loạn theo độ chao
  }, [rig, swirl])

  const tRef = useRef(0)

  useFrame((_, delta) => {
    const dt = Math.min(0.05, delta)
    tRef.current += dt
    const { wind, sim, adaptive, alphaAttr } = rig

    wind.update(dt)
    const fov = (camera.fov * Math.PI) / 180
    const aspect = size.width / Math.max(1, size.height)
    sim.setBounds(camera.position.z, fov, aspect)

    sim.update(dt, adaptive.cap, tRef.current)
    alphaAttr.needsUpdate = true

    adaptive.tick(delta * 1000)
    if (stats) stats.current.drops = sim.drops.filter((d) => d.active).length
  })

  return <primitive object={rig.mesh} />
}
