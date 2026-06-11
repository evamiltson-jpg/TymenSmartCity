-- Citizen initiatives: ideas and complaints from residents (not full projects).
-- Includes public showcase voting and photo attachments.

create table if not exists public.citizen_initiatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title varchar(200) not null,
  description text not null,
  address varchar(300),
  category varchar(50) not null,
  photo_urls text[] not null default '{}',
  status varchar(30) not null default 'pending',
  importance_rating numeric(3, 1) not null default 0,
  importance_votes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint citizen_initiatives_title_len check (char_length(trim(title)) >= 3),
  constraint citizen_initiatives_desc_len check (char_length(trim(description)) >= 10),
  constraint citizen_initiatives_status_check check (
    status in ('pending', 'in_review', 'accepted', 'in_progress', 'completed', 'rejected')
  )
);

comment on table public.citizen_initiatives is 'Citizen ideas and complaints for city improvements';

create index if not exists citizen_initiatives_user_id_idx on public.citizen_initiatives (user_id);
create index if not exists citizen_initiatives_status_idx on public.citizen_initiatives (status);
create index if not exists citizen_initiatives_created_at_idx on public.citizen_initiatives (created_at desc);
create index if not exists citizen_initiatives_category_idx on public.citizen_initiatives (category);

create table if not exists public.citizen_initiative_votes (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.citizen_initiatives (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint citizen_initiative_votes_score_check check (score between 1 and 5),
  constraint citizen_initiative_votes_unique unique (initiative_id, user_id)
);

comment on table public.citizen_initiative_votes is 'Resident ratings of how necessary an initiative is (1-5)';

create index if not exists citizen_initiative_votes_initiative_id_idx
  on public.citizen_initiative_votes (initiative_id);
create index if not exists citizen_initiative_votes_user_id_idx
  on public.citizen_initiative_votes (user_id);

-- Recompute aggregate rating on vote changes
create or replace function public.sync_citizen_initiative_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  v_avg numeric;
  v_count integer;
begin
  target_id := coalesce(new.initiative_id, old.initiative_id);

  select coalesce(avg(score)::numeric(3, 1), 0), count(*)::integer
  into v_avg, v_count
  from public.citizen_initiative_votes
  where initiative_id = target_id;

  update public.citizen_initiatives
  set
    importance_rating = v_avg,
    importance_votes = v_count,
    updated_at = now()
  where id = target_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists citizen_initiative_votes_sync_rating on public.citizen_initiative_votes;
create trigger citizen_initiative_votes_sync_rating
  after insert or update or delete on public.citizen_initiative_votes
  for each row execute function public.sync_citizen_initiative_rating();

alter table public.citizen_initiatives enable row level security;
alter table public.citizen_initiative_votes enable row level security;

-- Initiatives: public read (except rejected), authenticated insert own, owner read all own
create policy "anon can read public initiatives"
  on public.citizen_initiatives for select to anon
  using (status <> 'rejected');

create policy "authenticated can read public initiatives"
  on public.citizen_initiatives for select to authenticated
  using (status <> 'rejected' or (select auth.uid()) = user_id);

create policy "authenticated can insert own initiatives"
  on public.citizen_initiatives for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "authenticated can update own pending initiatives"
  on public.citizen_initiatives for update to authenticated
  using ((select auth.uid()) = user_id and status = 'pending')
  with check ((select auth.uid()) = user_id);

-- Votes: anyone authenticated can read aggregates via initiative; users manage own votes
create policy "anon cannot read votes"
  on public.citizen_initiative_votes for select to anon
  using (false);

create policy "authenticated can read own votes"
  on public.citizen_initiative_votes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "authenticated can insert own vote"
  on public.citizen_initiative_votes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "authenticated can update own vote"
  on public.citizen_initiative_votes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "authenticated can delete own vote"
  on public.citizen_initiative_votes for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.citizen_initiatives to anon, authenticated;
grant insert, update on public.citizen_initiatives to authenticated;
grant select, insert, update, delete on public.citizen_initiative_votes to authenticated;

-- Public bucket for initiative photos (max 5 MB, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'initiative-photos',
  'initiative-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "public read initiative photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'initiative-photos');

create policy "authenticated upload initiative photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'initiative-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "authenticated update own initiative photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'initiative-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "authenticated delete own initiative photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'initiative-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
