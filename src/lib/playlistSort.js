export function trackAddedTime(track, fallback = 0) {
  const numeric = Number(track?.addedAt)
  if (Number.isFinite(numeric) && numeric > 0) return numeric
  const parsed = Date.parse(track?.addedAt)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function sortTracksNewest(tracks) {
  return (tracks || []).map((track, originalIndex) => ({ track, originalIndex }))
    .sort((a, b) => trackAddedTime(b.track, b.originalIndex) - trackAddedTime(a.track, a.originalIndex))
}

export function queueIndexesBySort(tracks, mode = 'latest', randomSeed = 0) {
  return (tracks || []).map((track, queueIndex) => ({ track, queueIndex }))
    .sort((a, b) => {
      if (mode === 'name') {
        const byName = (a.track?.title || 'Video').localeCompare(b.track?.title || 'Video', 'vi', { sensitivity: 'base', numeric: true })
        return byName || trackAddedTime(b.track, b.queueIndex) - trackAddedTime(a.track, a.queueIndex)
      }
      if (mode === 'random') return seededTrackRank(a, randomSeed) - seededTrackRank(b, randomSeed)
      return trackAddedTime(b.track, b.queueIndex) - trackAddedTime(a.track, a.queueIndex)
    }).map(({ queueIndex }) => queueIndex)
}

function seededTrackRank({ track, queueIndex }, seed) {
  const identity = `${seed}:${track?.key || track?.recordId || track?.videoId || track?.playlistId || track?.title || ''}:${queueIndex}`
  let hash = 2166136261
  for (let index = 0; index < identity.length; index += 1) { hash ^= identity.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return hash >>> 0
}
