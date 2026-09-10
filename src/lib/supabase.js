import { createClient } from '@supabase/supabase-js'

// Tạo client Supabase từ URL + anon key (do người dùng dán trong Cài đặt).
// anon key là khóa CÔNG KHAI, an toàn để ở web tĩnh; RLS mới là lớp bảo vệ dữ liệu.
export function makeClient(url, key) {
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 5 } },
  })
}
