-- Phase 7b: who gets notified, what pushes, settings, privacy.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- Poster (P), friend (F), other (O)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('fa100000-0000-0000-0000-00000000000a', 'np@test.dev', '{"display_name":"Nora Poster"}', 'authenticated', 'authenticated'),
  ('fa100000-0000-0000-0000-00000000000b', 'nf@test.dev', '{"display_name":"Finn Friend"}', 'authenticated', 'authenticated'),
  ('fa100000-0000-0000-0000-00000000000c', 'no@test.dev', '{"display_name":"Olga Other"}', 'authenticated', 'authenticated');
insert into public.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[poster]', 'fa100000-0000-0000-0000-00000000000a', 'ios'),
  ('ExponentPushToken[friend]', 'fa100000-0000-0000-0000-00000000000b', 'android');

create function pg_temp.pushes_to(tok text) returns int language sql as $$
  select count(*)::int from net.http_request_queue where convert_from(body, 'utf8') like '%' || tok || '%'
$$;

-- Poster's community + post; Friend joins (owner hears) ------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.communities (id, name, kind, created_by)
  values ('fa200000-0000-0000-0000-000000000001', 'Notify Crew', 'interest', 'fa100000-0000-0000-0000-00000000000a');
insert into public.posts (id, author_id, community_id, kind, body)
  values ('fa300000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000a', 'fa200000-0000-0000-0000-000000000001', 'post', 'Hello crew');
insert into public.comments (post_id, author_id, body)
  values ('fa300000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000a', 'My own comment');

set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000b","role":"authenticated"}';
insert into public.community_members (community_id, user_id)
  values ('fa200000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000b');
insert into public.comments (id, post_id, author_id, body)
  values ('fa400000-0000-0000-0000-000000000001', 'fa300000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000b', 'Great post!');
insert into public.post_likes (post_id, user_id) values ('fa300000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000b');
delete from public.post_likes where post_id = 'fa300000-0000-0000-0000-000000000001' and user_id = 'fa100000-0000-0000-0000-00000000000b';
insert into public.post_likes (post_id, user_id) values ('fa300000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000b');

set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000a","role":"authenticated"}';
select results_eq($$
  select type, actor_id::text, preview from public.notifications order by type
$$, $$ values
  ('comment', 'fa100000-0000-0000-0000-00000000000b', 'Great post!'),
  ('community_join', 'fa100000-0000-0000-0000-00000000000b', 'Notify Crew'),
  ('like', 'fa100000-0000-0000-0000-00000000000b', 'Hello crew')
$$, 'the poster hears about a join, a comment and one like (not their own comment, not a re-like)');

-- Poster replies to Friend's comment -> Friend gets a reply (and no "comment" on a post that isn't theirs)
insert into public.comments (post_id, author_id, parent_id, body)
  values ('fa300000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000a', 'fa400000-0000-0000-0000-000000000001', 'Thanks!');
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000b","role":"authenticated"}';
select results_eq($$ select type, preview from public.notifications $$,
  $$ values ('reply', 'Thanks!') $$, 'a reply notifies the person replied to');
select isnt_empty($$ select 1 from public.notifications where user_id = 'fa100000-0000-0000-0000-00000000000b' $$,
  'people see their own notifications');
select is_empty($$ select 1 from public.notifications where user_id = 'fa100000-0000-0000-0000-00000000000a' $$,
  'and nobody else''s');
select throws_ok($$
  insert into public.notifications (user_id, type) values ('fa100000-0000-0000-0000-00000000000a', 'like')
$$, '42501', null, 'the app cannot create notifications');
select lives_ok($$ update public.notifications set read_at = now() $$, 'people can mark theirs as read');
select is_empty($$ select 1 from public.notifications where read_at is null $$, 'and they are read');
select throws_ok($$ update public.notifications set preview = 'x' $$, '42501', null, 'but cannot change anything else');

-- Connections -------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000c","role":"authenticated"}';
insert into public.connections (requester_id, addressee_id)
  values ('fa100000-0000-0000-0000-00000000000c', 'fa100000-0000-0000-0000-00000000000b');
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000b","role":"authenticated"}';
select isnt_empty($$ select 1 from public.notifications where type = 'connection_request' $$,
  'a connection request notifies the person asked');
update public.connections set status = 'accepted'
  where requester_id = 'fa100000-0000-0000-0000-00000000000c' and addressee_id = 'fa100000-0000-0000-0000-00000000000b';
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000c","role":"authenticated"}';
select isnt_empty($$ select 1 from public.notifications where type = 'connection_accepted' $$,
  'accepting notifies the person who asked');

-- Push settings ---------------------------------------------------------------------------
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$
  insert into public.notification_settings (user_id, likes) values ('fa100000-0000-0000-0000-00000000000a', false)
$$, 'people can turn a kind of push off');
select throws_ok($$
  insert into public.notification_settings (user_id) values ('fa100000-0000-0000-0000-00000000000b')
$$, '42501', null, 'but not for someone else');
reset role;
select is(pg_temp.pushes_to('ExponentPushToken[poster]'), 3, 'pushes so far: the join, the comment and the like');
set local role authenticated;
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000c","role":"authenticated"}';
insert into public.community_members (community_id, user_id)
  values ('fa200000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000c');
insert into public.post_likes (post_id, user_id) values ('fa300000-0000-0000-0000-000000000001', 'fa100000-0000-0000-0000-00000000000c');
reset role;
select is(pg_temp.pushes_to('ExponentPushToken[poster]'), 4, 'with likes off, the like pushes nothing (the join still does)');
select is((select count(*)::int from public.notifications where user_id = 'fa100000-0000-0000-0000-00000000000a' and type = 'like'), 2,
  'but the like is still in the list');

-- Messages: push only; direct and group yes; community room, muted and sender no ---------
set local role authenticated;
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000a","role":"authenticated"}';
create temp table dm on commit drop as select public.get_or_create_direct('fa100000-0000-0000-0000-00000000000b') as id;
grant select on dm to authenticated;
insert into public.messages (conversation_id, sender_id, body)
  select id, 'fa100000-0000-0000-0000-00000000000a', 'Hi Finn' from dm;
reset role;
-- Finn already had 2 pushes (the reply and the connection request).
select is(pg_temp.pushes_to('ExponentPushToken[friend]'), 3, 'a direct message pushes to the other person');
select is((select count(*)::int from public.notifications where type = 'message'), 0, 'messages don''t go in the list');
select is(pg_temp.pushes_to('ExponentPushToken[poster]'), 4, 'the sender gets no push');

set local role authenticated;
insert into public.messages (conversation_id, sender_id, body)
  select id, 'fa100000-0000-0000-0000-00000000000a', 'Hello room' from public.conversations
  where community_id = 'fa200000-0000-0000-0000-000000000001';
reset role;
select is(pg_temp.pushes_to('ExponentPushToken[friend]'), 3, 'community chat rooms never push');

set local role authenticated;
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000b","role":"authenticated"}';
update public.conversation_members set muted = true
  where conversation_id = (select id from dm) and user_id = 'fa100000-0000-0000-0000-00000000000b';
set local request.jwt.claims to '{"sub":"fa100000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.messages (conversation_id, sender_id, body)
  select id, 'fa100000-0000-0000-0000-00000000000a', 'Still there?' from dm;
reset role;
select is(pg_temp.pushes_to('ExponentPushToken[friend]'), 3, 'a muted chat doesn''t push');

-- Blocks: nobody is notified by someone they blocked -----------------------------------------
insert into public.blocks (blocker_id, blocked_id)
  values ('fa100000-0000-0000-0000-00000000000a', 'fa100000-0000-0000-0000-00000000000c');
select private.notify('fa100000-0000-0000-0000-00000000000a', 'like', 'fa100000-0000-0000-0000-00000000000c',
  'post', 'x', 'x', 'likes', 'x', 'x', '/');
select is((select count(*)::int from public.notifications where user_id = 'fa100000-0000-0000-0000-00000000000a'
  and actor_id = 'fa100000-0000-0000-0000-00000000000c' and entity_id = 'x'), 0,
  'someone blocked can''t notify you');

select * from finish();
rollback;
