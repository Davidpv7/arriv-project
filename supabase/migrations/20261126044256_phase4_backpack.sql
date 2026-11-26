-- Phase 4: My Backpack. A private document drive.
-- Owner only, always: no other user, no moderator and no admin can read a folder,
-- a document row or a file in the backpack bucket (spec §4, §5). Lawyer sharing comes
-- later through document_shares; don't widen these policies for it.
--
-- Decided 26 Nov 2026: everyone gets six default folders (Identity, Visas, Police checks,
-- Education, Work, Other). They can be renamed but not deleted. People can add their own
-- folders, and rename or delete those; a folder must be empty before it's deleted.

create type public.folder_kind as enum ('identity', 'visa', 'police', 'education', 'work', 'health', 'other');

-- ---------------------------------------------------------------------------
-- Folders
-- kind is set for the default folders and null for folders people add.
-- name is null until a default folder is renamed: the app shows the translated
-- default name for its kind (all user-facing text goes through i18n).
-- ---------------------------------------------------------------------------
create table public.backpack_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind public.folder_kind,
  name text check (name is null or char_length(btrim(name)) between 1 and 40),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, owner_id), -- target of the documents (folder_id, owner_id) foreign key
  constraint backpack_folders_named check (kind is not null or name is not null)
);

create unique index backpack_folders_one_per_kind on public.backpack_folders (owner_id, kind)
  where kind is not null;
create index backpack_folders_owner on public.backpack_folders (owner_id, position);

alter table public.backpack_folders enable row level security;

create policy "backpack_folders: owner reads"
  on public.backpack_folders for select to authenticated
  using (owner_id = (select auth.uid()));

-- People add their own folders only; the default ones come from the trigger below.
create policy "backpack_folders: owner adds"
  on public.backpack_folders for insert to authenticated
  with check (owner_id = (select auth.uid()) and kind is null and name is not null);

create policy "backpack_folders: owner renames"
  on public.backpack_folders for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Default folders stay. Deleting a folder that still holds documents fails (foreign key).
create policy "backpack_folders: owner deletes own folders"
  on public.backpack_folders for delete to authenticated
  using (owner_id = (select auth.uid()) and kind is null);

revoke insert, update on public.backpack_folders from authenticated;
grant insert (id, owner_id, name, position) on public.backpack_folders to authenticated;
grant update (name, position) on public.backpack_folders to authenticated;

-- At most 30 folders each (6 default + 24 of your own).
create function private.backpack_folders_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.backpack_folders where owner_id = new.owner_id) >= 30 then
    raise exception 'You have reached the folder limit' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger backpack_folders_cap
  before insert on public.backpack_folders
  for each row execute function private.backpack_folders_cap();

-- New profile -> the six default folders.
create function private.profiles_add_default_folders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.backpack_folders (owner_id, kind, position)
  select new.id, k.kind, k.position
  from (values
    ('identity'::public.folder_kind, 0),
    ('visa', 1),
    ('police', 2),
    ('education', 3),
    ('work', 4),
    ('other', 5)
  ) as k(kind, position);
  return new;
end;
$$;

create trigger profiles_add_default_folders
  after insert on public.profiles
  for each row execute function private.profiles_add_default_folders();

-- ---------------------------------------------------------------------------
-- Documents
-- The app picks the id, uploads the file to backpack/{owner_id}/{id}, then inserts
-- the row. The row's type and size are copied from the stored object, so they are
-- what the bucket actually accepted, and a row can't point at a missing file.
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  folder_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  storage_path text not null unique,
  mime_type text not null check (mime_type in (
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  size_bytes bigint not null check (size_bytes between 0 and 20971520),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A document can only live in one of its owner's folders.
  foreign key (folder_id, owner_id) references public.backpack_folders (id, owner_id),
  constraint documents_path check (storage_path = owner_id::text || '/' || id::text),
  constraint documents_uploaded_by_owner check (uploaded_by = owner_id) -- lawyers upload later
);

create index documents_owner_recent on public.documents (owner_id, created_at desc);
create index documents_folder on public.documents (folder_id, created_at desc);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function private.set_updated_at();

create function private.documents_from_storage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb;
begin
  -- Someone else's Backpack: leave it to RLS to refuse, without saying whether a file exists.
  if (select auth.uid()) is not null and new.owner_id <> (select auth.uid()) then
    return new;
  end if;
  select o.metadata into meta
  from storage.objects o
  where o.bucket_id = 'backpack' and o.name = new.storage_path and o.owner_id = new.owner_id::text;
  if not found then
    raise exception 'Upload the file before adding the document' using errcode = '23503';
  end if;
  new.mime_type := coalesce(meta ->> 'mimetype', new.mime_type);
  new.size_bytes := coalesce((meta ->> 'size')::bigint, new.size_bytes);
  return new;
end;
$$;

create trigger documents_from_storage
  before insert on public.documents
  for each row execute function private.documents_from_storage();

alter table public.documents enable row level security;

create policy "documents: owner reads"
  on public.documents for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "documents: owner adds"
  on public.documents for insert to authenticated
  with check (owner_id = (select auth.uid()) and uploaded_by = (select auth.uid()));

-- Rename and move (the folder foreign key keeps it in the owner's own folders).
create policy "documents: owner edits"
  on public.documents for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- The app removes the stored file too (owner-only storage policy below).
create policy "documents: owner deletes"
  on public.documents for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke insert, update on public.documents from authenticated;
grant insert (id, owner_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by)
  on public.documents to authenticated;
grant update (name, folder_id) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: backpack (private, owner only). Path: {owner_id}/{document_id}.
-- Served only through 5-minute signed URLs. No update policy: files are replaced
-- by uploading a new document, never overwritten.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backpack', 'backpack', false, 20971520, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do nothing;

create policy "backpack: owner reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'backpack' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "backpack: owner uploads"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'backpack'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'
  );

create policy "backpack: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'backpack' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Backfill: default folders for everyone who signed up before this migration.
-- ---------------------------------------------------------------------------
insert into public.backpack_folders (owner_id, kind, position)
select p.id, k.kind, k.position
from public.profiles p
cross join (values
  ('identity'::public.folder_kind, 0),
  ('visa', 1),
  ('police', 2),
  ('education', 3),
  ('work', 4),
  ('other', 5)
) as k(kind, position)
on conflict do nothing;
