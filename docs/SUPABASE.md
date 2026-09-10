# Lưu chat & playlist bằng Supabase

Tài liệu này mô tả cách dùng **Supabase** (miễn phí) làm nơi lưu chung cho
**nhật ký/chat** và **playlist** của 2 người, thay cho cách lưu offline hoặc
GitHub Gist hiện tại.

## 1. Cấu trúc dữ liệu (đã có sẵn trong `supabase/schema.sql`)

| Bảng | Dùng để | Cột chính |
|------|---------|-----------|
| `rooms` | 1 "phòng" = không gian chung của 2 người | `id` (mã phòng khó đoán), `name` |
| `messages` | nhật ký/chat | `room_id`, `author`, `body`, `created_at` |
| `playlists` | playlist đã lưu | `room_id`, `name`, `tracks` (JSON), `created_at` |

`tracks` lưu dạng JSON: `[{ "kind":"video", "videoId":"...", "title":"..." }]`
— khớp đúng với cấu trúc bài hát trong app nên đọc/ghi thẳng, không cần bảng phụ.

## 2. Các bước tạo (một lần, ~5 phút)

1. Vào https://supabase.com → tạo tài khoản → **New project** (chọn vùng gần, đặt mật khẩu DB).
2. Mở **SQL Editor → New query**, dán toàn bộ `supabase/schema.sql` → **Run**.
3. Vào **Project Settings → API**, copy 2 thứ:
   - **Project URL** (dạng `https://xxxx.supabase.co`)
   - **anon public key** (khóa công khai — an toàn để đặt trong web tĩnh; RLS mới là lớp bảo vệ dữ liệu)
4. Tạo 1 phòng: trong **Table editor → rooms → Insert**, đặt `id` = một mã khó đoán
   (ví dụ `mai-nam-2026-x7q`). Hai người dùng chung đúng mã này.

## 3. Bảo mật — chọn 1 trong 2

- **Đơn giản (không đăng nhập):** như trong `schema.sql`. Ai có `anon key` + đúng
  **mã phòng** thì đọc/ghi được. Mã phòng đóng vai "mật khẩu chung". Đủ cho nhật ký
  nhẹ nhàng, **không** dùng cho dữ liệu nhạy cảm.
- **Kín hơn (khuyến nghị nếu cần riêng tư thật):** bật **Supabase Auth** (đăng nhập
  bằng email magic-link), thêm bảng `room_members(room_id, user_id)`, rồi đổi policy
  RLS thành "chỉ thành viên của phòng mới đọc/ghi". Kín tuyệt đối nhưng thêm bước đăng nhập.

## 4. Realtime hay refresh mỗi 1 giờ?

### a) Realtime (khuyến nghị cho chat) — tin nhắn hiện ngay, không cần F5
- `schema.sql` đã bật realtime cho `messages` và `playlists`.
- Trong app, sau khi cài `@supabase/supabase-js`, đăng ký lắng nghe:

```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// nghe tin nhắn mới của đúng phòng
supabase
  .channel('room-messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${ROOM_ID}` },
    (payload) => addMessageToUI(payload.new))
  .subscribe()

// gửi tin
await supabase.from('messages').insert({ room_id: ROOM_ID, author: name, body: text })
```

### b) Refresh định kỳ (đơn giản, không cần realtime)
- Chỉ cần đọc lại theo chu kỳ:

```js
async function refresh() {
  const { data } = await supabase
    .from('messages').select('*')
    .eq('room_id', ROOM_ID).order('created_at')
  renderMessages(data)
}
setInterval(refresh, 60 * 60 * 1000) // mỗi 1 giờ
```

- 1 giờ là khá lâu cho "chat" (tin nhắn tới trễ tối đa 1 giờ). Với chat nên dùng
  **realtime**, hoặc nếu muốn nhẹ thì poll ngắn hơn (ví dụ mỗi 5–10 giây).
- Có thể **kết hợp**: realtime để tức thời + một lần `refresh()` mỗi giờ để đồng bộ
  lại phòng khi máy vừa mở/ngủ dậy.

## 5. Cần gì để tích hợp vào app này

1. `npm i @supabase/supabase-js`
2. Thêm `SUPABASE_URL` + `SUPABASE_ANON_KEY` (đặt trong `.env` với tiền tố `VITE_`,
   ví dụ `VITE_SUPABASE_URL=...`).
3. Viết `src/lib/supabase.js` tạo client; thêm hook `useSupabaseRoom` thay cho
   `useGistSync` (đọc/ghi `messages` + `playlists`, đăng ký realtime).
4. Chạy `schema.sql` trên Supabase, tạo 1 phòng, điền URL/key + mã phòng vào Cài đặt.

> Ghi chú: hiện app đang lưu **offline (localStorage)** và có tùy chọn **GitHub Gist**.
> Supabase là bản nâng cấp: nhanh hơn, realtime, và lưu được cả playlist chung.
