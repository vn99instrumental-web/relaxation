-- Bring production schema in sync with fields already used by the web client.
alter table public.messages
  add column if not exists reactions jsonb not null default '{}'::jsonb;

alter table public.room_settings
  add column if not exists default_track jsonb;

create index if not exists messages_room_time_desc_idx
  on public.messages (room_id, created_at desc);

create index if not exists playlists_room_updated_idx
  on public.playlists (room_id, updated_at desc);
