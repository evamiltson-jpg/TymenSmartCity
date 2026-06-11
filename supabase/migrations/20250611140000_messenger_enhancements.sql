-- Migration: hidden chats, direct messages, leave project membership

create table if not exists public.user_hidden_project_chats (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null,
  hidden_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

alter table public.user_hidden_project_chats enable row level security;

drop policy if exists "Users manage hidden project chats" on public.user_hidden_project_chats;
create policy "Users manage hidden project chats"
  on public.user_hidden_project_chats
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, delete on public.user_hidden_project_chats to authenticated;
grant all on public.user_hidden_project_chats to service_role;

create table if not exists public.user_hidden_direct_chats (
  user_id uuid not null references auth.users(id) on delete cascade,
  peer_user_id uuid not null references auth.users(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, peer_user_id)
);

alter table public.user_hidden_direct_chats enable row level security;

drop policy if exists "Users manage hidden direct chats" on public.user_hidden_direct_chats;
create policy "Users manage hidden direct chats"
  on public.user_hidden_direct_chats
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, delete on public.user_hidden_direct_chats to authenticated;
grant all on public.user_hidden_direct_chats to service_role;

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists idx_direct_messages_pair
  on public.direct_messages (sender_id, recipient_id, created_at asc);

create index if not exists idx_direct_messages_recipient_unread
  on public.direct_messages (recipient_id, is_read, created_at desc);

alter table public.direct_messages enable row level security;

drop policy if exists "Users read own direct messages" on public.direct_messages;
create policy "Users read own direct messages"
  on public.direct_messages
  for select
  to authenticated
  using (
    sender_id = (select auth.uid())
    or recipient_id = (select auth.uid())
  );

drop policy if exists "Users send direct messages" on public.direct_messages;
create policy "Users send direct messages"
  on public.direct_messages
  for insert
  to authenticated
  with check (sender_id = (select auth.uid()));

drop policy if exists "Recipients mark direct messages read" on public.direct_messages;
create policy "Recipients mark direct messages read"
  on public.direct_messages
  for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

grant select, insert, update on public.direct_messages to authenticated;
grant all on public.direct_messages to service_role;

-- Members may leave a project they joined (delete accepted application)
drop policy if exists "Members can leave accepted projects" on public.user_applications;
create policy "Members can leave accepted projects"
  on public.user_applications
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'accepted'
  );

-- Block self-application at DB level when project has an owner
create or replace function public.block_self_project_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select p.created_by into owner_id
  from public.projects p
  where new.project_id is not null
    and p.id::text = new.project_id
    and p.created_by is not null
  limit 1;

  if owner_id is null then
    select p.created_by into owner_id
    from public.projects p
    where p.title = new.project_title
      and p.created_by is not null
    order by p.created_at desc
    limit 1;
  end if;

  if owner_id is not null and owner_id = new.user_id then
    raise exception 'Автор проекта не может подать заявку на свой проект';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_block_self_application on public.user_applications;
create trigger trg_block_self_application
  before insert on public.user_applications
  for each row
  execute function public.block_self_project_application();
