-- Phase 4: the Backpack is owner only. Folders, documents and the backpack bucket.
begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

-- Owner (O), other user (X), admin (A)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('f6000000-0000-0000-0000-00000000000a', 'bo@test.dev', '{"display_name":"Bag Owner"}', 'authenticated', 'authenticated'),
  ('f6000000-0000-0000-0000-00000000000b', 'bx@test.dev', '{"display_name":"Bag Other"}', 'authenticated', 'authenticated'),
  ('f6000000-0000-0000-0000-00000000000c', 'ba@test.dev', '{"display_name":"Bag Admin"}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = 'f6000000-0000-0000-0000-00000000000c';
set local storage.allow_delete_query = 'true'; -- lets the delete-policy checks run in SQL

-- Default folders ---------------------------------------------------------------------
select results_eq($$
  select kind::text from public.backpack_folders
  where owner_id = 'f6000000-0000-0000-0000-00000000000a' order by position
$$, $$ values ('identity'), ('visa'), ('police'), ('education'), ('work'), ('other') $$,
  'a new account gets the six default folders, in order');
select is_empty($$
  select 1 from public.profiles p
  where (select count(*) from public.backpack_folders f where f.owner_id = p.id and f.kind is not null) <> 6
$$, 'every existing profile has the six default folders');

create temp table ids on commit drop as select
  (select id from public.backpack_folders where owner_id = 'f6000000-0000-0000-0000-00000000000a' and kind = 'identity') as identity_folder,
  (select id from public.backpack_folders where owner_id = 'f6000000-0000-0000-0000-00000000000b' and kind = 'identity') as other_folder;
grant select on ids to authenticated;

-- As Owner: folders -------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"f6000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select count(*)::int from public.backpack_folders), 6, 'the owner sees only their own folders');
select lives_ok($$
  insert into public.backpack_folders (id, owner_id, name)
  values ('f7000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-00000000000a', 'Rental')
$$, 'the owner can add a folder');
select throws_ok($$
  insert into public.backpack_folders (owner_id, kind, name)
  values ('f6000000-0000-0000-0000-00000000000a', 'health', 'Sneaky default')
$$, '42501', null, 'nobody can add a default (kind) folder');
select throws_ok($$
  insert into public.backpack_folders (owner_id, name) values ('f6000000-0000-0000-0000-00000000000b', 'For you')
$$, '42501', null, 'nobody can add a folder to someone else''s Backpack');
select throws_ok($$
  insert into public.backpack_folders (owner_id, name) values ('f6000000-0000-0000-0000-00000000000a', '   ')
$$, '23514', null, 'a folder needs a name');
update public.backpack_folders set name = 'Passports & IDs' where id = (select identity_folder from ids);
select is((select name from public.backpack_folders where id = (select identity_folder from ids)),
  'Passports & IDs', 'the owner can rename a default folder');
with d as (delete from public.backpack_folders where id = (select identity_folder from ids) returning 1)
select is(count(*)::int, 0, 'a default folder cannot be deleted') from d;

-- As Owner: upload and add a document ---------------------------------------------------
select lives_ok($$
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('backpack', 'f6000000-0000-0000-0000-00000000000a/f8000000-0000-0000-0000-000000000001',
    'f6000000-0000-0000-0000-00000000000a', '{"mimetype":"application/pdf","size":48213}')
$$, 'the owner can upload into their own Backpack');
select throws_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  values ('backpack', 'f6000000-0000-0000-0000-00000000000a/passport.pdf', 'f6000000-0000-0000-0000-00000000000a')
$$, '42501', null, 'uploads must use the {owner}/{document id} path');
select throws_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  values ('backpack', 'f6000000-0000-0000-0000-00000000000b/f8000000-0000-0000-0000-000000000009',
    'f6000000-0000-0000-0000-00000000000a')
$$, '42501', null, 'nobody can upload into someone else''s Backpack');

select lives_ok($$
  insert into public.documents (id, owner_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by)
  values ('f8000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-00000000000a', (select identity_folder from ids),
    'Passport', 'f6000000-0000-0000-0000-00000000000a/f8000000-0000-0000-0000-000000000001',
    'image/png', 1, 'f6000000-0000-0000-0000-00000000000a')
$$, 'the owner can add the uploaded file as a document');
select results_eq($$ select mime_type, size_bytes from public.documents where id = 'f8000000-0000-0000-0000-000000000001' $$,
  $$ values ('application/pdf'::text, 48213::bigint) $$,
  'type and size come from the stored file, not from the app');
select throws_ok($$
  insert into public.documents (id, owner_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by)
  values ('f8000000-0000-0000-0000-000000000002', 'f6000000-0000-0000-0000-00000000000a', (select identity_folder from ids),
    'Ghost', 'f6000000-0000-0000-0000-00000000000a/f8000000-0000-0000-0000-000000000002',
    'application/pdf', 10, 'f6000000-0000-0000-0000-00000000000a')
$$, '23503', null, 'a document needs its file uploaded first');
select throws_ok($$
  insert into public.documents (owner_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by)
  values ('f6000000-0000-0000-0000-00000000000a', (select identity_folder from ids), 'Wrong path',
    'f6000000-0000-0000-0000-00000000000a/f8000000-0000-0000-0000-000000000001',
    'application/pdf', 10, 'f6000000-0000-0000-0000-00000000000a')
$$, '23514', null, 'a document''s path must be {owner}/{its own id}');
select throws_ok($$
  update public.documents set folder_id = (select other_folder from ids) where id = 'f8000000-0000-0000-0000-000000000001'
$$, '23503', null, 'a document cannot be moved into someone else''s folder');
select throws_ok($$
  update public.documents set storage_path = 'x' where id = 'f8000000-0000-0000-0000-000000000001'
$$, '42501', null, 'a document''s file path cannot be changed');
update public.documents set folder_id = 'f7000000-0000-0000-0000-000000000001', name = 'Lease 2026'
  where id = 'f8000000-0000-0000-0000-000000000001';
select results_eq($$ select folder_id, name from public.documents where id = 'f8000000-0000-0000-0000-000000000001' $$,
  $$ values ('f7000000-0000-0000-0000-000000000001'::uuid, 'Lease 2026'::text) $$,
  'the owner can rename a document and move it to another of their folders');
select throws_ok($$ delete from public.backpack_folders where id = 'f7000000-0000-0000-0000-000000000001' $$,
  '23503', null, 'a folder with documents in it cannot be deleted');

-- As Other: nothing of the owner's is visible or changeable, even by id or path --------
set local request.jwt.claims to '{"sub":"f6000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is_empty($$ select 1 from public.backpack_folders where owner_id = 'f6000000-0000-0000-0000-00000000000a' $$,
  'another user cannot see the owner''s folders');
select is_empty($$ select 1 from public.documents where id = 'f8000000-0000-0000-0000-000000000001' $$,
  'another user cannot see the owner''s document, even by id');
select is_empty($$
  select 1 from storage.objects
  where bucket_id = 'backpack' and name = 'f6000000-0000-0000-0000-00000000000a/f8000000-0000-0000-0000-000000000001'
$$, 'another user cannot read the owner''s file, even with its path');
with u as (update public.documents set name = 'mine now' where id = 'f8000000-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 0, 'another user cannot rename the owner''s document') from u;
with u as (update public.backpack_folders set name = 'mine now' where owner_id = 'f6000000-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 0, 'another user cannot rename the owner''s folders') from u;
with d as (delete from public.documents where id = 'f8000000-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 0, 'another user cannot delete the owner''s document') from d;
with d as (delete from storage.objects where bucket_id = 'backpack' and name like 'f6000000-0000-0000-0000-00000000000a/%' returning 1)
select is(count(*)::int, 0, 'another user cannot delete the owner''s file') from d;
with d as (delete from public.backpack_folders where id = 'f7000000-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 0, 'another user cannot delete the owner''s folder') from d;
select throws_ok($$
  insert into public.documents (owner_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by)
  values ('f6000000-0000-0000-0000-00000000000a', (select identity_folder from ids), 'Planted',
    'f6000000-0000-0000-0000-00000000000a/f8000000-0000-0000-0000-000000000003', 'application/pdf', 1,
    'f6000000-0000-0000-0000-00000000000a')
$$, '42501', null, 'another user cannot add a document to the owner''s Backpack');
select throws_ok($$
  insert into public.documents (id, owner_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by)
  values ('f8000000-0000-0000-0000-000000000001', 'f6000000-0000-0000-0000-00000000000b', (select other_folder from ids), 'Claimed',
    'f6000000-0000-0000-0000-00000000000b/f8000000-0000-0000-0000-000000000001', 'application/pdf', 1,
    'f6000000-0000-0000-0000-00000000000b')
$$, '23503', null, 'another user cannot claim the owner''s file as their own document');

-- As Admin: still nothing (admins moderate communities, not Backpacks) -----------------
set local request.jwt.claims to '{"sub":"f6000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty($$ select 1 from public.documents where owner_id = 'f6000000-0000-0000-0000-00000000000a' $$,
  'an admin cannot see anyone''s documents');
select is_empty($$ select 1 from storage.objects where bucket_id = 'backpack' and name like 'f6000000-0000-0000-0000-00000000000a/%' $$,
  'an admin cannot read anyone''s Backpack files');

-- Anonymous: nothing at all ---------------------------------------------------------------
set local role anon;
select is_empty($$ select 1 from storage.objects where bucket_id = 'backpack' $$,
  'a signed-out visitor cannot read Backpack files');

-- As Owner: delete the document, then its folder -----------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"f6000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$ delete from public.documents where id = 'f8000000-0000-0000-0000-000000000001' $$,
  'the owner can delete a document');
with d as (delete from storage.objects where bucket_id = 'backpack' and name = 'f6000000-0000-0000-0000-00000000000a/f8000000-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 1, 'the owner can delete the stored file') from d;
select lives_ok($$ delete from public.backpack_folders where id = 'f7000000-0000-0000-0000-000000000001' $$,
  'an empty folder of their own can be deleted');

-- Deleting the account removes the folders and documents -----------------------------------
reset role;
delete from auth.users where id = 'f6000000-0000-0000-0000-00000000000a';
select is_empty($$ select 1 from public.backpack_folders where owner_id = 'f6000000-0000-0000-0000-00000000000a' $$,
  'deleting the account removes its folders');

select * from finish();
rollback;
