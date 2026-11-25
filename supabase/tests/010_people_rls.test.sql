-- Phase 1 RLS: profiles, profile_visas, connections, blocks.
begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

-- Users (the auth trigger creates their profiles)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@test.dev', '{"display_name":"Test Ana"}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'mateo@test.dev', '{"display_name":"Mateo R."}', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'lina@test.dev', '{}', 'authenticated', 'authenticated');

update public.profile_visas set visa_subclass = '500', visibility = 'connections'
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000002';
update public.profile_visas set visa_subclass = '482', visibility = 'public'
  where user_id = 'aaaaaaaa-0000-0000-0000-000000000003';

-- Signup trigger ------------------------------------------------------------
select is((select count(*)::int from public.profiles where id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003')), 3, 'signup creates a profile per user');
select is((select count(*)::int from public.profile_visas where user_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003')), 3, 'signup creates profile_visas per user');
select is(
  (select handle::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'testana', 'handle is derived from the display name');
select is(
  (select handle::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'lina', 'handle falls back to the email name');
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000004', 'ana2@test.dev', '{"display_name":"Test Ana"}', 'authenticated', 'authenticated');
select matches(
  (select handle::text from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  '^testana[0-9]{4}$', 'a taken handle gets a numeric suffix');

-- As Ana --------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';

select isnt_empty($$ select 1 from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  'a user can read another profile');
select lives_ok($$ update public.profiles set bio = 'Hi!' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'a user can update their own profile');
with u as (update public.profiles set bio = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000002' returning 1)
select is(count(*)::int, 0, 'a user cannot update someone else''s profile') from u;
select throws_ok($$ update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'a user cannot change their own role');
select throws_ok($$ update public.profiles set tier = 'member' where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'a user cannot change their own tier');
select throws_ok($$ insert into public.profiles (id, handle, display_name) values (gen_random_uuid(), 'fake_one', 'Fake') $$,
  '42501', null, 'a user cannot insert profiles');

select is_empty($$ select 1 from public.profile_visas where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  'connections-only visa is hidden from non-connections');
select isnt_empty($$ select 1 from public.profile_visas where user_id = 'aaaaaaaa-0000-0000-0000-000000000003' $$,
  'public visa is visible');

select lives_ok($$ insert into public.connections (requester_id, addressee_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002') $$,
  'a user can send a connection request');
with u as (update public.connections set status = 'accepted' where requester_id = 'aaaaaaaa-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 0, 'the requester cannot accept their own request') from u;
select throws_ok($$ insert into public.connections (requester_id, addressee_id) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002') $$,
  '42501', null, 'a user cannot request a connection on someone else''s behalf');

-- As Mateo: accept ------------------------------------------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';
with u as (update public.connections set status = 'accepted' where requester_id = 'aaaaaaaa-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 1, 'the addressee can accept') from u;

-- As Ana: connected now ---------------------------------------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';
select isnt_empty($$ select 1 from public.profile_visas where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' $$,
  'connections-only visa is visible once connected');
select is(public.connection_count('aaaaaaaa-0000-0000-0000-000000000002'), 1, 'connection_count counts accepted');

-- As Lina ---------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}';
select is_empty($$ select 1 from public.connections $$, 'third parties cannot see a connection');
select lives_ok($$ insert into public.blocks (blocker_id, blocked_id) values
  ('aaaaaaaa-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'a user can block someone');
select isnt_empty($$ select 1 from public.blocks $$, 'the blocker sees their block');
select is((select handle from public.my_blocks()), 'testana', 'my_blocks lists who I blocked by name');

-- As Ana, blocked by Lina -------------------------------------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}';
select is_empty($$ select 1 from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000003' $$,
  'a blocked user cannot see the blocker''s profile');
select is_empty($$ select 1 from public.profile_visas where user_id = 'aaaaaaaa-0000-0000-0000-000000000003' $$,
  'a blocked user cannot see the blocker''s public visa');
select is_empty($$ select 1 from public.blocks $$, 'the blocked user cannot see the block');
select is_empty($$ select * from public.my_blocks() $$, 'my_blocks never shows who blocked me');
select throws_ok($$ insert into public.connections (requester_id, addressee_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003') $$,
  '42501', null, 'a blocked pair cannot connect');

-- Blocking removes an existing connection ----------------------------------------
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}';
insert into public.blocks (blocker_id, blocked_id) values
  ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');
reset role;
select is((select count(*)::int from public.connections where requester_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003') or addressee_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000003')), 0, 'blocking removes the connection');

select * from finish();
rollback;
