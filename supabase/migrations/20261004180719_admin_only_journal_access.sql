-- Only enabled administrators may open the shared journal.
drop function if exists public.check_journal_user(text);

create or replace function public.check_journal_user(p_username text)
returns table(allowed boolean, display_name text, is_admin boolean)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(j.enabled and j.is_admin, false) as allowed,
    case when j.enabled and j.is_admin then j.display_name else null end as display_name,
    coalesce(j.enabled and j.is_admin, false) as is_admin
  from (select 1) seed
  left join public.journal_allowed_users j
    on j.username_key = lower(trim(p_username))
   and j.enabled = true;
$$;

revoke all on function public.check_journal_user(text) from public;
grant execute on function public.check_journal_user(text) to anon, authenticated;
