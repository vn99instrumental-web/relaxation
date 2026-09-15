// Tiện ích bóc tách link YouTube — không cần API key.
// Hỗ trợ: link video lẻ, link video kèm playlist, link playlist thuần.

const VIDEO_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']

export function parseYouTube(input) {
  if (!input) return null
  const raw = String(input).trim()

  // Trường hợp người dùng dán thẳng ID video (11 ký tự) hoặc ID playlist (bắt đầu bằng PL, OLAK, RD...)
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return { type: 'video', videoId: raw, raw }
  }
  if (/^(PL|OLAK5uy_|RD|UU|FL|LL)[a-zA-Z0-9_-]{5,}$/.test(raw)) {
    return { type: 'playlist', playlistId: raw, raw }
  }

  let url
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')
  if (!VIDEO_HOSTS.includes(url.hostname) && !VIDEO_HOSTS.includes(host)) {
    return null
  }

  const listId = url.searchParams.get('list')

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    if (id) return { type: 'video', videoId: id, playlistId: listId || undefined, raw }
  }

  // /watch?v=<id>
  const v = url.searchParams.get('v')
  if (v) return { type: 'video', videoId: v, playlistId: listId || undefined, raw }

  // /embed/<id> , /shorts/<id> , /live/<id>
  const m = url.pathname.match(/\/(embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/)
  if (m) return { type: 'video', videoId: m[2], playlistId: listId || undefined, raw }

  // /playlist?list=<id> hoặc bất kỳ link nào chỉ có list
  if (listId) return { type: 'playlist', playlistId: listId, raw }

  return null
}

export function videoThumb(videoId, quality = 'hqdefault') {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`
}

// Lấy TÊN bài từ endpoint oEmbed công khai của YouTube (không cần API key, có
// CORS). Dùng để hiện tên ngay khi thêm bài, không phải chờ phát. Lỗi/không lấy
// được -> trả '' (app tự quay về cách cũ: lấy tên khi phát).
export async function fetchVideoTitle(videoId, signal) {
  if (!videoId) return ''
  try {
    const src = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    const res = await fetch(src, { signal })
    if (!res.ok) return ''
    const data = await res.json()
    return typeof data?.title === 'string' ? data.title.trim() : ''
  } catch { return '' }
}

// Tên hiển thị của một bài: ưu tiên tên đã lưu trong bài, rồi tới tên trong
// bộ nhớ đệm (theo videoId). Trả '' nếu chưa biết -> nơi gọi tự thêm chữ tạm.
export function trackName(track, titles) {
  if (!track) return ''
  if (track.title) return track.title
  if (track.kind === 'video' && track.videoId && titles && titles[track.videoId]) return titles[track.videoId]
  return ''
}

export function shortId(id) {
  if (!id) return ''
  return id.length > 10 ? id.slice(0, 6) + '…' : id
}
