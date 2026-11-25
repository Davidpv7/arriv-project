-- Local demo data. Applied by `npx supabase db reset` (never on the hosted project).
-- Phase 2 adds six communities with posts, comments and likes (below).
-- Sign in with any of these, password: arriv-demo-1
--   ana@arriv.test   (onboarded, Brazil → Sydney, visa 500, connected to Mateo)
--   mateo@arriv.test (onboarded, Colombia → Melbourne, visa 485 public)
--   lina@arriv.test  (not onboarded yet: lands in onboarding)

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'ana@arriv.test', 'Ana Costa'),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'mateo@arriv.test', 'Mateo Rojas'),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'lina@arriv.test', 'Lina Park')
    ) as t(id, email, display_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('arriv-demo-1', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.display_name),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

update public.profiles set
  bio = 'Nurse from São Paulo. Ask me about studying in Sydney!',
  origin_country = 'BR', city = 'Sydney', arrived_on = current_date - 412, onboarded_at = now()
where id = '11111111-1111-4111-8111-111111111111';

update public.profiles set
  bio = 'Engineer, coffee nerd, still learning to love Vegemite.',
  origin_country = 'CO', city = 'Melbourne', arrived_on = current_date - 900, onboarded_at = now()
where id = '22222222-2222-4222-8222-222222222222';

update public.profile_visas set visa_subclass = '500', visibility = 'connections'
where user_id = '11111111-1111-4111-8111-111111111111';
update public.profile_visas set visa_subclass = '485', visibility = 'public'
where user_id = '22222222-2222-4222-8222-222222222222';

insert into public.connections (requester_id, addressee_id, status, accepted_at) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'accepted', now());

-- ---------------------------------------------------------------------------
-- Phase 2: communities, posts, comments, likes
-- (creating a community makes its creator the owner via trigger)
-- ---------------------------------------------------------------------------
insert into public.communities (id, name, description, kind, city, language, visa_subclass, tags, stamp_color, created_by) values
  ('c0000000-0000-4000-8000-000000000001', 'Sydney Newcomers', 'Just landed in Sydney? Ask anything: suburbs, banks, Opal cards, first jobs.', 'city', 'Sydney', null, null, '{newcomers,housing}', 'sky', '11111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000002', 'Latinos en Sydney', 'La comunidad latina de Sydney: eventos, trabajo y apoyo.', 'language', 'Sydney', 'es', null, '{latam,events}', 'tangerine', '22222222-2222-4222-8222-222222222222'),
  ('c0000000-0000-4000-8000-000000000003', 'Student Visa 500 Crew', 'Studying in Australia on a 500. Share your experience with enrolments, work hours and renewals.', 'visa', null, null, '500', '{students}', 'sunshine', '11111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000004', 'Melbourne Movers', 'New to Melbourne? Coffee, trams and finding a rental.', 'city', 'Melbourne', null, null, '{newcomers}', 'card', '22222222-2222-4222-8222-222222222222'),
  ('c0000000-0000-4000-8000-000000000005', 'Brasileiros na Austrália', 'Comunidade brasileira na Austrália.', 'culture', null, 'pt', null, '{brasil}', 'sky', '11111111-1111-4111-8111-111111111111'),
  ('c0000000-0000-4000-8000-000000000006', 'Sponsored Workers 482', 'On a 482? Talk about sponsors, skills assessments and the path ahead.', 'visa', null, null, '482', '{work}', 'tangerine', '22222222-2222-4222-8222-222222222222');

insert into public.community_members (community_id, user_id) values
  ('c0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222'),
  ('c0000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222'),
  ('c0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111');

insert into public.posts (id, author_id, community_id, kind, body, created_at) values
  ('d0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'c0000000-0000-4000-8000-000000000001', 'question',
   'Which bank did you open your first account with? I''m trying to choose before my first payday.', now() - interval '3 hours'),
  ('d0000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'c0000000-0000-4000-8000-000000000001', 'post',
   'Tip for newcomers: the Opal card caps your weekly fares. Sunday travel is cheap too!', now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'c0000000-0000-4000-8000-000000000003', 'post',
   'Reminder from my own experience: check your enrolment dates before booking flights home. Always confirm details on the official Home Affairs website.', now() - interval '2 days'),
  ('d0000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', null, 'post',
   'One year in Sydney today. Thank you to everyone who answered my questions here!', now() - interval '5 days');

insert into public.comments (id, post_id, author_id, parent_id, body, created_at) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', null,
   'I went with a big bank because the branch was near work, but compare the fees first.', now() - interval '2 hours'),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'e0000000-0000-4000-8000-000000000001',
   'Thanks Mateo, that helps!', now() - interval '1 hour');

insert into public.post_likes (post_id, user_id) values
  ('d0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222'),
  ('d0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111'),
  ('d0000000-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222');

-- ---------------------------------------------------------------------------
-- Phase 3: chat (community rooms come from the communities trigger)
-- Ana ↔ Mateo direct chat, a small group, and a few messages in Sydney Newcomers.
-- ---------------------------------------------------------------------------
insert into public.conversations (id, kind, title, created_by) values
  ('a0000000-0000-4000-8000-000000000001', 'direct', null, '11111111-1111-4111-8111-111111111111'),
  ('a0000000-0000-4000-8000-000000000002', 'group', 'Sydney flat hunt', '11111111-1111-4111-8111-111111111111');

insert into public.conversation_members (conversation_id, user_id, role, last_read_at) values
  ('a0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'member', now() - interval '1 day'),
  ('a0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'member', now()),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'owner', now()),
  ('a0000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'member', now()),
  ('a0000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'member', now());

insert into public.messages (conversation_id, sender_id, body, created_at)
select v.conversation_id, v.sender_id, v.body, now() - v.ago
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, '11111111-1111-4111-8111-111111111111'::uuid, 'Hey Mateo! Thanks for the bank tip.', interval '2 days'),
  ('a0000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'No worries! Are you coming to the meetup on Saturday?', interval '20 hours'),
  ('a0000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Made this group so we can share rental listings.', interval '6 hours'),
  ('a0000000-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'Great idea, I''m looking near Newtown.', interval '5 hours'),
  ((select id from public.conversations where community_id = 'c0000000-0000-4000-8000-000000000001'),
   '22222222-2222-4222-8222-222222222222', 'Welcome to everyone who landed this week!', interval '4 hours'),
  ((select id from public.conversations where community_id = 'c0000000-0000-4000-8000-000000000001'),
   '11111111-1111-4111-8111-111111111111', 'Thanks! Anyone know a good place for a cheap SIM?', interval '3 hours')
) as v(conversation_id, sender_id, body, ago)
order by v.ago desc;

-- Demo messages are backdated; push the still-empty rooms below them in the inbox.
update public.conversations c set last_message_at = now() - interval '7 days'
where not exists (select 1 from public.messages m where m.conversation_id = c.id);
