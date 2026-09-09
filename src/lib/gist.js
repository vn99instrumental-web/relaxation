// Dùng GitHub Gist làm "kho lưu chung" miễn phí cho cuốn nhật ký 2 người.
//
// Cách hoạt động:
//  - Mỗi phòng = 1 Gist bí mật, trong đó có 1 file journal.json chứa mảng tin nhắn.
//  - 2 người cùng dùng chung 1 Gist ID + 1 token (có quyền "gist") để đọc/ghi.
//  - Token chỉ nằm trong trình duyệt (localStorage), chỉ gửi tới api.github.com.
//
// LƯU Ý BẢO MẬT: token là "chìa khóa" tài khoản của bạn ở phạm vi gist. Hãy tạo
// token loại fine-grained hoặc classic CHỈ có quyền gist, và đừng chia sẻ công khai.

const API = 'https://api.github.com'
const FILE = 'journal.json'

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function asError(res) {
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.message || ''
  } catch {
    /* ignore */
  }
  const err = new Error(detail || `GitHub API lỗi ${res.status}`)
  err.status = res.status
  return err
}

// Tạo một Gist bí mật mới, trả về gistId.
export async function createGist(token, roomName = 'Vibe Space Journal') {
  const res = await fetch(`${API}/gists`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      description: `📓 ${roomName} — Vibe Space (nhật ký chung)`,
      public: false,
      files: {
        [FILE]: {
          content: JSON.stringify({ room: roomName, messages: [] }, null, 2),
        },
      },
    }),
  })
  if (!res.ok) throw await asError(res)
  const data = await res.json()
  return data.id
}

// Đọc toàn bộ tin nhắn từ Gist.
export async function readMessages(token, gistId) {
  const res = await fetch(`${API}/gists/${gistId}`, {
    headers: headers(token),
    // luôn lấy bản mới nhất
    cache: 'no-store',
  })
  if (!res.ok) throw await asError(res)
  const data = await res.json()
  const file = data.files?.[FILE]
  if (!file) return { messages: [], room: data.description || '' }

  let content = file.content
  // Gist rất lớn (>1MB) trả truncated=true và cần tải qua raw_url.
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url, { cache: 'no-store' })
    content = await rawRes.text()
  }
  try {
    const parsed = JSON.parse(content)
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      room: parsed.room || '',
    }
  } catch {
    return { messages: [], room: '' }
  }
}

// Ghi đè toàn bộ danh sách tin nhắn lên Gist.
export async function writeMessages(token, gistId, messages, roomName) {
  const res = await fetch(`${API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({
      files: {
        [FILE]: {
          content: JSON.stringify(
            { room: roomName || 'Vibe Space Journal', messages },
            null,
            2,
          ),
        },
      },
    }),
  })
  if (!res.ok) throw await asError(res)
  return true
}

// Gộp 2 danh sách tin nhắn theo id (chống mất tin khi 2 người ghi gần nhau),
// rồi sắp xếp theo thời gian.
export function mergeMessages(a = [], b = []) {
  const map = new Map()
  for (const m of [...a, ...b]) {
    if (m && m.id) map.set(m.id, m)
  }
  return [...map.values()].sort((x, y) => (x.ts || 0) - (y.ts || 0))
}
