-- Migration: application messages, site notifications, project chat, contact info
-- Purpose: enrich applications flow, notify owners/applicants, enable project messaging

-- Applicant message on join request
alter table public.user_applications
  add column if not exists message text;

-- Public messengers / social contacts (no phone numbers — enforced in UI)
alter table public.user_profiles
  add column if not exists contact_info text;

comment on column public.user_profiles.contact_info is
  'Telegram, Discord, VK etc. Phone numbers discouraged in the client UI.';

-- In-app notifications
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type varchar(50) not null,
  title varchar(255) not null,
  body text,
  link_payload jsonb not null default '{}'::jsonb,
  related_application_id uuid references public.user_applications(id) on delete set null,
  related_project_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_unread
  on public.user_notifications (user_id, is_read, created_at desc);

alter table public.user_notifications enable row level security;

drop policy if exists "Users read own notifications" on public.user_notifications;
create policy "Users read own notifications"
  on public.user_notifications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users update own notifications" on public.user_notifications;
create policy "Users update own notifications"
  on public.user_notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, update on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;

-- Project team chat (owner + accepted members)
create table if not exists public.project_chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_project_chat_messages_project
  on public.project_chat_messages (project_id, created_at asc);

alter table public.project_chat_messages enable row level security;

create or replace function public.is_project_chat_participant(p_project_id text, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id::text = p_project_id
      and p.created_by = p_user_id
  )
  or exists (
    select 1
    from public.user_applications ua
    where ua.project_id = p_project_id
      and ua.user_id = p_user_id
      and ua.status = 'accepted'
  );
$$;

grant execute on function public.is_project_chat_participant(text, uuid) to authenticated;

drop policy if exists "Chat participants read messages" on public.project_chat_messages;
create policy "Chat participants read messages"
  on public.project_chat_messages
  for select
  to authenticated
  using (
    public.is_project_chat_participant(project_id, (select auth.uid()))
  );

drop policy if exists "Chat participants send messages" on public.project_chat_messages;
create policy "Chat participants send messages"
  on public.project_chat_messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_project_chat_participant(project_id, (select auth.uid()))
  );

grant select, insert on public.project_chat_messages to authenticated;
grant all on public.project_chat_messages to service_role;

-- Project owners can see and review incoming applications
drop policy if exists "Project owners can read applications" on public.user_applications;
create policy "Project owners can read applications"
  on public.user_applications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.created_by = (select auth.uid())
        and (
          (user_applications.project_id is not null and p.id::text = user_applications.project_id)
          or user_applications.project_title = p.title
        )
    )
  );

drop policy if exists "Project owners can review applications" on public.user_applications;
create policy "Project owners can review applications"
  on public.user_applications
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.created_by = (select auth.uid())
        and (
          (user_applications.project_id is not null and p.id::text = user_applications.project_id)
          or user_applications.project_title = p.title
        )
    )
  )
  with check (status in ('pending', 'accepted', 'rejected'));

grant update on public.user_applications to authenticated;

-- Owners may read applicant profiles for their project applications
drop policy if exists "Project owners can read applicant profiles" on public.user_profiles;
create policy "Project owners can read applicant profiles"
  on public.user_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_applications ua
      inner join public.projects p on (
        (ua.project_id is not null and p.id::text = ua.project_id)
        or ua.project_title = p.title
      )
      where p.created_by = (select auth.uid())
        and ua.user_id = user_profiles.id
    )
  );

-- Chat participants can read each other's basic profile (name, contacts, avatar)
drop policy if exists "Chat peers can read profiles" on public.user_profiles;
create policy "Chat peers can read profiles"
  on public.user_profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.project_chat_messages m1
      inner join public.project_chat_messages m2
        on m1.project_id = m2.project_id
      where m1.sender_id = (select auth.uid())
        and m2.sender_id = user_profiles.id
        and m2.sender_id <> (select auth.uid())
    )
    or exists (
      select 1
      from public.projects p
      inner join public.user_applications ua
        on ua.project_id = p.id::text
        and ua.status = 'accepted'
      where p.created_by = (select auth.uid())
        and ua.user_id = user_profiles.id
    )
    or exists (
      select 1
      from public.user_applications ua
      inner join public.projects p
        on ua.project_id = p.id::text
        and p.created_by = user_profiles.id
      where ua.user_id = (select auth.uid())
        and ua.status = 'accepted'
    )
  );

-- Notification triggers on application lifecycle
create or replace function public.handle_application_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
  applicant_label text;
begin
  if tg_op = 'INSERT' then
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

    if owner_id is not null and owner_id <> new.user_id then
      select coalesce(nullif(trim(full_name), ''), email, 'Участник')
      into applicant_label
      from public.user_profiles
      where id = new.user_id;

      insert into public.user_notifications (
        user_id, type, title, body, link_payload, related_application_id, related_project_id
      ) values (
        owner_id,
        'application_received',
        'Новая заявка в проект',
        applicant_label || ' хочет присоединиться к «' || new.project_title || '»',
        jsonb_build_object('tab', 'incoming'),
        new.id,
        new.project_id
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status in ('accepted', 'rejected')
  then
    insert into public.user_notifications (
      user_id, type, title, body, link_payload, related_application_id, related_project_id
    ) values (
      new.user_id,
      case when new.status = 'accepted' then 'application_accepted' else 'application_rejected' end,
      case when new.status = 'accepted' then 'Заявка принята' else 'Заявка отклонена' end,
      'Проект «' || new.project_title || '»: '
        || case
          when new.status = 'accepted' then 'вы приняты в команду! Откройте «Сообщения» для связи с автором.'
          else 'к сожалению, заявка отклонена.'
        end,
      jsonb_build_object('tab', 'applications'),
      new.id,
      new.project_id
    );

    new.reviewed_at = coalesce(new.reviewed_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_application_notification on public.user_applications;
create trigger trg_application_notification
  after insert or update on public.user_applications
  for each row
  execute function public.handle_application_notification();
