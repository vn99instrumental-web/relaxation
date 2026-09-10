-- ============================================================
-- Vibe Space — Supabase schema (chat/nhật ký + playlist)
-- Chạy trong Supabase → SQL Editor → New query → Run.
-- ============================================================

-- 1) PHÒNG: mỗi phòng là một không gian chung cho 2 người.
--    id = mã phòng tự đặt, khó đoán (đóng vai "mật khẩu chung"),
--    ví dụ 'mai-nam-2026-x7q'.
create table if not exists public.rooms (
  id          text primary key,
  name        text,
  created_at  timestamptz not null default now()
);

-- 2) NHẬT KÝ / CHAT
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     text not null references public.rooms(id) on delete cascade,
  author      text not null,          -- tên người gõ (nhập mỗi buổi)
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists messages_room_time_idx
  on public.messages (room_id, created_at);

-- 3) PLAYLIST (các bài lưu dạng JSON cho gọn)
--    tracks = [{ "kind":"video", "videoId":"...", "title":"..." }, ...]
create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  room_id     text not null references public.rooms(id) on delete cascade,
  name        text not null,
  tracks      jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists playlists_room_time_idx
  on public.playlists (room_id, created_at desc);

-- ============================================================
-- BẢO MẬT (RLS)
-- ------------------------------------------------------------
-- Bản đơn giản cho app 2 người KHÔNG đăng nhập: bật RLS rồi cho
-- phép anon đọc/ghi. Quyền riêng tư dựa vào "mã phòng khó đoán".
-- Đủ dùng cho nhật ký cá nhân nhẹ nhàng; KHÔNG dùng cho dữ liệu
-- nhạy cảm. Muốn thật kín thì dùng Supabase Auth (xem SUPABASE.md).
-- ============================================================
alter table public.rooms      enable row level security;
alter table public.messages   enable row level security;
alter table public.playlists  enable row level security;

-- Cho phép anon thao tác (mã phòng đóng vai mật khẩu).
create policy "anon rooms"      on public.rooms      for all to anon using (true) with check (true);
create policy "anon messages"   on public.messages   for all to anon using (true) with check (true);
create policy "anon playlists"  on public.playlists  for all to anon using (true) with check (true);

-- QUYỀN BẢNG: RLS chỉ lọc dòng, vẫn cần GRANT thì client (anon) mới truy cập được.
-- (Nếu thiếu bước này sẽ gặp lỗi "permission denied for schema public".)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.rooms, public.messages, public.playlists to anon, authenticated;

-- ============================================================
-- REALTIME: đẩy tin nhắn/playlist mới xuống ngay (không cần refresh)
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.playlists;

-- ============================================================
-- THƯ VIỆN ẢNH NỀN DÙNG CHUNG (Storage + bảng backgrounds)
-- ============================================================
insert into storage.buckets (id, name, public) values ('backgrounds','backgrounds',true)
  on conflict (id) do nothing;

drop policy if exists "bg read"   on storage.objects;
drop policy if exists "bg insert" on storage.objects;
drop policy if exists "bg update" on storage.objects;
drop policy if exists "bg delete" on storage.objects;
create policy "bg read"   on storage.objects for select to anon using (bucket_id = 'backgrounds');
create policy "bg insert" on storage.objects for insert to anon with check (bucket_id = 'backgrounds');
create policy "bg update" on storage.objects for update to anon using (bucket_id = 'backgrounds') with check (bucket_id = 'backgrounds');
create policy "bg delete" on storage.objects for delete to anon using (bucket_id = 'backgrounds');

create table if not exists public.backgrounds (
  id text primary key, room_id text not null, label text not null,
  url text not null default '', path text, sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists backgrounds_room_idx on public.backgrounds (room_id, sort, created_at);
alter table public.backgrounds enable row level security;
drop policy if exists "anon backgrounds" on public.backgrounds;
create policy "anon backgrounds" on public.backgrounds for all to anon using (true) with check (true);
grant select, insert, update, delete on public.backgrounds to anon, authenticated;
alter table public.backgrounds replica identity full;
do $$ begin begin execute 'alter publication supabase_realtime add table public.backgrounds'; exception when duplicate_object then null; end; end $$;
