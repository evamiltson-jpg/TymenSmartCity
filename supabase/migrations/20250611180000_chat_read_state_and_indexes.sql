-- Chat read cursors (unread badges) + indexes for larger traffic

-- Per-user last read timestamp for project team chats
create table if not exists public.user_project_chat_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists idx_user_project_chat_reads_user
  on public.user_project_chat_reads (user_id);

alter table public.user_project_chat_reads enable row level security;

drop policy if exists "Users read own project chat reads" on public.user_project_chat_reads;
create policy "Users read own project chat reads"
  on public.user_project_chat_reads for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users upsert own project chat reads" on public.user_project_chat_reads;
create policy "Users upsert own project chat reads"
  on public.user_project_chat_reads for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own project chat reads" on public.user_project_chat_reads;
create policy "Users update own project chat reads"
  on public.user_project_chat_reads for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_project_chat_reads to authenticated;
grant all on public.user_project_chat_reads to service_role;

-- Scale: composite indexes for hot chat queries
create index if not exists idx_project_chat_messages_project_created
  on public.project_chat_messages (project_id, created_at desc);

create index if not exists idx_project_chat_messages_sender
  on public.project_chat_messages (sender_id, created_at desc);

create index if not exists idx_user_notifications_user_type_unread
  on public.user_notifications (user_id, type, is_read, created_at desc);

create index if not exists idx_user_applications_user_status
  on public.user_applications (user_id, status, submitted_at desc);

create index if not exists idx_user_applications_project_status
  on public.user_applications (project_id, status);
