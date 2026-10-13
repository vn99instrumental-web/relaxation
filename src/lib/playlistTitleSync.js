export function collectPlaylistVideoIds(queue = [], playlists = []) {
  const ids = new Set()
  const collect = (track) => {
    if (track?.kind === 'video' && track.videoId) ids.add(track.videoId)
  }
  ;(queue || []).forEach(collect)
  ;(playlists || []).forEach((playlist) => (playlist.tracks || []).forEach(collect))
  return [...ids]
}

export function applyVideoTitles(tracks = [], titles = {}) {
  let updatedCount = 0
  const nextTracks = (tracks || []).map((track) => {
    if (track?.kind !== 'video' || !track.videoId) return track
    const title = typeof titles[track.videoId] === 'string' ? titles[track.videoId].trim() : ''
    if (!title || title === track.title) return track
    updatedCount += 1
    return { ...track, title }
  })
  return { tracks: updatedCount ? nextTracks : tracks, updatedCount }
}
