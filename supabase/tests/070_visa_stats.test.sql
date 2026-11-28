-- Visa stats: lodged dates on visa stamps, opt-in sharing, and totals that only
-- appear for groups of 5 or more. Others still never read anyone's milestones.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

-- Seven members: S1..S6 share (or not) their 500 visas; V only looks.
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('fb000000-0000-0000-0000-000000000001', 'vs1@test.dev', '{"display_name":"Stats One"}', 'authenticated', 'authenticated'),
  ('fb000000-0000-0000-0000-000000000002', 'vs2@test.dev', '{"display_name":"Stats Two"}', 'authenticated', 'authenticated'),
  ('fb000000-0000-0000-0000-000000000003', 'vs3@test.dev', '{"display_name":"Stats Three"}', 'authenticated', 'authenticated'),
  ('fb000000-0000-0000-0000-000000000004', 'vs4@test.dev', '{"display_name":"Stats Four"}', 'authenticated', 'authenticated'),
  ('fb000000-0000-0000-0000-000000000005', 'vs5@test.dev', '{"display_name":"Stats Five"}', 'authenticated', 'authenticated'),
  ('fb000000-0000-0000-0000-000000000006', 'vs6@test.dev', '{"display_name":"Stats Six"}', 'authenticated', 'authenticated'),
  ('fb000000-0000-0000-0000-00000000000f', 'vsv@test.dev', '{"display_name":"Stats Viewer"}', 'authenticated', 'authenticated');

create temp table today as select (now() at time zone 'Australia/Sydney')::date as d;
grant select on today to authenticated, anon;

-- As S1: the rules on lodged dates -------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-0000-0000-000000000001","role":"authenticated"}';

select lives_ok($$
  insert into public.milestones (id, user_id, kind, title, status, lodged_on, visa_subclass, share_stats)
  values ('fc000000-0000-0000-0000-000000000001', 'fb000000-0000-0000-0000-000000000001', 'visa',
    'Student visa lodged', 'upcoming', (select d - 39 from today), '500', true)
$$, 'a visa can be "still waiting": lodged, no due date, shared for stats');
select throws_ok($$
  insert into public.milestones (user_id, kind, title, status, happened_on, lodged_on)
  values ('fb000000-0000-0000-0000-000000000001', 'work', 'Job', 'done', '2026-05-01', '2026-04-01')
$$, '23514', null, 'only visa stamps have a lodged date');
select throws_ok($$
  insert into public.milestones (user_id, kind, title, status, happened_on, lodged_on, visa_subclass)
  values ('fb000000-0000-0000-0000-000000000001', 'visa', 'Granted', 'done', '2026-04-01', '2026-05-01', '500')
$$, '23514', null, 'a visa cannot be lodged after it was granted');
select throws_ok($$
  insert into public.milestones (user_id, kind, title, status, happened_on, visa_subclass, share_stats)
  values ('fb000000-0000-0000-0000-000000000001', 'visa', 'Granted', 'done', '2026-04-01', '500', true)
$$, '23514', null, 'sharing for stats needs a lodged date');
select throws_ok($$
  insert into public.milestones (user_id, kind, title, status, happened_on, lodged_on, share_stats)
  values ('fb000000-0000-0000-0000-000000000001', 'visa', 'Granted', 'done', '2026-04-01', '2026-03-01', true)
$$, '23514', null, 'sharing for stats needs a subclass');
select throws_ok($$
  insert into public.milestones (user_id, kind, title, status, due_on, lodged_on)
  values ('fb000000-0000-0000-0000-000000000001', 'visa', 'Both', 'upcoming', '2027-01-01', '2026-04-01')
$$, '23514', null, 'an upcoming item is either waiting (lodged) or due, not both');
select throws_ok($$
  insert into public.milestones (user_id, kind, title, status, lodged_on, remind_on)
  values ('fb000000-0000-0000-0000-000000000001', 'visa', 'Waiting', 'upcoming', '2026-04-01', '2027-01-01')
$$, '23514', null, 'a reminder needs a due date');
select lives_ok($$
  update public.milestones set share_stats = false where id = 'fc000000-0000-0000-0000-000000000001'
$$, 'the owner can stop sharing a stamp');
select lives_ok($$
  update public.milestones set share_stats = true where id = 'fc000000-0000-0000-0000-000000000001'
$$, 'and share it again');

-- Seed: S1..S4 granted after 10, 20, 30, 40 days (S1's waiting stamp is granted). ---------
reset role;
update public.milestones set status = 'done', happened_on = (select d - 29 from today)
  where id = 'fc000000-0000-0000-0000-000000000001';
insert into public.milestones (user_id, kind, title, status, lodged_on, happened_on, visa_subclass, share_stats)
select u, 'visa', 'Student visa granted', 'done', t.d - 3 - w, t.d - 3, '500', true
from today t, (values
  ('fb000000-0000-0000-0000-000000000002'::uuid, 20),
  ('fb000000-0000-0000-0000-000000000003'::uuid, 30),
  ('fb000000-0000-0000-0000-000000000004'::uuid, 40)
) as s(u, w);
-- S6 was granted too, but doesn't share: never counted.
insert into public.milestones (user_id, kind, title, status, lodged_on, happened_on, visa_subclass, share_stats)
select 'fb000000-0000-0000-0000-000000000006', 'visa', 'Student visa granted', 'done', d - 900, d - 2, '500', false
from today;

-- As V: four sharers are not enough ---------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-0000-0000-00000000000f","role":"authenticated"}';

select is(
  (select count(*)::int from public.milestones where user_id <> 'fb000000-0000-0000-0000-00000000000f'),
  0, 'nobody can read anyone else''s milestones (stats or not)'
);
select is(public.get_visa_stats('500') -> 'wait_days', 'null'::jsonb, 'with 4 people the wait is hidden');
select is(public.get_visa_stats('500') -> 'granted_30d', 'null'::jsonb, 'with 4 grants the count is hidden');
select is(public.get_visa_stats('500') -> 'weekly_grants', 'null'::jsonb, 'with 4 grants the chart is hidden');

-- S5 makes five: a 50-day wait -----------------------------------------------------------
reset role;
insert into public.milestones (user_id, kind, title, status, lodged_on, happened_on, visa_subclass, share_stats)
select 'fb000000-0000-0000-0000-000000000005', 'visa', 'Student visa granted', 'done', d - 51, d - 1, '500', true
from today;

set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-0000-0000-00000000000f","role":"authenticated"}';

select is(
  public.get_visa_stats('500') -> 'wait_days',
  '{"people": 5, "p25": 20, "median": 30, "p75": 40}'::jsonb,
  'with 5 people: median and quartiles, and the non-sharer is not counted'
);
select is((public.get_visa_stats('500') ->> 'granted_7d')::int, null::int, 'only 4 granted this week: hidden');
select is((public.get_visa_stats('500') ->> 'granted_30d')::int, 5, 'five granted in 30 days');
select is(
  (select sum(v::int)::int from jsonb_array_elements_text(public.get_visa_stats('500') -> 'weekly_grants') v),
  5, 'the weekly chart adds up to the grants'
);
select is(public.get_visa_stats('500') -> 'waiting', 'null'::jsonb, 'nobody waiting: hidden');

-- Five people waiting, all lodged the same month ---------------------------------------
reset role;
insert into public.milestones (user_id, kind, title, status, lodged_on, visa_subclass, share_stats)
select u, 'visa', 'Waiting', 'upcoming', date_trunc('month', t.d)::date, '500', true
from today t, (values
  ('fb000000-0000-0000-0000-000000000001'::uuid), ('fb000000-0000-0000-0000-000000000002'::uuid),
  ('fb000000-0000-0000-0000-000000000003'::uuid), ('fb000000-0000-0000-0000-000000000004'::uuid),
  ('fb000000-0000-0000-0000-000000000005'::uuid)
) as s(u);

set local role authenticated;
set local request.jwt.claims to '{"sub":"fb000000-0000-0000-0000-00000000000f","role":"authenticated"}';

select is((public.get_visa_stats('500') ->> 'waiting')::int, 5, 'five waiting');
select is(
  public.get_visa_stats('500') -> 'waiting_by_month',
  jsonb_build_array(jsonb_build_object('month', (select to_char(d, 'YYYY-MM') from today), 'people', 5)),
  'waiting grouped by the month lodged'
);
select ok(
  public.get_visa_stats('500')::text !~ 'fb000000|fc000000',
  'the totals carry no member or stamp ids'
);
select is(public.get_visa_stats('5o0'), null, 'a subclass is three digits');

-- Signed out: nothing --------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select public.get_visa_stats('500') $$, '42501', null, 'signed-out visitors cannot read stats');

select * from finish();
rollback;
