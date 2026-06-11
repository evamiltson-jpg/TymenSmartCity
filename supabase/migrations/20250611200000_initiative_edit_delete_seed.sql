-- Allow owners to edit/delete initiatives + demo rows for public showcase

drop policy if exists "authenticated can update own pending initiatives" on public.citizen_initiatives;

create policy "authenticated can update own editable initiatives"
  on public.citizen_initiatives for update to authenticated
  using (
    (select auth.uid()) = user_id
    and status in ('pending', 'in_review')
  )
  with check (
    (select auth.uid()) = user_id
    and status in ('pending', 'in_review')
  );

drop policy if exists "authenticated can delete own initiatives" on public.citizen_initiatives;

create policy "authenticated can delete own deletable initiatives"
  on public.citizen_initiatives for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and status in ('pending', 'rejected')
  );

grant delete on public.citizen_initiatives to authenticated;

-- Demo initiatives (visible on homepage; skip if titles already exist)
do $$
declare
  demo_user uuid;
  id1 uuid;
  id2 uuid;
begin
  select id into demo_user from auth.users order by created_at asc limit 1;

  if demo_user is null then
    return;
  end if;

  if not exists (
    select 1 from public.citizen_initiatives
    where title = 'Освещение пешеходной дорожки у набережной'
  ) then
    insert into public.citizen_initiatives (
      user_id, title, description, address, category, status,
      importance_rating, importance_votes
    ) values (
      demo_user,
      'Освещение пешеходной дорожки у набережной',
      'В вечернее время участок тропы от ул. Республики до набережной плохо освещён. Предлагаем установить LED-фонари с датчиками движения — безопаснее для прогулок и велосипедистов.',
      'Набережная, район Центральный административный округ',
      'Благоустройство',
      'accepted',
      4.3,
      12
    )
    returning id into id1;

    insert into public.citizen_initiative_votes (initiative_id, user_id, score)
    select id1, u.id, (floor(random() * 2) + 4)::smallint
    from auth.users u
    where u.id <> demo_user
    limit 3
    on conflict do nothing;
  end if;

  if not exists (
    select 1 from public.citizen_initiatives
    where title = 'Дополнительная остановка у поликлиники №3'
  ) then
    insert into public.citizen_initiatives (
      user_id, title, description, address, category, status,
      importance_rating, importance_votes
    ) values (
      demo_user,
      'Дополнительная остановка у поликлиники №3',
      'Пожилым и маломобильным гражданам неудобно добираться до поликлиники: ближайшая остановка в 600 м. Просим рассмотреть новую остановку маршрутов №10 и №45.',
      'ул. Мельникайте, 102',
      'Транспорт',
      'in_progress',
      4.0,
      8
    )
    returning id into id2;

    insert into public.citizen_initiative_votes (initiative_id, user_id, score)
    select id2, u.id, (floor(random() * 2) + 3)::smallint
    from auth.users u
    where u.id <> demo_user
    limit 2
    on conflict do nothing;
  end if;
end $$;
