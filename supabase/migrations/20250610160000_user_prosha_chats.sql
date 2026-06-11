-- Личные диалоги Проши: один ряд на пользователя, RLS — только свой чат.

create table if not exists public.user_prosha_chats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  archives jsonb not null default '[]'::jsonb,
  session_count integer not null default 0 check (session_count >= 0),
  session_day text,
  brief jsonb not null default '{}'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.user_prosha_chats is
  'Приватные чаты Проши: только владелец видит и редактирует свои сообщения.';

create index if not exists user_prosha_chats_updated_at_idx
  on public.user_prosha_chats (updated_at desc);

alter table public.user_prosha_chats enable row level security;

create policy "user_prosha_chats_select_own"
  on public.user_prosha_chats
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_prosha_chats_insert_own"
  on public.user_prosha_chats
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_prosha_chats_update_own"
  on public.user_prosha_chats
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_prosha_chats_delete_own"
  on public.user_prosha_chats
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
