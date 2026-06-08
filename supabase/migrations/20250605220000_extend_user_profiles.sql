-- Migration: extend user profiles for rich cabinet features
-- Purpose: user type, bio, links, certificates, quiz metadata, storage buckets, RLS fix

create type public.user_type as enum ('student', 'it_specialist', 'citizen');

alter table public.user_profiles
  add column if not exists user_type public.user_type default 'citizen',
  add column if not exists bio text,
  add column if not exists university varchar(255),
  add column if not exists course_year varchar(50),
  add column if not exists company varchar(255),
  add column if not exists experience_years integer,
  add column if not exists city_interests text,
  add column if not exists links jsonb not null default '[]'::jsonb,
  add column if not exists certificates jsonb not null default '[]'::jsonb,
  add column if not exists quiz_completed_at timestamptz,
  add column if not exists quiz_attempts integer not null default 0;

drop policy if exists "Users can update their own profile" on public.user_profiles;

create policy "Users can update their own profile"
  on public.user_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can delete their own projects" on public.user_projects;

create policy "Users can delete their own projects"
  on public.user_projects
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('certificates', 'certificates', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
