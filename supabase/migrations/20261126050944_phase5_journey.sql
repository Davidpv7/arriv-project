-- Phase 5: My Journey. Milestones as passport stamps, linked Backpack documents,
-- reminders sent as push notifications, and sharing a stamp to the feed.
--
-- Private by default: notes, upcoming items (e.g. visa expiry) and reminders are
-- only ever visible to their owner. Others can see a done stamp's face (kind, title,
-- date, subclass, place) only if its visibility allows, through get_stamps().
-- A journey update post carries a snapshot of the stamp, never the documents.
--
-- Decided 26 Nov 2026: reminders are real server push, sent at 9am in the person's
-- city on the reminder date. The database does it: pg_cron runs every 15 minutes
-- and pg_net posts to Expo's push service. No Edge Function or service-role key.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create type public.milestone_kind as enum ('visa', 'arrival', 'education', 'work', 'home', 'pr', 'citizenship', 'other');
create type public.milestone_status as enum ('done', 'upcoming');

-- ---------------------------------------------------------------------------
-- Milestones
-- ---------------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.milestone_kind not null default 'other',
  title text not null check (char_length(btrim(title)) between 1 and 80),
  status public.milestone_status not null,
  happened_on date,
  due_on date,
  remind_on date,
  visa_subclass text check (visa_subclass ~ '^[0-9]{3}$'),
  place text check (place ~ '^[A-Z0-9]{1,4}$'), -- a short code, like an airport: SYD
  notes text check (char_length(notes) <= 2000),
  visibility public.visibility not null default 'private',
  reminded_at timestamptz, -- set when the reminder was sent; cleared when remind_on changes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id), -- target of the milestone_documents foreign key
  constraint milestones_done_dates check (
    status <> 'done' or (happened_on is not null and due_on is null and remind_on is null)
  ),
  constraint milestones_upcoming_dates check (
    status <> 'upcoming' or (due_on is not null and happened_on is null)
  ),
  constraint milestones_remind_before_due check (remind_on is null or remind_on <= due_on)
);

create index milestones_user on public.milestones (user_id, status, happened_on desc, due_on);
create index milestones_reminders on public.milestones (remind_on)
  where status = 'upcoming' and remind_on is not null and reminded_at is null;

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function private.set_updated_at();

-- A new reminder date gets a new reminder.
create function private.milestones_reset_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.remind_on is distinct from old.remind_on then
    new.reminded_at := null;
  end if;
  return new;
end;
$$;

create trigger milestones_reset_reminder
  before update on public.milestones
  for each row execute function private.milestones_reset_reminder();

alter table public.milestones enable row level security;

create policy "milestones: owner reads"
  on public.milestones for select to authenticated
  using (user_id = (select auth.uid()));

create policy "milestones: owner adds"
  on public.milestones for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "milestones: owner edits"
  on public.milestones for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "milestones: owner deletes"
  on public.milestones for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.milestones from anon;
revoke insert, update on public.milestones from authenticated;
grant insert (id, user_id, kind, title, status, happened_on, due_on, remind_on, visa_subclass, place, notes, visibility)
  on public.milestones to authenticated;
grant update (kind, title, status, happened_on, due_on, remind_on, visa_subclass, place, notes, visibility)
  on public.milestones to authenticated;

-- Someone's done stamps, as far as the viewer may see them: the owner sees all of
-- them; others see public ones, or connections-only ones if connected; never if
-- blocked. Only the stamp's face: no notes, no upcoming items, no reminders.
create function public.get_stamps(p_user uuid)
returns table (
  id uuid,
  kind public.milestone_kind,
  title text,
  happened_on date,
  visa_subclass text,
  place text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.kind, m.title, m.happened_on, m.visa_subclass, m.place
  from public.milestones m
  where m.user_id = p_user
    and m.status = 'done'
    and not private.is_blocked((select auth.uid()), p_user)
    and (
      p_user = (select auth.uid())
      or m.visibility = 'public'
      or (m.visibility = 'connections' and private.are_connected((select auth.uid()), p_user))
    )
  order by m.happened_on desc, m.created_at desc;
$$;

revoke all on function public.get_stamps(uuid) from public, anon;
grant execute on function public.get_stamps(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Milestone documents: links to Backpack documents. Both must be the same
-- person's (composite foreign keys), and only they can see or change links.
-- ---------------------------------------------------------------------------
alter table public.documents add constraint documents_id_owner_key unique (id, owner_id);

create table public.milestone_documents (
  milestone_id uuid not null,
  document_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (milestone_id, document_id),
  foreign key (milestone_id, user_id) references public.milestones (id, user_id) on delete cascade,
  foreign key (document_id, user_id) references public.documents (id, owner_id) on delete cascade
);

create index milestone_documents_document on public.milestone_documents (document_id);

alter table public.milestone_documents enable row level security;

create policy "milestone_documents: owner reads"
  on public.milestone_documents for select to authenticated
  using (user_id = (select auth.uid()));

create policy "milestone_documents: owner links"
  on public.milestone_documents for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "milestone_documents: owner unlinks"
  on public.milestone_documents for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.milestone_documents from anon;
revoke insert, update on public.milestone_documents from authenticated;
grant insert (milestone_id, document_id, user_id) on public.milestone_documents to authenticated;

-- ---------------------------------------------------------------------------
-- Journey updates: a post that shares one done stamp. The stamp is copied onto
-- the post when it's made (the database fills it, not the app), so readers see
-- the stamp's face and nothing else of the milestone.
-- ---------------------------------------------------------------------------
alter table public.posts
  add column milestone_id uuid references public.milestones (id) on delete set null,
  add column stamp jsonb;

create function private.posts_journey_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.milestones;
begin
  if new.kind <> 'journey_update' then
    if new.milestone_id is not null then
      raise exception 'Only journey updates share a stamp' using errcode = '22023';
    end if;
    new.stamp := null;
    return new;
  end if;

  select * into m from public.milestones
  where id = new.milestone_id and user_id = new.author_id and status = 'done';
  if not found then
    raise exception 'Share one of your own done stamps' using errcode = '22023';
  end if;
  new.stamp := jsonb_build_object(
    'kind', m.kind,
    'title', m.title,
    'happened_on', m.happened_on,
    'visa_subclass', m.visa_subclass,
    'place', m.place
  );
  return new;
end;
$$;

create trigger posts_journey_stamp
  before insert on public.posts
  for each row execute function private.posts_journey_stamp();

drop policy "posts: members post" on public.posts;
create policy "posts: members post"
  on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (community_id is null or private.is_community_member(community_id))
  );

grant insert (milestone_id) on public.posts to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications (in-app list and the push that goes with it). Phase 5 writes
-- milestone reminders; Phase 7 adds messages, comments, likes and the rest.
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'message', 'comment', 'reply', 'like', 'connection_request', 'connection_accepted',
    'community_join', 'milestone_reminder'
  )),
  actor_id uuid references public.profiles (id) on delete cascade,
  entity_type text,
  entity_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications: owner reads"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: owner marks read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications: owner clears"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.notifications from anon;
revoke insert, update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Push tokens (Expo). One row per device; a device that signs in as someone
-- else moves to them, so the token is claimed through register_push_token().
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[^]]+\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "push_tokens: owner reads"
  on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_tokens: owner removes"
  on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_tokens from anon;
revoke insert, update on public.push_tokens from authenticated;

create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, me, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;

-- Sends one push to every device of a person through Expo's push service.
-- pg_net queues the request; it's sent after the transaction commits.
create function private.send_push(p_user uuid, p_title text, p_body text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  messages jsonb;
begin
  select jsonb_agg(jsonb_build_object(
    'to', t.token,
    'title', p_title,
    'body', p_body,
    'data', p_data,
    'sound', 'default'
  ))
  into messages
  from public.push_tokens t
  where t.user_id = p_user;

  if messages is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := messages,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Reminders: 9am in the person's city on the reminder date.
-- ---------------------------------------------------------------------------
create function private.city_timezone(p_city text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case lower(btrim(coalesce(p_city, '')))
    when 'melbourne' then 'Australia/Melbourne'
    when 'brisbane' then 'Australia/Brisbane'
    when 'gold coast' then 'Australia/Brisbane'
    when 'cairns' then 'Australia/Brisbane'
    when 'townsville' then 'Australia/Brisbane'
    when 'perth' then 'Australia/Perth'
    when 'adelaide' then 'Australia/Adelaide'
    when 'hobart' then 'Australia/Hobart'
    when 'darwin' then 'Australia/Darwin'
    else 'Australia/Sydney' -- Sydney, Newcastle, Canberra and unknown cities
  end;
$$;

-- Every milestone whose reminder has reached 9am local time gets one in-app
-- notification and one push. A missed run catches up later the same day or the
-- next two days; older ones are skipped. Returns how many reminders were sent.
create function private.send_milestone_reminders(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  sent integer := 0;
begin
  for r in
    select m.id, m.user_id, m.title, m.due_on
    from public.milestones m
    join public.profiles p on p.id = m.user_id
    where m.status = 'upcoming'
      and m.remind_on is not null
      and m.reminded_at is null
      and (p_now at time zone private.city_timezone(p.city)) >= m.remind_on + time '09:00'
      and (p_now at time zone private.city_timezone(p.city)) < m.remind_on + 3
    for update of m skip locked
  loop
    update public.milestones set reminded_at = p_now where id = r.id;

    insert into public.notifications (user_id, type, entity_type, entity_id)
    values (r.user_id, 'milestone_reminder', 'milestone', r.id::text);

    -- English only in v1 (the app's own text goes through i18n).
    perform private.send_push(
      r.user_id,
      r.title,
      'Reminder from your Journey · due ' || to_char(r.due_on, 'FMDD Mon YYYY'),
      jsonb_build_object('url', '/journey/' || r.id)
    );
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

revoke all on function private.send_push(uuid, text, text, jsonb) from public, authenticated;
revoke all on function private.send_milestone_reminders(timestamptz) from public, authenticated;
revoke all on function private.city_timezone(text) from public;

-- Expo answers each push with a ticket; "DeviceNotRegistered" means the app was
-- removed from that phone. Drop those tokens (pg_net keeps responses for 6 hours).
create function private.prune_push_tokens()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  with dead as (
    select distinct ticket -> 'details' ->> 'expoPushToken' as token
    from net._http_response r,
      jsonb_array_elements(
        case when jsonb_typeof(r.content::jsonb -> 'data') = 'array'
          then r.content::jsonb -> 'data' else '[]'::jsonb end
      ) as ticket
    where r.status_code = 200
      and r.content like '%DeviceNotRegistered%'
      and ticket -> 'details' ->> 'error' = 'DeviceNotRegistered'
  )
  delete from public.push_tokens t using dead where t.token = dead.token;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function private.prune_push_tokens() from public, authenticated;

select cron.schedule(
  'milestone-reminders',
  '*/15 * * * *',
  'select private.send_milestone_reminders()'
);

select cron.schedule('prune-push-tokens', '7 * * * *', 'select private.prune_push_tokens()');
