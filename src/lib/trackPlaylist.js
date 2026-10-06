function sameTrack(a, b) {
  if (!a || !b || a.kind !== b.kind) return false
  return a.kind === 'playlist' ? a.playlistId === b.playlistId : a.videoId === b.videoId
}

export function playlistNameForTrack(track, playlists = []) {
  if (!track) return ''

  if (track.sourcePlaylistId) {
    const source = playlists.find((playlist) => playlist.id === track.sourcePlaylistId)
    return source?.name || track.sourcePlaylistName || ''
  }

  const containingPlaylist = playlists.find((playlist) =>
    (playlist.tracks || []).some((candidate) => sameTrack(candidate, track)))
  if (containingPlaylist?.name) return containingPlaylist.name

  return track.kind === 'playlist' ? (track.title || 'Playlist YouTube') : ''
}
