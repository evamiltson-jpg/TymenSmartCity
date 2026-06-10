-- Migration: user_feedback table for AI chat bug reports and site complaints.
-- Allows anonymous and authenticated users to submit feedback; admins read via service role.

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  description text not null,
  page varchar(200),
  contact_email varchar(255),
  source varchar(50) not null default 'ai_chat',
  status varchar(30) not null default 'new',
  created_at timestamptz not null default now()
);

comment on table public.user_feedback is 'User bug reports and complaints collected via AI chat';

alter table public.user_feedback enable row level security;

create policy "anon can insert feedback"
  on public.user_feedback
  for insert
  to anon
  with check (true);

create policy "authenticated can insert feedback"
  on public.user_feedback
  for insert
  to authenticated
  with check (true);
