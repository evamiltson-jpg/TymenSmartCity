-- Migration: ensure profile save permissions and RLS (run once in Supabase SQL Editor)
-- Fixes: permission denied, slow/failed saves for authenticated users

grant usage on schema public to authenticated, anon;

grant select, insert, update on table public.user_profiles to authenticated;
grant select, insert, update, delete on table public.user_profiles to service_role;
grant usage on type public.user_type to authenticated, anon;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
  on public.user_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.user_profiles;
create policy "Users can insert their own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.user_profiles;
create policy "Users can update their own profile"
  on public.user_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
