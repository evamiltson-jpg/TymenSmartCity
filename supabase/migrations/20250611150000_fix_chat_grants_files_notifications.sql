-- Fix chat hidden-table grants (upsert needs UPDATE), attachments, storage, message notifications

-- upsert on hidden chats requires UPDATE, not only INSERT
grant update on public.user_hidden_project_chats to authenticated;
grant update on public.user_hidden_direct_chats to authenticated;

drop policy if exists "Users manage hidden project chats" on public.user_hidden_project_chats;
drop policy if exists "Users read hidden project chats" on public.user_hidden_project_chats;
drop policy if exists "Users insert hidden project chats" on public.user_hidden_project_chats;
drop policy if exists "Users update hidden project chats" on public.user_hidden_project_chats;
drop policy if exists "Users delete hidden project chats" on public.user_hidden_project_chats;

create policy "Users read hidden project chats"
  on public.user_hidden_project_chats for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert hidden project chats"
  on public.user_hidden_project_chats for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update hidden project chats"
  on public.user_hidden_project_chats for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete hidden project chats"
  on public.user_hidden_project_chats for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users manage hidden direct chats" on public.user_hidden_direct_chats;
drop policy if exists "Users read hidden direct chats" on public.user_hidden_direct_chats;
drop policy if exists "Users insert hidden direct chats" on public.user_hidden_direct_chats;
drop policy if exists "Users update hidden direct chats" on public.user_hidden_direct_chats;
drop policy if exists "Users delete hidden direct chats" on public.user_hidden_direct_chats;

create policy "Users read hidden direct chats"
  on public.user_hidden_direct_chats for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert hidden direct chats"
  on public.user_hidden_direct_chats for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update hidden direct chats"
  on public.user_hidden_direct_chats for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete hidden direct chats"
  on public.user_hidden_direct_chats for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Message attachments
alter table public.project_chat_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text;

alter table public.direct_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text;

alter table public.project_chat_messages
  drop constraint if exists project_chat_messages_body_check;

alter table public.project_chat_messages
  add constraint project_chat_messages_body_or_attachment
  check (char_length(trim(body)) > 0 or attachment_path is not null);

alter table public.direct_messages
  drop constraint if exists direct_messages_body_check;

alter table public.direct_messages
  add constraint direct_messages_body_or_attachment
  check (char_length(trim(body)) > 0 or attachment_path is not null);

-- Private bucket for encrypted chat files (max 5 MB, images + PDF)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  5242880,
  array['application/octet-stream', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Chat participants upload project files" on storage.objects;
create policy "Chat participants upload project files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'project'
    and public.is_project_chat_participant((storage.foldername(name))[2], (select auth.uid()))
    and (storage.foldername(name))[3] = (select auth.uid())::text
  );

drop policy if exists "Chat participants read project files" on storage.objects;
create policy "Chat participants read project files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'project'
    and public.is_project_chat_participant((storage.foldername(name))[2], (select auth.uid()))
  );

drop policy if exists "Chat participants upload direct files" on storage.objects;
create policy "Chat participants upload direct files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'direct'
    and (storage.foldername(name))[3] = (select auth.uid())::text
    and (
      (storage.foldername(name))[2] like '%\_' || (select auth.uid())::text escape '\'
      or (storage.foldername(name))[2] like (select auth.uid())::text || '\_%' escape '\'
    )
  );

drop policy if exists "Chat participants read direct files" on storage.objects;
create policy "Chat participants read direct files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = 'direct'
    and (
      (storage.foldername(name))[2] like '%\_' || (select auth.uid())::text escape '\'
      or (storage.foldername(name))[2] like (select auth.uid())::text || '\_%' escape '\'
    )
  );

-- Notifications when new chat messages arrive
create or replace function public.notify_project_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  sender_label text;
  project_title text;
begin
  select coalesce(nullif(trim(full_name), ''), email, 'Участник')
  into sender_label
  from public.user_profiles
  where id = new.sender_id;

  select title into project_title
  from public.projects
  where id::text = new.project_id
  limit 1;

  project_title := coalesce(project_title, 'проект');

  for recipient in
    select p.created_by from public.projects p
    where p.id::text = new.project_id and p.created_by is not null and p.created_by <> new.sender_id
    union
    select ua.user_id from public.user_applications ua
    where ua.project_id = new.project_id and ua.status = 'accepted' and ua.user_id <> new.sender_id
  loop
    insert into public.user_notifications (user_id, type, title, body, link_payload, related_project_id)
    values (
      recipient,
      'chat_message',
      'Новое сообщение в проекте',
      coalesce(sender_label, 'Участник') || ' · «' || project_title || '»',
      jsonb_build_object('tab', 'messages'),
      new.project_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_project_chat_notification on public.project_chat_messages;
create trigger trg_project_chat_notification
  after insert on public.project_chat_messages
  for each row
  execute function public.notify_project_chat_message();

create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_label text;
begin
  if new.recipient_id = new.sender_id then
    return new;
  end if;

  select coalesce(nullif(trim(full_name), ''), email, 'Участник')
  into sender_label
  from public.user_profiles
  where id = new.sender_id;

  insert into public.user_notifications (user_id, type, title, body, link_payload)
  values (
    new.recipient_id,
    'chat_message',
    'Новое личное сообщение',
    coalesce(sender_label, 'Участник') || ' написал(а) вам',
    jsonb_build_object('tab', 'messages')
  );

  return new;
end;
$$;

drop trigger if exists trg_direct_message_notification on public.direct_messages;
create trigger trg_direct_message_notification
  after insert on public.direct_messages
  for each row
  execute function public.notify_direct_message();
