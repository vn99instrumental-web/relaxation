create table if not exists public.journal_allowed_users (
  username_key text primary key,
  display_name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.journal_allowed_users enable row level security;
revoke all on table public.journal_allowed_users from anon, authenticated;

insert into public.journal_allowed_users (username_key, display_name, enabled)
values
  ('rt', 'RT', true),
  ('rừng thông', 'Rừng Thông', true),
  ('dốc nhà làng', 'Dốc Nhà Làng', true)
on conflict (username_key) do update
set display_name = excluded.display_name,
    enabled = excluded.enabled;

create or replace function public.check_journal_user(p_username text)
returns table(allowed boolean, display_name text)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(j.enabled, false) as allowed,
    case when j.enabled then j.display_name else null end as display_name
  from (select 1) seed
  left join public.journal_allowed_users j
    on j.username_key = lower(trim(p_username))
   and j.enabled = true;
$$;

revoke all on function public.check_journal_user(text) from public;
grant execute on function public.check_journal_user(text) to anon, authenticated;
