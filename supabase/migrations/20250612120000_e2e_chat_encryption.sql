-- E2E chat encryption: public keys + encrypted message payloads (ECDH + AES-GCM on client)

create table if not exists public.user_public_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  public_key text not null,
  updated_at timestamptz not null default now()
);

comment on table public.user_public_keys is 'ECDH P-256 public keys (JWK JSON) for end-to-end chat encryption';

create index if not exists idx_user_public_keys_updated
  on public.user_public_keys (updated_at desc);

alter table public.user_public_keys enable row level security;

drop policy if exists "authenticated read public keys" on public.user_public_keys;
create policy "authenticated read public keys"
  on public.user_public_keys for select to authenticated
  using (true);

drop policy if exists "authenticated insert own public key" on public.user_public_keys;
create policy "authenticated insert own public key"
  on public.user_public_keys for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "authenticated update own public key" on public.user_public_keys;
create policy "authenticated update own public key"
  on public.user_public_keys for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select on public.user_public_keys to authenticated;
grant insert, update on public.user_public_keys to authenticated;
grant all on public.user_public_keys to service_role;

alter table public.direct_messages
  add column if not exists encrypted_data jsonb;

alter table public.project_chat_messages
  add column if not exists encrypted_data jsonb;

create index if not exists idx_direct_messages_encrypted
  on public.direct_messages ((encrypted_data is not null));

create index if not exists idx_project_chat_messages_encrypted
  on public.project_chat_messages ((encrypted_data is not null));
