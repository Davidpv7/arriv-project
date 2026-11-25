-- Communities outlive their creator: hand over or delete before deleting an account.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

-- Owner (O), member (M), outsider (X)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('f4000000-0000-0000-0000-00000000000a', 'oo@test.dev', '{"display_name":"Own Owner"}', 'authenticated', 'authenticated'),
  ('f4000000-0000-0000-0000-00000000000b', 'om@test.dev', '{"display_name":"Own Member"}', 'authenticated', 'authenticated'),
  ('f4000000-0000-0000-0000-00000000000c', 'ox@test.dev', '{"display_name":"Own Outsider"}', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims to '{"sub":"f4000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.communities (id, name, kind, created_by) values
  ('f5000000-0000-0000-0000-000000000001', 'Handover Crew', 'interest', 'f4000000-0000-0000-0000-00000000000a'),
  ('f5000000-0000-0000-0000-000000000002', 'Solo Crew', 'interest', 'f4000000-0000-0000-0000-00000000000a');
set local request.jwt.claims to '{"sub":"f4000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into public.community_members (community_id, user_id)
  values ('f5000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-00000000000b');

-- Only the owner can hand over, and only to a member
select throws_ok($$ select public.transfer_community_ownership('f5000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'a member cannot take over a community');
set local request.jwt.claims to '{"sub":"f4000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$ select public.transfer_community_ownership('f5000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-00000000000c') $$,
  '22023', null, 'the new owner must be a member');

-- Account deletion is refused while owning communities
reset role;
select throws_ok($$ delete from auth.users where id = 'f4000000-0000-0000-0000-00000000000a' $$,
  '55006', null, 'an account that owns a community cannot be deleted');

-- Hand over one, delete the other
set local role authenticated;
select lives_ok($$ select public.transfer_community_ownership('f5000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-00000000000b') $$,
  'the owner can hand a community to a member');
select results_eq($$
  select user_id::text, role::text from public.community_members
  where community_id = 'f5000000-0000-0000-0000-000000000001' order by user_id
$$, $$ values ('f4000000-0000-0000-0000-00000000000a', 'moderator'), ('f4000000-0000-0000-0000-00000000000b', 'owner') $$,
  'the new owner is in charge; the old owner stays as a moderator');
select is((select m.role::text from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id
  where c.community_id = 'f5000000-0000-0000-0000-000000000001' and m.user_id = 'f4000000-0000-0000-0000-00000000000b'),
  'owner', 'the chat room follows the handover');
with d as (delete from public.communities where id = 'f5000000-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 0, 'the creator can no longer delete a community they handed over') from d;
select lives_ok($$ delete from public.communities where id = 'f5000000-0000-0000-0000-000000000002' $$,
  'the owner can delete a community they own');
select is_empty($$ select 1 from public.conversations where community_id = 'f5000000-0000-0000-0000-000000000002' $$,
  'deleting a community removes its chat room');

-- Now the account can go, and the community stays
reset role;
select lives_ok($$ delete from auth.users where id = 'f4000000-0000-0000-0000-00000000000a' $$,
  'with nothing owned, the account can be deleted');
select isnt_empty($$ select 1 from public.communities where id = 'f5000000-0000-0000-0000-000000000001' $$,
  'the handed-over community survives');
select is((select created_by from public.communities where id = 'f5000000-0000-0000-0000-000000000001'),
  null, 'created_by is cleared, not cascaded');
select is((select member_count from public.communities where id = 'f5000000-0000-0000-0000-000000000001'),
  1, 'the member count drops by one');

select * from finish();
rollback;
