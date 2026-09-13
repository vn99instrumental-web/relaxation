-- Mở rộng cài đặt chung để thiết bị admin làm mặc định cho mọi người trong phòng.
alter table public.room_settings
  add column if not exists fx_modes jsonb,
  add column if not exists fx_speed smallint,
  add column if not exists fx_density smallint,
  add column if not exists fx_size smallint,
  add column if not exists fx_preset text,
  add column if not exists fx_wind_dir text,
  add column if not exists fx_swirl smallint,
  add column if not exists yt_volume smallint,
  add column if not exists autoplay boolean;
