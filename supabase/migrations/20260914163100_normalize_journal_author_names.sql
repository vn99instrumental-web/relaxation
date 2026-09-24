-- Normalize the canonical display name used by the Journal.
update public.journal_allowed_users
set display_name = 'Dốc Nhà Làng'
where username_key = 'dốc nhà làng';

-- Historical messages used the older casing "Dốc nhà làng".
-- Keep one canonical author value so own messages align consistently.
update public.messages
set author = 'Dốc Nhà Làng'
where lower(trim(author)) = 'dốc nhà làng';
