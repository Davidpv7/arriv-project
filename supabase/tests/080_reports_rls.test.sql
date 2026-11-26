-- Phase 7a: reports. People report what they can see; only admins review; removing works.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- Reporter (R), author (A), stranger (X), admin (M)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('fe000000-0000-0000-0000-00000000000a', 'rr@test.dev', '{"display_name":"Rep Reporter"}', 'authenticated', 'authenticated'),
  ('fe000000-0000-0000-0000-00000000000b', 'ra@test.dev', '{"display_name":"Rep Author"}', 'authenticated', 'authenticated'),
  ('fe000000-0000-0000-0000-00000000000c', 'rx@test.dev', '{"display_name":"Rep Stranger"}', 'authenticated', 'authenticated'),
  ('fe000000-0000-0000-0000-00000000000d', 'rm@test.dev', '{"display_name":"Rep Admin"}', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = 'fe000000-0000-0000-0000-00000000000d';

-- The author's crew, post, comment; the reporter joins; a direct chat between them.
set local role authenticated;
set local request.jwt.claims to '{"sub":"fe000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into public.communities (id, name, kind, created_by)
  values ('fe100000-0000-0000-0000-000000000001', 'Report Test Crew', 'interest', 'fe000000-0000-0000-0000-00000000000b');
insert into public.posts (id, author_id, community_id, kind, body)
  values ('fe200000-0000-0000-0000-000000000001', 'fe000000-0000-0000-0000-00000000000b', 'fe100000-0000-0000-0000-000000000001', 'post', 'Buy followers cheap!!!');
insert into public.comments (id, post_id, author_id, body)
  values ('fe300000-0000-0000-0000-000000000001', 'fe200000-0000-0000-0000-000000000001', 'fe000000-0000-0000-0000-00000000000b', 'DM me for visa hacks');

set local request.jwt.claims to '{"sub":"fe000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.community_members (community_id, user_id)
  values ('fe100000-0000-0000-0000-000000000001', 'fe000000-0000-0000-0000-00000000000a');
create temp table chat on commit drop as
  select public.get_or_create_direct('fe000000-0000-0000-0000-00000000000b') as id;
grant select on chat to authenticated;

set local request.jwt.claims to '{"sub":"fe000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into public.messages (conversation_id, sender_id, body)
  select id, 'fe000000-0000-0000-0000-00000000000b', 'Send me your passport scan' from chat;
create temp table msg on commit drop as
  select max(id)::text as id from public.messages where conversation_id = (select id from chat);
grant select on msg to authenticated;

-- Reporting --------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"fe000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values ('fe000000-0000-0000-0000-00000000000c', 'post', 'fe200000-0000-0000-0000-000000000001', 'spam', 'Selling followers')
$$, 'a member can report a post');
select results_eq($$
  select reporter_id::text, target_user_id::text, snapshot ->> 'body' from public.reports where target_type = 'post'
$$, $$ values ('fe000000-0000-0000-0000-00000000000a', 'fe000000-0000-0000-0000-00000000000b', 'Buy followers cheap!!!') $$,
  'the database records the real reporter, the author and a snapshot');
select throws_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values ('fe000000-0000-0000-0000-00000000000a', 'post', 'fe200000-0000-0000-0000-000000000001', 'scam')
$$, '23505', null, 'one open report per person per thing');
select lives_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values ('fe000000-0000-0000-0000-00000000000a', 'comment', 'fe300000-0000-0000-0000-000000000001', 'scam')
$$, 'a comment can be reported');
select lives_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  select 'fe000000-0000-0000-0000-00000000000a', 'message', id, 'scam' from msg
$$, 'a message in my chat can be reported');
select lives_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values ('fe000000-0000-0000-0000-00000000000a', 'profile', 'fe000000-0000-0000-0000-00000000000b', 'harassment')
$$, 'a person can be reported');
select lives_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values ('fe000000-0000-0000-0000-00000000000a', 'community', 'fe100000-0000-0000-0000-000000000001', 'spam')
$$, 'a community can be reported');
select throws_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values ('fe000000-0000-0000-0000-00000000000a', 'profile', 'fe000000-0000-0000-0000-00000000000a', 'other')
$$, '22023', null, 'nobody can report themselves');
select throws_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values ('fe000000-0000-0000-0000-00000000000a', 'post', 'fe200000-0000-0000-0000-999999999999', 'spam')
$$, 'P0002', null, 'something that does not exist cannot be reported');
select throws_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values ('fe000000-0000-0000-0000-00000000000a', 'post', 'fe200000-0000-0000-0000-000000000001', 'because')
$$, '23514', null, 'the reason is one of the listed ones');
select is((select count(*)::int from public.reports), 5, 'the reporter sees their own reports');
select throws_ok($$ update public.reports set status = 'dismissed' $$, '42501', null, 'a reporter cannot close a report');
select throws_ok($$ select public.resolve_report((select id from public.reports limit 1), true) $$,
  '42501', null, 'only admins can resolve reports');

set local request.jwt.claims to '{"sub":"fe000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$
  insert into public.reports (reporter_id, target_type, target_id, reason)
  select 'fe000000-0000-0000-0000-00000000000c', 'message', id, 'scam' from msg
$$, 'P0002', null, 'someone outside a chat cannot report (or peek at) its messages');

set local request.jwt.claims to '{"sub":"fe000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is_empty($$ select 1 from public.reports $$, 'the reported person cannot see who reported them');

-- Admin review -------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"fe000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is((select count(*)::int from public.reports where status = 'open' and reporter_id = 'fe000000-0000-0000-0000-00000000000a'), 5, 'an admin sees every open report');
select is((select snapshot ->> 'body' from public.reports where target_type = 'message' and reporter_id = 'fe000000-0000-0000-0000-00000000000a'),
  'Send me your passport scan', 'an admin can read a reported message without being in the chat');

select lives_ok($$ select public.resolve_report((select id from public.reports where target_type = 'post' and reporter_id = 'fe000000-0000-0000-0000-00000000000a'), true) $$,
  'an admin can remove a reported post');
reset role;
select isnt((select deleted_at from public.posts where id = 'fe200000-0000-0000-0000-000000000001'), null,
  'the post is removed');
set local role authenticated;
select is((select status::text from public.reports where target_type = 'post' and reporter_id = 'fe000000-0000-0000-0000-00000000000a'), 'actioned', 'its report is closed as actioned');

select lives_ok($$ select public.resolve_report((select id from public.reports where target_type = 'comment' and reporter_id = 'fe000000-0000-0000-0000-00000000000a'), false) $$,
  'an admin can dismiss a report');
reset role;
select is((select deleted_at from public.comments where id = 'fe300000-0000-0000-0000-000000000001'), null,
  'a dismissed report leaves the comment alone');
set local role authenticated;
select throws_ok($$ select public.resolve_report((select id from public.reports where target_type = 'profile' and reporter_id = 'fe000000-0000-0000-0000-00000000000a'), true) $$,
  '22023', null, 'people are suspended in the dashboard, not removed here');
select lives_ok($$ select public.resolve_report((select id from public.reports where target_type = 'community' and reporter_id = 'fe000000-0000-0000-0000-00000000000a'), true) $$,
  'an admin can remove a reported community');

select * from finish();
rollback;
