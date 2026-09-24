update public.journal_allowed_users
set is_admin = true
where username_key in ('dốc nhà làng', 'rừng thông')
  and enabled = true;
