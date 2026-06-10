-- Автопубликация проектов после истечения published_at (час модерации).
-- RPC вызывается с клиента при загрузке каталога и личного кабинета.

create or replace function public.promote_due_projects()
returns void
language sql
security definer
set search_path = public
as $$
  update public.projects
  set
    moderation_status = 'Принят',
    is_on_site = true,
    updated_at = now()
  where moderation_status = 'На модерации'
    and is_on_site = false
    and published_at is not null
    and published_at <= now();
$$;

grant execute on function public.promote_due_projects() to anon, authenticated;
