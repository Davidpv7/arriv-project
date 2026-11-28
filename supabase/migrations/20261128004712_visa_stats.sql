-- Visa stats: member-reported waiting times, from visa stamps whose owners opt in.
--
-- A visa stamp can carry the day it was lodged. While someone is waiting it's an
-- upcoming item with a lodged date and no due date; when the visa is granted it
-- becomes a done stamp (happened_on = grant day), so wait = happened_on - lodged_on.
--
-- Owners opt in per stamp with share_stats. Nobody reads anyone else's milestones:
-- get_visa_stats() returns only totals, and any figure built from fewer than five
-- people comes back as null, so no single person's dates can be worked out.
-- The figures are reported by members, not official; the app says so wherever
-- they appear.

alter table public.milestones
  add column lodged_on date,
  add column share_stats boolean not null default false;

alter table public.milestones
  add constraint milestones_lodged_visa check (lodged_on is null or kind = 'visa'),
  add constraint milestones_lodged_before_grant
    check (lodged_on is null or happened_on is null or lodged_on <= happened_on),
  add constraint milestones_share_stats
    check (not share_stats or (lodged_on is not null and visa_subclass is not null)),
  -- A reminder needs a due date (a "still waiting" visa has none).
  add constraint milestones_remind_needs_due check (remind_on is null or due_on is not null);

-- Upcoming items now come in two shapes: a due date (e.g. visa expiry), or a visa
-- that's lodged and waiting. Exactly one of the two.
alter table public.milestones drop constraint milestones_upcoming_dates;
alter table public.milestones add constraint milestones_upcoming_dates check (
  status <> 'upcoming'
  or (happened_on is null and ((due_on is not null) <> (lodged_on is not null)))
);

create index milestones_visa_stats on public.milestones (visa_subclass, status)
  where share_stats;

grant insert (lodged_on, share_stats) on public.milestones to authenticated;
grant update (lodged_on, share_stats) on public.milestones to authenticated;

-- ---------------------------------------------------------------------------
-- Totals for one visa subclass. Only opted-in stamps, only groups of 5 or more.
-- Days are counted in Sydney time.
-- ---------------------------------------------------------------------------
create function public.get_visa_stats(p_subclass text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select 5 as min_group, (now() at time zone 'Australia/Sydney')::date as today
  ),
  shared as (
    select m.status, m.lodged_on, m.happened_on
    from public.milestones m
    where m.share_stats
      and m.kind = 'visa'
      and m.visa_subclass = p_subclass
      and m.lodged_on is not null
  ),
  waiting as (
    select lodged_on from shared where status = 'upcoming'
  ),
  grants as (
    select happened_on, happened_on - lodged_on as wait_days
    from shared
    where status = 'done'
  ),
  recent as (
    select g.wait_days from grants g, params p where g.happened_on > p.today - 180
  ),
  waits as (
    select
      count(*) as n,
      percentile_cont(0.25) within group (order by wait_days) as p25,
      percentile_cont(0.5) within group (order by wait_days) as median,
      percentile_cont(0.75) within group (order by wait_days) as p75
    from recent
  ),
  weeks as (
    -- The last 12 weeks, oldest first; week 0 ends today.
    select w.i, count(g.happened_on) as n
    from params p
    cross join generate_series(11, 0, -1) as w(i)
    left join grants g
      on g.happened_on > p.today - 7 * (w.i + 1) and g.happened_on <= p.today - 7 * w.i
    group by w.i
  ),
  months as (
    select to_char(date_trunc('month', lodged_on), 'YYYY-MM') as month, count(*) as n
    from waiting
    group by 1
  )
  select jsonb_build_object(
    'subclass', p_subclass,
    'min_group', p.min_group,
    'waiting', (select case when count(*) >= p.min_group then count(*) end from waiting),
    'granted_7d', (
      select case when count(*) >= p.min_group then count(*) end
      from grants where happened_on > p.today - 7
    ),
    'granted_30d', (
      select case when count(*) >= p.min_group then count(*) end
      from grants where happened_on > p.today - 30
    ),
    'wait_days', (
      select case when w.n >= p.min_group then jsonb_build_object(
        'people', w.n,
        'p25', round(w.p25::numeric),
        'median', round(w.median::numeric),
        'p75', round(w.p75::numeric)
      ) end
      from waits w
    ),
    -- Grant days alone don't reveal anyone's wait, so the chart shows once the
    -- 12 weeks hold at least 5 grants in total.
    'weekly_grants', (
      select case when sum(n) >= p.min_group then jsonb_agg(n order by i desc) end from weeks
    ),
    'waiting_by_month', (
      select coalesce(jsonb_agg(jsonb_build_object('month', month, 'people', n) order by month), '[]'::jsonb)
      from months where n >= p.min_group
    )
  )
  from params p
  where p_subclass ~ '^[0-9]{3}$';
$$;

revoke all on function public.get_visa_stats(text) from public, anon;
grant execute on function public.get_visa_stats(text) to authenticated, service_role;
