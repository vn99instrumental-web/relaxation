const BACKUP_FORMAT = 'duoi-tan-thong.playlists'
const BACKUP_VERSION = 1
const MAX_PLAYLISTS = 500
const MAX_TRACKS_PER_PLAYLIST = 5000

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

function portableBackupTrack(track) {
  if (!track || typeof track !== 'object') return null
  const kind = track.kind === 'playlist' ? 'playlist' : 'video'
  const mediaId = cleanText(kind === 'playlist' ? track.playlistId : track.videoId, 160)
  if (!mediaId) return null

  const next = {
    kind,
    ...(kind === 'playlist' ? { playlistId: mediaId } : { videoId: mediaId }),
  }
  const title = cleanText(track.title, 500)
  const recordId = cleanText(track.recordId, 160)
  const addedAt = Number(track.addedAt)
  if (title) next.title = title
  if (recordId) next.recordId = recordId
  if (Number.isFinite(addedAt) && addedAt > 0) next.addedAt = addedAt
  return next
}

function normalizePlaylist(playlist, index) {
  if (!playlist || typeof playlist !== 'object') throw new Error(`Playlist thứ ${index + 1} không hợp lệ.`)
  const sourceTracks = Array.isArray(playlist.tracks) ? playlist.tracks : []
  if (sourceTracks.length > MAX_TRACKS_PER_PLAYLIST) {
    throw new Error(`Playlist “${cleanText(playlist.name, 120) || index + 1}” có quá nhiều bài.`)
  }
  const tracks = sourceTracks.map(portableBackupTrack).filter(Boolean)
  return {
    name: cleanText(playlist.name, 120) || `Playlist nhập ${index + 1}`,
    tracks,
  }
}

export function createPlaylistBackup(playlists) {
  const safePlaylists = (Array.isArray(playlists) ? playlists : [])
    .slice(0, MAX_PLAYLISTS)
    .map(normalizePlaylist)
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    playlists: safePlaylists,
  }
}

export function parsePlaylistBackup(value) {
  let payload = value
  if (typeof value === 'string') {
    try { payload = JSON.parse(value) } catch { throw new Error('Tệp backup không phải JSON hợp lệ.') }
  }

  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.playlists)
      ? payload.playlists
      : payload?.tracks
        ? [payload]
        : null

  if (!source) throw new Error('Không tìm thấy dữ liệu playlist trong tệp backup.')
  if (!source.length) throw new Error('Tệp backup không có playlist nào để khôi phục.')
  if (payload?.format && payload.format !== BACKUP_FORMAT) throw new Error('Tệp này không phải backup playlist của Dưới Tán Thông.')
  if (Number(payload?.version || 1) > BACKUP_VERSION) throw new Error('Tệp backup được tạo bởi phiên bản mới hơn.')
  if (source.length > MAX_PLAYLISTS) throw new Error(`Tệp backup vượt quá ${MAX_PLAYLISTS} playlist.`)

  return source.map(normalizePlaylist)
}
