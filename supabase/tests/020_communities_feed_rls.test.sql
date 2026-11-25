-- Phase 2 RLS: communities, members, posts, media, comments, likes, feed.
begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

-- Owner (O), member (B), outsider (X)
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'o@test.dev', '{"display_name":"Owner Olga"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@test.dev', '{"display_name":"Member Ben"}', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-00000000000c', 'x@test.dev', '{"display_name":"Outsider Xi"}', 'authenticated', 'authenticated');
update public.profiles set city = 'Perth' where id = 'bbbbbbbb-0000-0000-0000-00000000000c';

insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('bbbbbbbb-0000-0000-0000-00000000000d', 'jose@test.dev', '{"display_name":"José Núñez"}', 'authenticated', 'authenticated');
select is((select handle::text from public.profiles where id = 'bbbbbbbb-0000-0000-0000-00000000000d'),
  'josenunez', 'handles strip accents');

-- As Owner: create a community ------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok($$
  insert into public.communities (id, name, kind, city, created_by)
  values ('cccccccc-0000-0000-0000-000000000001', 'Perth Test Crew!', 'city', 'Perth', 'bbbbbbbb-0000-0000-0000-00000000000a')
$$, 'anyone can create a community');
select is((select slug::text from public.communities where id = 'cccccccc-0000-0000-0000-000000000001'),
  'perth-test-crew', 'slug is generated from the name');
insert into public.communities (id, name, kind, created_by)
  values ('cccccccc-0000-0000-0000-000000000002', 'Brasileiros na Austrália', 'culture', 'bbbbbbbb-0000-0000-0000-00000000000a');
select matches((select slug::text from public.communities where id = 'cccccccc-0000-0000-0000-000000000002'),
  '^brasileiros-na-australia(-[0-9]{4})?$', 'slugs strip accents');
select is((select role::text from public.community_members
  where community_id = 'cccccccc-0000-0000-0000-000000000001' and user_id = 'bbbbbbbb-0000-0000-0000-00000000000a'),
  'owner', 'the creator becomes owner');
select is((select member_count from public.communities where id = 'cccccccc-0000-0000-0000-000000000001'),
  1, 'member_count counts the owner');
select throws_ok($$
  insert into public.communities (name, kind, created_by) values ('Someone Else', 'city', 'bbbbbbbb-0000-0000-0000-00000000000b')
$$, '42501', null, 'cannot create a community as someone else');
select throws_ok($$
  insert into public.communities (name, kind, created_by, member_count) values ('Fake Count', 'city', 'bbbbbbbb-0000-0000-0000-00000000000a', 999)
$$, '42501', null, 'cannot set member_count');
with d as (delete from public.community_members
  where community_id = 'cccccccc-0000-0000-0000-000000000001' and user_id = 'bbbbbbbb-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 0, 'the owner cannot simply leave') from d;

-- As Ben: join and post --------------------------------------------------------
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select lives_ok($$
  insert into public.community_members (community_id, user_id) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b')
$$, 'a user can join');
select is((select member_count from public.communities where id = 'cccccccc-0000-0000-0000-000000000001'),
  2, 'joining updates member_count');
select throws_ok($$
  insert into public.community_members (community_id, user_id, role) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 'owner')
$$, '42501', null, 'cannot join as owner');
select throws_ok($$
  insert into public.community_members (community_id, user_id) values ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000c')
$$, '42501', null, 'cannot add someone else');
select lives_ok($$
  insert into public.posts (id, author_id, community_id, kind, body)
  values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-000000000001', 'question', 'Best suburb for students?')
$$, 'a member can post in the community');
select throws_ok($$
  insert into public.posts (author_id, community_id, body, like_count) values ('bbbbbbbb-0000-0000-0000-00000000000b', 'cccccccc-0000-0000-0000-000000000001', 'x', 50)
$$, '42501', null, 'cannot set like_count');
select lives_ok($$
  insert into public.post_media (post_id, storage_path, position)
  values ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001/a.jpg', 0)
$$, 'the author can attach an image');
select throws_ok($$
  insert into public.post_media (post_id, storage_path, position)
  values ('dddddddd-0000-0000-0000-000000000001', 'somewhere-else/b.jpg', 1)
$$, '23514', null, 'image path must sit under the post id');
select isnt_empty($$ select 1 from public.get_home_feed() where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'own post is in the home feed');

-- As Xi: outsider ---------------------------------------------------------------
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$
  insert into public.posts (author_id, community_id, body) values ('bbbbbbbb-0000-0000-0000-00000000000c', 'cccccccc-0000-0000-0000-000000000001', 'hi')
$$, '42501', null, 'a non-member cannot post in the community');
select isnt_empty($$ select 1 from public.posts where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'anyone signed in can read a public community post');
select is_empty($$ select 1 from public.get_home_feed() where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'the post is not in a non-member''s home feed');
select is((select id::text from public.suggest_communities() limit 1),
  'cccccccc-0000-0000-0000-000000000001', 'suggestions put the same-city crew first');
select throws_ok($$
  insert into public.post_media (post_id, storage_path, position)
  values ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001/x.jpg', 2)
$$, '42501', null, 'only the author can attach images');
select lives_ok($$
  insert into public.comments (id, post_id, author_id, body)
  values ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000c', 'Try Subiaco!')
$$, 'anyone who can read the post can comment');
select lives_ok($$
  insert into public.comments (id, post_id, author_id, parent_id, body)
  values ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000c', 'eeeeeeee-0000-0000-0000-000000000001', 'Or Leederville')
$$, 'a reply to a top-level comment works');
select throws_ok($$
  insert into public.comments (post_id, author_id, parent_id, body)
  values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000c', 'eeeeeeee-0000-0000-0000-000000000002', 'too deep')
$$, '23514', null, 'replies are one level deep');
select lives_ok($$ insert into public.post_likes (post_id, user_id) values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000c') $$,
  'a reader can like');
select throws_ok($$ insert into public.post_likes (post_id, user_id) values ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000a') $$,
  '42501', null, 'cannot like on someone else''s behalf');
select results_eq($$ select like_count, comment_count from public.posts where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  $$ values (1, 2) $$, 'like and comment counts are kept by triggers');
with u as (update public.posts set body = 'hacked' where id = 'dddddddd-0000-0000-0000-000000000001' returning 1)
select is(count(*)::int, 0, 'cannot edit someone else''s post') from u;
select throws_ok($$ select public.delete_post('dddddddd-0000-0000-0000-000000000001') $$,
  '42501', null, 'cannot delete someone else''s post');

-- Ben blocks Xi -----------------------------------------------------------------
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok($$ select public.delete_comment('eeeeeeee-0000-0000-0000-000000000002') $$,
  '42501', null, 'a post author who is not a moderator cannot delete others'' comments');
insert into public.blocks (blocker_id, blocked_id) values ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-00000000000c');
select is_empty($$ select 1 from public.comments where author_id = 'bbbbbbbb-0000-0000-0000-00000000000c' $$,
  'a blocker no longer sees the blocked person''s comments');

set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty($$ select 1 from public.posts where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'a blocked person no longer sees the blocker''s posts');

-- Owner moderates ---------------------------------------------------------------
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$ select public.delete_post('dddddddd-0000-0000-0000-000000000001') $$,
  'the community owner can remove a post');
select is_empty($$ select 1 from public.posts where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'a removed post disappears');
reset role;
select isnt(
  (select deleted_at from public.posts where id = 'dddddddd-0000-0000-0000-000000000001'),
  null, 'removal is a soft delete');

select * from finish();
rollback;
