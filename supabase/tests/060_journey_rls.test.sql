-- Phase 5: Journey. Milestones are owner-only; others see only done stamps their
-- visibility allows; journey updates carry the stamp only; reminders at 9am local.
begin;
create extension if not exists pgtap with schema extensions;

select plan(49);

-- Owner (O, lives in Perth), connection (C), stranger (X), blocked (B)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('f9000000-0000-0000-0000-00000000000a', 'jo@test.dev', '{"display_name":"Journey Owner"}', 'authenticated', 'authenticated'),
  ('f9000000-0000-0000-0000-00000000000b', 'jc@test.dev', '{"display_name":"Journey Friend"}', 'authenticated', 'authenticated'),
  ('f9000000-0000-0000-0000-00000000000c', 'jx@test.dev', '{"display_name":"Journey Stranger"}', 'authenticated', 'authenticated'),
  ('f9000000-0000-0000-0000-00000000000d', 'jb@test.dev', '{"display_name":"Journey Blocked"}', 'authenticated', 'authenticated');
update public.profiles set city = 'Perth' where id = 'f9000000-0000-0000-0000-00000000000a';
insert into public.connections (requester_id, addressee_id, status)
  values ('f9000000-0000-0000-0000-00000000000a', 'f9000000-0000-0000-0000-00000000000b', 'accepted');
insert into public.blocks (blocker_id, blocked_id)
  values ('f9000000-0000-0000-0000-00000000000a', 'f9000000-0000-0000-0000-00000000000d');

-- As Owner: stamps ----------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok($$
  insert into public.milestones (id, user_id, kind, title, status, happened_on, visa_subclass, place, notes, visibility) values
    ('fa000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-00000000000a', 'visa', 'Student visa granted', 'done', '2026-02-01', '500', null, 'Case officer was lovely', 'public'),
    ('fa000000-0000-0000-0000-000000000002', 'f9000000-0000-0000-0000-00000000000a', 'arrival', 'Landed in Perth', 'done', '2026-03-01', null, 'PER', null, 'connections'),
    ('fa000000-0000-0000-0000-000000000003', 'f9000000-0000-0000-0000-00000000000a', 'work', 'First job', 'done', '2026-05-01', null, null, null, 'private')
$$, 'the owner can add done stamps');
select lives_ok($$
  insert into public.milestones (id, user_id, kind, title, status, due_on, remind_on, notes, visibility)
  values ('fa000000-0000-0000-0000-000000000004', 'f9000000-0000-0000-0000-00000000000a', 'visa', 'Visa expires', 'upcoming',
    '2027-03-15', '2026-12-02', 'Apply for the 485 before this', 'public')
$$, 'the owner can add an upcoming item with a reminder');
select throws_ok($$
  insert into public.milestones (user_id, title, status) values ('f9000000-0000-0000-0000-00000000000a', 'No date', 'done')
$$, '23514', null, 'a done stamp needs the date it happened');
select throws_ok($$
  insert into public.milestones (user_id, title, status) values ('f9000000-0000-0000-0000-00000000000a', 'No date', 'upcoming')
$$, '23514', null, 'an upcoming item needs a due date');
select throws_ok($$
  insert into public.milestones (user_id, title, status, due_on, remind_on)
  values ('f9000000-0000-0000-0000-00000000000a', 'Late', 'upcoming', '2027-01-01', '2027-02-01')
$$, '23514', null, 'a reminder cannot be after the due date');
select throws_ok($$
  insert into public.milestones (user_id, title, status, happened_on, visa_subclass)
  values ('f9000000-0000-0000-0000-00000000000a', 'Bad subclass', 'done', '2026-01-01', '50a')
$$, '23514', null, 'a visa subclass is three digits');
select throws_ok($$
  insert into public.milestones (user_id, title, status, happened_on, place)
  values ('f9000000-0000-0000-0000-00000000000a', 'Long place', 'done', '2026-01-01', 'Sydney')
$$, '23514', null, 'a place is a short code (up to 4 capitals or digits)');
select throws_ok($$
  insert into public.milestones (user_id, title, status, happened_on)
  values ('f9000000-0000-0000-0000-00000000000b', 'For you', 'done', '2026-01-01')
$$, '42501', null, 'nobody can add a milestone for someone else');
select throws_ok($$
  update public.milestones set reminded_at = now() where id = 'fa000000-0000-0000-0000-000000000004'
$$, '42501', null, 'the app cannot mark a reminder as sent');

select is((select count(*)::int from public.get_stamps('f9000000-0000-0000-0000-00000000000a')), 3,
  'the owner sees all three of their done stamps');

-- Others: stamps by visibility; never upcoming items, notes or someone blocked --------------
set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select results_eq($$ select title from public.get_stamps('f9000000-0000-0000-0000-00000000000a') order by title $$,
  $$ values ('Landed in Perth'), ('Student visa granted') $$,
  'a connection sees public and connections-only stamps');
select is_empty($$ select 1 from public.milestones where user_id = 'f9000000-0000-0000-0000-00000000000a' $$,
  'a connection cannot read the milestones themselves (notes, upcoming)');

set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select results_eq($$ select title from public.get_stamps('f9000000-0000-0000-0000-00000000000a') $$,
  $$ values ('Student visa granted') $$, 'a stranger sees only public stamps');
select is_empty($$ select 1 from public.get_stamps('f9000000-0000-0000-0000-00000000000a') where title = 'Visa expires' $$,
  'an upcoming item is never shown, even when marked public');
select is_empty($$ select 1 from public.milestones where id = 'fa000000-0000-0000-0000-000000000001' $$,
  'a stranger cannot read a milestone by id');
with u as (update public.milestones set title = 'hacked' where user_id = 'f9000000-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 0, 'a stranger cannot edit someone''s milestones') from u;
with d as (delete from public.milestones where user_id = 'f9000000-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 0, 'a stranger cannot delete someone''s milestones') from d;

set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is_empty($$ select 1 from public.get_stamps('f9000000-0000-0000-0000-00000000000a') $$,
  'someone blocked sees no stamps');

-- Linked Backpack documents ----------------------------------------------------------------
reset role;
insert into storage.objects (bucket_id, name, owner_id, metadata) values
  ('backpack', 'f9000000-0000-0000-0000-00000000000a/fb000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-00000000000a', '{"mimetype":"application/pdf","size":100}'),
  ('backpack', 'f9000000-0000-0000-0000-00000000000c/fb000000-0000-0000-0000-000000000002', 'f9000000-0000-0000-0000-00000000000c', '{"mimetype":"application/pdf","size":100}');
insert into public.documents (id, owner_id, folder_id, name, storage_path, mime_type, size_bytes, uploaded_by) values
  ('fb000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-00000000000a',
    (select id from public.backpack_folders where owner_id = 'f9000000-0000-0000-0000-00000000000a' and kind = 'visa'),
    'Grant letter', 'f9000000-0000-0000-0000-00000000000a/fb000000-0000-0000-0000-000000000001', 'application/pdf', 100, 'f9000000-0000-0000-0000-00000000000a'),
  ('fb000000-0000-0000-0000-000000000002', 'f9000000-0000-0000-0000-00000000000c',
    (select id from public.backpack_folders where owner_id = 'f9000000-0000-0000-0000-00000000000c' and kind = 'visa'),
    'Stranger file', 'f9000000-0000-0000-0000-00000000000c/fb000000-0000-0000-0000-000000000002', 'application/pdf', 100, 'f9000000-0000-0000-0000-00000000000c');
insert into public.milestones (id, user_id, title, status, happened_on)
  values ('fa000000-0000-0000-0000-000000000009', 'f9000000-0000-0000-0000-00000000000c', 'Stranger stamp', 'done', '2026-01-01');

set local role authenticated;
set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$
  insert into public.milestone_documents (milestone_id, document_id, user_id)
  values ('fa000000-0000-0000-0000-000000000001', 'fb000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-00000000000a')
$$, 'the owner can link their grant letter to their stamp');
select throws_ok($$
  insert into public.milestone_documents (milestone_id, document_id, user_id)
  values ('fa000000-0000-0000-0000-000000000001', 'fb000000-0000-0000-0000-000000000002', 'f9000000-0000-0000-0000-00000000000a')
$$, '23503', null, 'nobody can link someone else''s document');

set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$
  insert into public.milestone_documents (milestone_id, document_id, user_id)
  values ('fa000000-0000-0000-0000-000000000009', 'fb000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-00000000000c')
$$, '23503', null, 'nobody can link someone else''s document to their own stamp');
select throws_ok($$
  insert into public.milestone_documents (milestone_id, document_id, user_id)
  values ('fa000000-0000-0000-0000-000000000001', 'fb000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-00000000000a')
$$, '42501', null, 'nobody can add links in someone else''s name');
select is_empty($$ select 1 from public.milestone_documents where user_id = 'f9000000-0000-0000-0000-00000000000a' $$,
  'others cannot see which documents are linked');
with d as (delete from public.milestone_documents where user_id = 'f9000000-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 0, 'others cannot remove links') from d;

-- Journey updates: share the stamp only ------------------------------------------------------
set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$
  insert into public.posts (id, author_id, kind, body, milestone_id)
  values ('fc000000-0000-0000-0000-000000000001', 'f9000000-0000-0000-0000-00000000000a', 'journey_update', 'Visa granted!',
    'fa000000-0000-0000-0000-000000000003')
$$, 'the owner can share a done stamp, even a private one, as a journey update');
select is((select stamp from public.posts where id = 'fc000000-0000-0000-0000-000000000001'),
  '{"kind": "work", "title": "First job", "happened_on": "2026-05-01", "visa_subclass": null, "place": null}'::jsonb,
  'the post carries the stamp''s face only (no notes, no documents)');
select throws_ok($$
  insert into public.posts (author_id, kind, body, milestone_id, stamp)
  values ('f9000000-0000-0000-0000-00000000000a', 'journey_update', 'Fake', 'fa000000-0000-0000-0000-000000000001', '{"title":"PR granted"}')
$$, '42501', null, 'the app cannot write the stamp itself');
select throws_ok($$
  insert into public.posts (author_id, kind, body, milestone_id)
  values ('f9000000-0000-0000-0000-00000000000a', 'journey_update', 'Soon', 'fa000000-0000-0000-0000-000000000004')
$$, '22023', null, 'an upcoming item cannot be shared');
select throws_ok($$
  insert into public.posts (author_id, kind, body) values ('f9000000-0000-0000-0000-00000000000a', 'journey_update', 'No stamp')
$$, '22023', null, 'a journey update needs a stamp');
select throws_ok($$
  insert into public.posts (author_id, kind, body, milestone_id)
  values ('f9000000-0000-0000-0000-00000000000a', 'post', 'Sneaky', 'fa000000-0000-0000-0000-000000000001')
$$, '22023', null, 'only journey updates carry a stamp');

set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$
  insert into public.posts (author_id, kind, body, milestone_id)
  values ('f9000000-0000-0000-0000-00000000000c', 'journey_update', 'Not mine', 'fa000000-0000-0000-0000-000000000001')
$$, '22023', null, 'nobody can share someone else''s stamp');
select is((select stamp ->> 'title' from public.posts where id = 'fc000000-0000-0000-0000-000000000001'),
  'First job', 'other people see the shared stamp on the post');

-- Push tokens and notifications ----------------------------------------------------------------
set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$ select public.register_push_token('ExponentPushToken[owner-phone]', 'ios') $$,
  'the owner can register their phone for push');
select throws_ok($$ select public.register_push_token('not-a-token', 'ios') $$,
  '23514', null, 'only Expo push tokens are accepted');
select throws_ok($$ insert into public.push_tokens (token, user_id, platform) values ('ExponentPushToken[x]', 'f9000000-0000-0000-0000-00000000000a', 'ios') $$,
  '42501', null, 'tokens are only added through register_push_token');
select throws_ok($$
  insert into public.notifications (user_id, type) values ('f9000000-0000-0000-0000-00000000000a', 'milestone_reminder')
$$, '42501', null, 'the app cannot create notifications');
select throws_ok($$ select private.send_milestone_reminders() $$,
  '42501', null, 'the app cannot trigger reminders');

set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty($$ select 1 from public.push_tokens where user_id = 'f9000000-0000-0000-0000-00000000000a' $$,
  'others cannot see someone''s push tokens');
select lives_ok($$ select public.register_push_token('ExponentPushToken[owner-phone]', 'android') $$,
  'a phone that signs in as someone else moves to them');
set local request.jwt.claims to '{"sub":"f9000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is_empty($$ select 1 from public.push_tokens where token = 'ExponentPushToken[owner-phone]' $$,
  'so the previous person no longer gets its pushes');
select public.register_push_token('ExponentPushToken[owner-phone]', 'ios');

-- Reminders: 9am in Perth on 2 Dec 2026 (Perth is UTC+8) --------------------------------------
reset role;
select is(private.send_milestone_reminders('2026-12-02 00:30+00'), 0, 'nothing is sent at 8:30am Perth time');
select is(private.send_milestone_reminders('2026-12-02 01:05+00'), 1, 'the reminder is sent just after 9am Perth time');
select isnt_empty($$
  select 1 from public.notifications
  where user_id = 'f9000000-0000-0000-0000-00000000000a' and type = 'milestone_reminder'
    and entity_id = 'fa000000-0000-0000-0000-000000000004'
$$, 'it appears as an in-app notification');
select isnt_empty($$
  select 1 from net.http_request_queue
  where url = 'https://exp.host/--/api/v2/push/send'
    and convert_from(body, 'utf8') like '%ExponentPushToken[owner-phone]%'
    and convert_from(body, 'utf8') like '%/journey/fa000000-0000-0000-0000-000000000004%'
$$, 'a push to the owner''s phone is queued, opening the milestone');
select is(private.send_milestone_reminders('2026-12-02 01:20+00'), 0, 'a reminder is sent only once');
select is(private.send_milestone_reminders('2026-12-05 03:00+00'), 0, 'reminders more than two days late are skipped');
update public.milestones set remind_on = '2026-12-10' where id = 'fa000000-0000-0000-0000-000000000004';
select is((select reminded_at from public.milestones where id = 'fa000000-0000-0000-0000-000000000004'), null,
  'changing the reminder date sets up a new reminder');

-- Dead tokens: Expo says the app is gone from that phone -> stop sending to it
insert into net._http_response (id, status_code, content, created) values (987654, 200,
  '{"data":[{"status":"error","details":{"error":"DeviceNotRegistered","expoPushToken":"ExponentPushToken[owner-phone]"}}]}', now());
select is(private.prune_push_tokens(), 1, 'a token Expo reports as unregistered is pruned');
select is_empty($$ select 1 from public.push_tokens where token = 'ExponentPushToken[owner-phone]' $$,
  'so no more pushes go to that phone');

select * from finish();
rollback;
