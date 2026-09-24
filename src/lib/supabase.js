import { createClient } from '@supabase/supabase-js'

const clients = new Map()

// Tạo client Supabase từ URL + anon key (do người dùng dán trong Cài đặt).
// anon key là khóa CÔNG KHAI, an toàn để ở web tĩnh; RLS mới là lớp bảo vệ dữ liệu.
export function makeClient(url, key) {
  if (!url || !key) return null
  const cacheKey = `${url}\u0000${key}`
  if (clients.has(cacheKey)) return clients.get(cacheKey)
  const client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 5 } },
  })
  clients.set(cacheKey, client)
  return client
}
