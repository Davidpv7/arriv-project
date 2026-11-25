-- Phase 3 RLS: conversations, members, messages, chat-attachments, RPCs.
begin;
create extension if not exists pgtap with schema extensions;

select plan(64);

-- Owner (O), member (M), outsider (X), friend (F)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('f0000000-0000-0000-0000-00000000000a', 'co@test.dev', '{"display_name":"Chat Owner"}', 'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-00000000000b', 'cm@test.dev', '{"display_name":"Chat Member"}', 'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-00000000000c', 'cx@test.dev', '{"display_name":"Chat Outsider"}', 'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-00000000000d', 'cf@test.dev', '{"display_name":"Chat Friend"}', 'authenticated', 'authenticated');

-- Backfill: every community (seeded before this test) has a chat room with its members.
select is_empty($$
  select 1 from public.communities c
  where not exists (select 1 from public.conversations v where v.community_id = c.id and v.kind = 'community')
$$, 'every community has a chat room');
select is_empty($$
  select 1 from public.community_members cm
  join public.conversations v on v.community_id = cm.community_id
  where not exists (select 1 from public.conversation_members m where m.conversation_id = v.id and m.user_id = cm.user_id)
$$, 'every community member is in its chat room');

-- As Owner: create a community -> its chat room ------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

insert into public.communities (id, name, kind, created_by)
  values ('f1000000-0000-0000-0000-000000000001', 'Chat Test Crew', 'interest', 'f0000000-0000-0000-0000-00000000000a');
create temp table room on commit drop as
  select id from public.conversations where community_id = 'f1000000-0000-0000-0000-000000000001';
grant select on room to authenticated;

select is((select count(*)::int from room), 1, 'creating a community creates its chat room');
select is((select role::text from public.conversation_members
  where conversation_id = (select id from room) and user_id = 'f0000000-0000-0000-0000-00000000000a'),
  'owner', 'the community owner owns its chat room');
select throws_ok($$ insert into public.conversations (kind, title) values ('group', 'sneaky') $$,
  '42501', null, 'conversations cannot be inserted directly');
select throws_ok($$
  insert into public.conversation_members (conversation_id, user_id)
  select id, 'f0000000-0000-0000-0000-00000000000c' from room
$$, '42501', null, 'members cannot be added directly');

-- As Member: join -> chat ---------------------------------------------------------
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into public.community_members (community_id, user_id)
  values ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-00000000000b');
select isnt_empty($$ select 1 from public.conversations where id = (select id from room) $$,
  'joining a community adds you to its chat room');
select lives_ok($$
  insert into public.messages (conversation_id, sender_id, body)
  select id, 'f0000000-0000-0000-0000-00000000000b', 'G''day crew!' from room
$$, 'a member can send a message');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body)
  select id, 'f0000000-0000-0000-0000-00000000000a', 'pretending' from room
$$, '42501', null, 'cannot send as someone else');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body)
  select id, 'f0000000-0000-0000-0000-00000000000b', '   ' from room
$$, '23514', null, 'an empty message is rejected');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, attachment_path, attachment_name, attachment_mime)
  select id, 'f0000000-0000-0000-0000-00000000000b', 'elsewhere/x.pdf', 'x.pdf', 'application/pdf' from room
$$, '23514', null, 'an attachment must sit under its conversation');
select lives_ok($$
  insert into public.messages (conversation_id, sender_id, attachment_path, attachment_name, attachment_mime)
  select id, 'f0000000-0000-0000-0000-00000000000b', id::text || '/f2000000-0000-0000-0000-000000000001-lease.pdf', 'lease.pdf', 'application/pdf' from room
$$, 'a member can send an attachment');
select isnt((select last_message_at from public.conversations where id = (select id from room)),
  null, 'sending updates last_message_at');

-- Edit own message
update public.messages set body = 'G''day crew! (edited)'
  where sender_id = 'f0000000-0000-0000-0000-00000000000b' and body = 'G''day crew!';
select isnt((select edited_at from public.messages where body = 'G''day crew! (edited)'),
  null, 'editing sets edited_at');

-- As Owner: read state and moderation ---------------------------------------------
-- (one transaction: now() doesn't move, so backdate the owner's read time)
reset role;
update public.conversation_members set last_read_at = now() - interval '1 hour'
  where conversation_id = (select id from room) and user_id = 'f0000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.messages where conversation_id = (select id from room)),
  2, 'another member reads the messages');
select is((select unread_count from public.get_inbox() where conversation_id = (select id from room)),
  2, 'the inbox counts unread messages');
with u as (update public.messages set body = 'hijacked'
  where sender_id = 'f0000000-0000-0000-0000-00000000000b' returning 1)
select is(count(*)::int, 0, 'cannot edit someone else''s message') from u;
update public.conversation_members set last_read_at = now() + interval '1 second'
  where conversation_id = (select id from room) and user_id = 'f0000000-0000-0000-0000-00000000000a';
select is((select unread_count from public.get_inbox() where conversation_id = (select id from room)),
  0, 'marking read clears the unread count');
with u as (update public.conversation_members set muted = true
  where conversation_id = (select id from room) and user_id = 'f0000000-0000-0000-0000-00000000000b' returning 1)
select is(count(*)::int, 0, 'cannot change someone else''s read state or mute') from u;
select lives_ok($$
  select public.delete_message((select id from public.messages where body = 'G''day crew! (edited)'))
$$, 'the community owner can remove a message');
select is((select count(*)::int from public.messages where conversation_id = (select id from room)),
  1, 'a removed message disappears');

-- As Outsider: the Phase 3 "done when" check -----------------------------------------
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty($$ select 1 from public.messages where conversation_id = (select id from room) $$,
  'a non-member cannot read the community chat');
select is_empty($$ select 1 from public.conversations where id = (select id from room) $$,
  'a non-member cannot see the conversation');
select is_empty($$ select 1 from public.conversation_members where conversation_id = (select id from room) $$,
  'a non-member cannot see who is in the chat');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body)
  select id, 'f0000000-0000-0000-0000-00000000000c', 'let me in' from room
$$, '42501', null, 'a non-member cannot send');
select throws_ok($$ select public.delete_message((select max(id) from public.messages)) $$,
  'P0002', null, 'a non-member cannot even find a message to delete');

-- Storage: chat-attachments ----------------------------------------------------------
reset role;
insert into storage.objects (bucket_id, name, owner_id)
select 'chat-attachments', id::text || '/f2000000-0000-0000-0000-000000000001-lease.pdf', 'f0000000-0000-0000-0000-00000000000b'
from room;
set local role authenticated;
select is_empty($$ select 1 from storage.objects where bucket_id = 'chat-attachments' $$,
  'a non-member cannot read a chat attachment, even with its path');
select throws_ok($$
  insert into storage.objects (bucket_id, name, owner_id)
  select 'chat-attachments', id::text || '/f2000000-0000-0000-0000-000000000002-x.pdf', 'f0000000-0000-0000-0000-00000000000c' from room
$$, '42501', null, 'a non-member cannot upload into the chat');
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select isnt_empty($$ select 1 from storage.objects where bucket_id = 'chat-attachments' $$,
  'a member can read the chat attachment');

-- Leaving the community -> leaves the chat ------------------------------------------
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
delete from public.community_members
  where community_id = 'f1000000-0000-0000-0000-000000000001' and user_id = 'f0000000-0000-0000-0000-00000000000b';
select is_empty($$ select 1 from public.messages where conversation_id = (select id from room) $$,
  'leaving the community removes access to its chat');

-- Direct messages ---------------------------------------------------------------------
create temp table dm (id uuid) on commit drop;
grant select, insert on dm to authenticated;
insert into dm select public.get_or_create_direct('f0000000-0000-0000-0000-00000000000d');
select isnt((select id from dm), null, 'a direct conversation is created');
select is(public.get_or_create_direct('f0000000-0000-0000-0000-00000000000d'), (select id from dm),
  'the same pair gets the same conversation');
select throws_ok($$ select public.get_or_create_direct('f0000000-0000-0000-0000-00000000000b') $$,
  '22023', null, 'cannot message yourself');
insert into public.messages (conversation_id, sender_id, body)
  select id, 'f0000000-0000-0000-0000-00000000000b', 'Hi Friend' from dm;
with d as (delete from public.conversation_members
  where conversation_id = (select id from dm) and user_id = 'f0000000-0000-0000-0000-00000000000b' returning 1)
select is(count(*)::int, 0, 'a direct conversation cannot be left') from d;

set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is(public.get_or_create_direct('f0000000-0000-0000-0000-00000000000b'), (select id from dm),
  'the other person gets the same conversation');
select is((select other_user_id from public.get_inbox() where conversation_id = (select id from dm)),
  'f0000000-0000-0000-0000-00000000000b'::uuid, 'the inbox shows who the direct chat is with');

set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty($$ select 1 from public.messages where conversation_id = (select id from dm) $$,
  'a third person cannot read a direct conversation');

-- Friend blocks Member
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000d","role":"authenticated"}';
insert into public.blocks (blocker_id, blocked_id)
  values ('f0000000-0000-0000-0000-00000000000d', 'f0000000-0000-0000-0000-00000000000b');
select is_empty($$ select 1 from public.messages where conversation_id = (select id from dm) $$,
  'a blocker no longer sees the blocked person''s messages');
select is_empty($$ select 1 from public.get_inbox() where conversation_id = (select id from dm) $$,
  'a direct chat with a blocked person leaves the inbox');

set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body)
  select id, 'f0000000-0000-0000-0000-00000000000b', 'are you there?' from dm
$$, '42501', null, 'a blocked person cannot send in the direct chat');
select throws_ok($$ select public.get_or_create_direct('f0000000-0000-0000-0000-00000000000d') $$,
  'P0002', null, 'a blocked person cannot start a direct chat');

-- Groups: adding people is an invite they accept or decline ---------------------------
-- (Owner is not in a block with anyone; Friend blocked Member above.)
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
create temp table grp (id uuid) on commit drop;
grant select, insert on grp to authenticated;
insert into grp select public.create_group('Flatmates', array[
  'f0000000-0000-0000-0000-00000000000b', 'f0000000-0000-0000-0000-00000000000d']::uuid[]);
select is((select count(*)::int from public.conversation_members where conversation_id = (select id from grp)),
  1, 'a new group holds only its creator');
select is((select count(*)::int from public.conversation_invites where conversation_id = (select id from grp)),
  2, 'everyone else is invited, not added');
select throws_ok($$ select public.create_group('Just me', array['f0000000-0000-0000-0000-00000000000a']::uuid[]) $$,
  '22023', null, 'a group needs at least one invitee');
select throws_ok($$ select public.create_group('  ', array['f0000000-0000-0000-0000-00000000000b']::uuid[]) $$,
  '22023', null, 'a group needs a name');
select throws_ok($$
  insert into public.conversation_invites (conversation_id, invitee_id) select id, 'f0000000-0000-0000-0000-00000000000c' from grp
$$, '42501', null, 'invites cannot be inserted directly');

-- Invitee: sees the group's name, not its messages; then accepts
insert into public.messages (conversation_id, sender_id, body)
  select id, 'f0000000-0000-0000-0000-00000000000a', 'Welcome, flatmates' from grp;
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select title from public.conversations where id = (select id from grp)),
  'Flatmates', 'an invitee can see the group''s name');
select is_empty($$ select 1 from public.messages where conversation_id = (select id from grp) $$,
  'an invitee cannot read messages before accepting');
select throws_ok($$
  insert into public.messages (conversation_id, sender_id, body) select id, 'f0000000-0000-0000-0000-00000000000b', 'hi' from grp
$$, '42501', null, 'an invitee cannot send before accepting');
select is_empty($$ select 1 from public.get_inbox() where conversation_id = (select id from grp) $$,
  'a pending group is not in the inbox');
select lives_ok($$ select public.respond_to_group_invite((select id from grp), true) $$, 'an invitee can accept');
select isnt_empty($$ select 1 from public.messages where conversation_id = (select id from grp) $$,
  'after accepting, the messages are readable');
select throws_ok($$ select public.respond_to_group_invite((select id from grp), true) $$,
  'P0002', null, 'an invite is used once');
-- Members can invite more people (Outsider here)
select is(public.invite_to_group((select id from grp), array['f0000000-0000-0000-0000-00000000000c']::uuid[]),
  1, 'any member can invite more people');
with u as (update public.conversations set title = 'Renamed' where id = (select id from grp) returning 1)
select is(count(*)::int, 0, 'a plain member cannot rename the group') from u;

-- Friend declines
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select lives_ok($$ select public.respond_to_group_invite((select id from grp), false) $$, 'an invitee can decline');
select is_empty($$ select 1 from public.conversations where id = (select id from grp) $$,
  'after declining, the group is no longer visible');

-- Outsider (invited by Member): still can't read; can't invite into a group they aren't in
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty($$ select 1 from public.messages where conversation_id = (select id from grp) $$,
  'a pending invitee still cannot read the group');
select throws_ok($$ select public.invite_to_group((select id from grp), array['f0000000-0000-0000-0000-00000000000d']::uuid[]) $$,
  'P0002', null, 'only members can invite');

-- Owner renames, then leaves: the longest-standing member takes over
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$ update public.conversations set title = 'Flat 4B' where id = (select id from grp) $$,
  'the group owner can rename it');
select lives_ok($$
  delete from public.conversation_members
  where conversation_id = (select id from grp) and user_id = 'f0000000-0000-0000-0000-00000000000a'
$$, 'a member can leave a group');
reset role;
select is((select role::text from public.conversation_members
  where conversation_id = (select id from grp) and user_id = 'f0000000-0000-0000-0000-00000000000b'),
  'owner', 'when the owner leaves, the next member becomes owner');
delete from public.conversation_members where conversation_id = (select id from grp);
select is_empty($$ select 1 from public.conversations where id = (select id from grp) $$,
  'a group with nobody left is removed');

-- Group cap (members + pending invites)
insert into auth.users (id, email, aud, role)
select ('f3000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'cap' || n || '@test.dev', 'authenticated', 'authenticated'
from generate_series(1, 50) n;
set local role authenticated;
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$
  select public.create_group('Too many', array(
    select ('f3000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 50) n))
$$, '23514', null, 'a group holds up to 50 people');

select * from finish();
rollback;
