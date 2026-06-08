-- Migration: grant table privileges on user_profiles for authenticated users
-- Root cause: RLS policies existed but authenticated role had no SELECT/INSERT/UPDATE grants

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
