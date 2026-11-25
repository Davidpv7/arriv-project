-- Phase 1: people. Profiles, visa display, connections, blocks.
-- Spec: docs/arriv-mvp-spec.md §3.1, §3.2, §4, §6.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums (the rest of §3.1 arrive with the tables that use them)
-- ---------------------------------------------------------------------------
create type public.visibility as enum ('public', 'connections', 'private');
create type public.user_role as enum ('user', 'admin');
create type public.tier as enum ('free', 'member', 'professional');
create type public.connection_status as enum ('pending', 'accepted');

-- ---------------------------------------------------------------------------
-- Private schema for helpers used by RLS policies
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: public identity, one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle extensions.citext not null unique
    check (handle::text ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 50),
  avatar_path text,
  bio text check (char_length(bio) <= 300),
  origin_country char(2) check (origin_country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 60),
  arrived_on date,
  role public.user_role not null default 'user',
  tier public.tier not null default 'free',
  locale text not null default 'en',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- profile_visas: visa shown on the profile, separate so RLS can hide it.
-- Visa expiry is never stored here (it lives in Journey, owner-only).
-- visa_subclass gets a FK to visas(subclass) in Phase 6.
-- ---------------------------------------------------------------------------
create table public.profile_visas (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  visa_subclass text check (visa_subclass ~ '^[0-9]{3}$'),
  visa_label text check (char_length(visa_label) <= 60),
  visibility public.visibility not null default 'connections',
  updated_at timestamptz not null default now()
);

create trigger profile_visas_set_updated_at
  before update on public.profile_visas
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- connections
-- ---------------------------------------------------------------------------
create table public.connections (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- One connection per pair, whichever direction it was requested in.
create unique index connections_pair_unique
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index connections_addressee_idx on public.connections (addressee_id);

create function private.connections_set_accepted_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    new.accepted_at = now();
  end if;
  return new;
end;
$$;

create trigger connections_set_accepted_at
  before update on public.connections
  for each row execute function private.connections_set_accepted_at();

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- RLS helpers (security definer so policies can look across tables)
-- ---------------------------------------------------------------------------
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function private.are_connected(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

create function private.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

revoke all on all functions in schema private from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.are_connected(uuid, uuid) to authenticated;
grant execute on function private.is_blocked(uuid, uuid) to authenticated;

-- Blocking removes any connection between the pair.
create function private.blocks_remove_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.connections
  where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
     or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_remove_connection
  after insert on public.blocks
  for each row execute function private.blocks_remove_connection();

-- ---------------------------------------------------------------------------
-- New auth user -> profile + profile_visas
-- (default Backpack folders are added in Phase 4)
-- ---------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text;
  base text;
  candidate text;
begin
  name := left(coalesce(
    nullif(btrim(meta ->> 'display_name'), ''),
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Traveller'
  ), 50);

  base := left(regexp_replace(lower(name), '[^a-z0-9_]', '', 'g'), 15);
  if char_length(base) < 3 then
    base := 'traveller';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate::extensions.citext) loop
    candidate := base || (1000 + floor(random() * 9000))::int::text;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, candidate, name);

  insert into public.profile_visas (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Stats that need to count rows the viewer can't read directly
-- ---------------------------------------------------------------------------
create function public.connection_count(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_blocked((select auth.uid()), p_user) then null
    else (
      select count(*)::int from public.connections
      where status = 'accepted' and (requester_id = p_user or addressee_id = p_user)
    )
  end;
$$;

revoke all on function public.connection_count(uuid) from public, anon;
grant execute on function public.connection_count(uuid) to authenticated;

-- People I blocked. Their profiles are hidden from me by RLS, so the
-- Settings > Blocked list needs this to show names and allow unblocking.
create function public.my_blocks()
returns table (blocked_id uuid, handle text, display_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_id, p.handle::text, p.display_name, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc;
$$;

revoke all on function public.my_blocks() from public, anon;
grant execute on function public.my_blocks() to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: signed-in users only; column-level update rights
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.profile_visas, public.connections, public.blocks from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
-- role and tier are never writable from the app.
grant update (handle, display_name, avatar_path, bio, origin_country, city, arrived_on, locale, onboarded_at)
  on public.profiles to authenticated;

revoke update on public.profile_visas from authenticated;
grant select, insert, delete on public.profile_visas to authenticated;
grant update (visa_subclass, visa_label, visibility) on public.profile_visas to authenticated;

revoke update on public.connections from authenticated;
grant select, insert, delete on public.connections to authenticated;
grant update (status) on public.connections to authenticated;

revoke update on public.blocks from authenticated;
grant select, insert, delete on public.blocks to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_visas enable row level security;
alter table public.connections enable row level security;
alter table public.blocks enable row level security;

-- profiles: any signed-in user, unless blocked either way. Own row writable.
create policy "profiles: read unless blocked"
  on public.profiles for select to authenticated
  using (not private.is_blocked((select auth.uid()), id));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- profile_visas: owner; public; connections if connected. Never if blocked.
create policy "profile_visas: read by visibility"
  on public.profile_visas for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      not private.is_blocked((select auth.uid()), user_id)
      and (
        visibility = 'public'
        or (visibility = 'connections' and private.are_connected((select auth.uid()), user_id))
      )
    )
  );

create policy "profile_visas: insert own"
  on public.profile_visas for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "profile_visas: update own"
  on public.profile_visas for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- connections: either party reads; requester inserts (pending, not blocked);
-- addressee accepts; either party deletes.
create policy "connections: read own"
  on public.connections for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "connections: request"
  on public.connections for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and not private.is_blocked(requester_id, addressee_id)
  );

create policy "connections: addressee accepts"
  on public.connections for update to authenticated
  using (addressee_id = (select auth.uid()))
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

create policy "connections: either party removes"
  on public.connections for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- blocks: blocker only.
create policy "blocks: read own"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "blocks: create own"
  on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "blocks: remove own"
  on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: avatars bucket (public read, owner writes under {user_id}/)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "avatars: owner inserts"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
