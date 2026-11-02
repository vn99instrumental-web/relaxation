export function isPhoneLikeDevice(overrides = {}) {
  try {
    const width = overrides.width ?? window.innerWidth
    const height = overrides.height ?? window.innerHeight
    const coarsePointer = overrides.coarsePointer ?? window.matchMedia('(pointer: coarse)').matches
    const maxTouchPoints = overrides.maxTouchPoints ?? navigator.maxTouchPoints ?? 0
    return Math.min(width, height) < 620 && (coarsePointer || maxTouchPoints > 0)
  } catch {
    return false
  }
}
