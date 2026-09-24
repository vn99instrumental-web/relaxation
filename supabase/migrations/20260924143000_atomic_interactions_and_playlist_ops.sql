-- Normalize shared interactions so concurrent clients no longer overwrite JSON blobs.
create table if not exists public.poem_interactions (
  id uuid primary key default gen_random_uuid(),
  poem_id uuid not null references public.poems(id) on delete cascade,
  room_id text not null,
  author text not null,
  body text,
  reaction text,
  created_at timestamptz not null default now(),
  constraint poem_interactions_kind check (
    (body is not null and reaction is null) or
    (body is null and reaction is not null)
  )
);

create index if not exists poem_interactions_poem_time_idx
  on public.poem_interactions (poem_id, created_at);
create unique index if not exists poem_interactions_unique_reaction_idx
  on public.poem_interactions (poem_id, author, reaction)
  where reaction is not null;

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  room_id text not null,
  emoji text not null,
  author text not null,
  created_at timestamptz not null default now(),
  constraint message_reactions_emoji check (char_length(emoji) between 1 and 16)
);

create index if not exists message_reactions_message_time_idx
  on public.message_reactions (message_id, created_at);
create unique index if not exists message_reactions_unique_idx
  on public.message_reactions (message_id, emoji, author);

-- Preserve all legacy interactions before clients start reading normalized rows.
insert into public.poem_interactions (poem_id, room_id, author, body, reaction, created_at)
select p.id, p.room_id,
       coalesce(nullif(item->>'author', ''), 'Ẩn danh'),
       case when item->>'type' = 'reaction' then null else nullif(item->>'text', '') end,
       case when item->>'type' = 'reaction' then nullif(item->>'emoji', '') else null end,
       case when coalesce(item->>'ts', '') ~ '^[0-9]+$'
         then to_timestamp((item->>'ts')::double precision / 1000.0)
         else p.created_at end
from public.poems p
cross join lateral jsonb_array_elements(coalesce(p.comments, '[]'::jsonb)) item
where (item->>'type' = 'reaction' and nullif(item->>'emoji', '') is not null)
   or (coalesce(item->>'type', '') <> 'reaction' and nullif(item->>'text', '') is not null)
on conflict do nothing;

insert into public.message_reactions (message_id, room_id, emoji, author, created_at)
select m.id, m.room_id, pairs.key, names.value, m.created_at
from public.messages m
cross join lateral jsonb_each(coalesce(m.reactions, '{}'::jsonb)) pairs
cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(pairs.value) = 'array' then pairs.value else '[]'::jsonb end
) names(value)
where nullif(pairs.key, '') is not null and nullif(names.value, '') is not null
on conflict do nothing;

alter table public.poem_interactions enable row level security;
alter table public.message_reactions enable row level security;
drop policy if exists "anon poem interactions" on public.poem_interactions;
create policy "anon poem interactions" on public.poem_interactions
  for all to anon using (true) with check (true);
drop policy if exists "anon message reactions" on public.message_reactions;
create policy "anon message reactions" on public.message_reactions
  for all to anon using (true) with check (true);
grant select, insert, update, delete on public.poem_interactions, public.message_reactions to anon, authenticated;

alter table public.poem_interactions replica identity full;
alter table public.message_reactions replica identity full;
do $$ begin
  begin execute 'alter publication supabase_realtime add table public.poem_interactions'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.message_reactions'; exception when duplicate_object then null; end;
end $$;

create or replace function public.toggle_poem_reaction(
  p_poem_id uuid, p_room_id text, p_reaction text, p_author text
) returns boolean language plpgsql security invoker set search_path = public as $$
declare removed integer;
begin
  delete from public.poem_interactions
   where poem_id = p_poem_id and reaction = p_reaction and author = p_author;
  get diagnostics removed = row_count;
  if removed > 0 then return false; end if;
  insert into public.poem_interactions (poem_id, room_id, author, reaction)
  values (p_poem_id, p_room_id, p_author, p_reaction)
  on conflict do nothing;
  return true;
end $$;

create or replace function public.toggle_message_reaction(
  p_message_id uuid, p_room_id text, p_emoji text, p_author text
) returns boolean language plpgsql security invoker set search_path = public as $$
declare removed integer;
begin
  delete from public.message_reactions
   where message_id = p_message_id and emoji = p_emoji and author = p_author;
  get diagnostics removed = row_count;
  if removed > 0 then return false; end if;
  insert into public.message_reactions (message_id, room_id, emoji, author)
  values (p_message_id, p_room_id, p_emoji, p_author)
  on conflict do nothing;
  return true;
end $$;

create or replace function public.move_playlist_track(
  p_room_id text, p_source_id uuid, p_source_index integer, p_target_id uuid
) returns void language plpgsql security invoker set search_path = public as $$
declare source_tracks jsonb; target_tracks jsonb; moved jsonb;
begin
  if p_source_id = p_target_id or p_source_index < 0 then return; end if;
  select tracks into source_tracks from public.playlists
   where id = p_source_id and room_id = p_room_id for update;
  select tracks into target_tracks from public.playlists
   where id = p_target_id and room_id = p_room_id for update;
  if source_tracks is null or target_tracks is null or p_source_index >= jsonb_array_length(source_tracks) then
    raise exception 'Playlist or track not found';
  end if;
  moved := source_tracks -> p_source_index;
  moved := jsonb_set(moved, '{addedAt}', to_jsonb((extract(epoch from clock_timestamp()) * 1000)::bigint), true);
  update public.playlists set tracks = source_tracks #- array[p_source_index::text], updated_at = now()
   where id = p_source_id and room_id = p_room_id;
  update public.playlists set tracks = target_tracks || jsonb_build_array(moved), updated_at = now()
   where id = p_target_id and room_id = p_room_id;
end $$;

create or replace function public.import_room_playlists(
  p_room_id text, p_playlists jsonb, p_replace boolean default false
) returns integer language plpgsql security invoker set search_path = public as $$
declare inserted integer := 0;
begin
  if jsonb_typeof(p_playlists) <> 'array' then raise exception 'Invalid playlist payload'; end if;
  if p_replace then delete from public.playlists where room_id = p_room_id; end if;
  insert into public.playlists (room_id, name, tracks)
  select p_room_id, left(coalesce(nullif(item->>'name', ''), 'Playlist'), 160),
         case when jsonb_typeof(item->'tracks') = 'array' then item->'tracks' else '[]'::jsonb end
  from jsonb_array_elements(p_playlists) item;
  get diagnostics inserted = row_count;
  return inserted;
end $$;

grant execute on function public.toggle_poem_reaction(uuid, text, text, text) to anon, authenticated;
grant execute on function public.toggle_message_reaction(uuid, text, text, text) to anon, authenticated;
grant execute on function public.move_playlist_track(text, uuid, integer, uuid) to anon, authenticated;
grant execute on function public.import_room_playlists(text, jsonb, boolean) to anon, authenticated;
