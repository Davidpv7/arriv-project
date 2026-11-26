-- Phase 7b: notifications. In-app list + push (decided 26 Nov 2026):
--   * comment, reply, like, connection request/accepted, crew join, Journey reminder
--     -> a row in the notifications list and a push;
--   * chat messages -> push only (the Chat tab already counts unread), and only for
--     direct and group chats: community rooms can have hundreds of people, so they
--     never push. Muted chats never push.
--   * people choose which pushes they get (notification_settings); the in-app list
--     always shows everything. Nobody is notified about their own actions or by
--     someone they've blocked (or who blocked them).
-- Push text is English only in v1 (the app's own text goes through i18n).

alter table public.notifications add column preview text check (char_length(preview) <= 200);

-- Live badge: Realtime delivers only my own rows (RLS).
alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Push settings. No row = everything on.
-- ---------------------------------------------------------------------------
create table public.notification_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  messages boolean not null default true,
  comments boolean not null default true, -- comments and replies
  likes boolean not null default true,
  connections boolean not null default true,
  community_joins boolean not null default true,
  reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function private.set_updated_at();

alter table public.notification_settings enable row level security;

create policy "notification_settings: owner reads"
  on public.notification_settings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notification_settings: owner adds"
  on public.notification_settings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "notification_settings: owner changes"
  on public.notification_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.notification_settings from anon;

create function private.wants_push(p_user uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case p_kind
      when 'messages' then s.messages
      when 'comments' then s.comments
      when 'likes' then s.likes
      when 'connections' then s.connections
      when 'community_joins' then s.community_joins
      when 'reminders' then s.reminders
    end
    from public.notification_settings s where s.user_id = p_user
  ), true);
$$;

-- ---------------------------------------------------------------------------
-- Sending
-- ---------------------------------------------------------------------------

-- One push to every device of several people, 100 per request (Expo's limit).
create function private.send_push_to(p_users uuid[], p_title text, p_body text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch jsonb;
begin
  for batch in
    select jsonb_agg(jsonb_build_object(
      'to', t.token, 'title', p_title, 'body', p_body, 'data', p_data, 'sound', 'default'))
    from (
      select token, (row_number() over (order by token) - 1) / 100 as chunk
      from public.push_tokens where user_id = any (p_users)
    ) t
    group by t.chunk
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := batch,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end loop;
end;
$$;

-- A notification for one person: a row in their list, and a push if they want it.
create function private.notify(
  p_user uuid,
  p_type text,
  p_actor uuid,
  p_entity_type text,
  p_entity_id text,
  p_preview text,
  p_pref text,
  p_title text,
  p_body text,
  p_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_actor
     or (p_actor is not null and private.is_blocked(p_user, p_actor)) then
    return;
  end if;
  insert into public.notifications (user_id, type, actor_id, entity_type, entity_id, preview)
  values (p_user, p_type, p_actor, p_entity_type, p_entity_id, left(p_preview, 200));
  if private.wants_push(p_user, p_pref) then
    perform private.send_push(p_user, p_title, coalesce(p_body, ''), jsonb_build_object('url', p_url));
  end if;
end;
$$;

create function private.display_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select display_name from public.profiles where id = p_user), 'Someone');
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Comments and replies: the post's author, and the person replied to.
create function private.comments_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  parent_author uuid;
  who text := private.display_name(new.author_id);
  url text := '/post/' || new.post_id;
begin
  select author_id into post_author from public.posts where id = new.post_id;
  if new.parent_id is not null then
    select author_id into parent_author from public.comments where id = new.parent_id;
    perform private.notify(parent_author, 'reply', new.author_id, 'post', new.post_id::text,
      new.body, 'comments', who || ' replied to your comment', left(new.body, 140), url);
  end if;
  if post_author is distinct from parent_author then
    perform private.notify(post_author, 'comment', new.author_id, 'post', new.post_id::text,
      new.body, 'comments', who || ' commented on your post', left(new.body, 140), url);
  end if;
  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function private.comments_notify();

-- Likes: once per person per post (liking again after unliking doesn't re-notify).
create function private.post_likes_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.posts;
begin
  select * into p from public.posts where id = new.post_id;
  if exists (
    select 1 from public.notifications
    where user_id = p.author_id and type = 'like' and actor_id = new.user_id
      and entity_id = new.post_id::text
  ) then
    return new;
  end if;
  perform private.notify(p.author_id, 'like', new.user_id, 'post', new.post_id::text,
    p.body, 'likes', private.display_name(new.user_id) || ' liked your post', left(p.body, 140),
    '/post/' || new.post_id);
  return new;
end;
$$;

create trigger post_likes_notify
  after insert on public.post_likes
  for each row execute function private.post_likes_notify();

-- Connection requests and acceptances.
create function private.connections_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform private.notify(new.addressee_id, 'connection_request', new.requester_id, 'profile',
      new.requester_id::text, null, 'connections',
      private.display_name(new.requester_id) || ' wants to connect', 'Open Arriv to accept or decline.',
      '/connections');
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    perform private.notify(new.requester_id, 'connection_accepted', new.addressee_id, 'profile',
      new.addressee_id::text, null, 'connections',
      private.display_name(new.addressee_id) || ' accepted your connection request', '',
      '/profile/' || (select handle from public.profiles where id = new.addressee_id));
  end if;
  return new;
end;
$$;

create trigger connections_notify
  after insert or update of status on public.connections
  for each row execute function private.connections_notify();

-- Someone joined a community: its owner hears about it.
create function private.community_members_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.communities;
  owner_id uuid;
begin
  if new.role <> 'member' then
    return new; -- the owner's own row when the community is created
  end if;
  select * into c from public.communities where id = new.community_id;
  for owner_id in
    select user_id from public.community_members where community_id = new.community_id and role = 'owner'
  loop
    perform private.notify(owner_id, 'community_join', new.user_id, 'community', c.id::text,
      c.name, 'community_joins', private.display_name(new.user_id) || ' joined ' || c.name, '',
      '/community/' || c.slug);
  end loop;
  return new;
end;
$$;

create trigger community_members_notify
  after insert on public.community_members
  for each row execute function private.community_members_notify();

-- Messages: push only, direct and group chats only, not muted, not blocked.
create function private.messages_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conv public.conversations;
  who text := private.display_name(new.sender_id);
  recipients uuid[];
  text_part text := coalesce(nullif(btrim(new.body), ''), 'Sent a file');
begin
  select * into conv from public.conversations where id = new.conversation_id;
  if conv.kind = 'community' then
    return new;
  end if;

  select array_agg(m.user_id) into recipients
  from public.conversation_members m
  where m.conversation_id = new.conversation_id
    and m.user_id <> new.sender_id
    and not m.muted
    and not private.is_blocked(m.user_id, new.sender_id)
    and private.wants_push(m.user_id, 'messages');

  if recipients is null then
    return new;
  end if;

  perform private.send_push_to(
    recipients,
    case when conv.kind = 'group' then coalesce(conv.title, 'Group chat') else who end,
    left(case when conv.kind = 'group' then who || ': ' || text_part else text_part end, 140),
    jsonb_build_object('url', '/conversation/' || new.conversation_id)
  );
  return new;
end;
$$;

create trigger messages_push
  after insert on public.messages
  for each row execute function private.messages_push();

-- Journey reminders now respect the "reminders" push setting (the list always gets one).
create or replace function private.send_milestone_reminders(p_now timestamptz default now())
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

    insert into public.notifications (user_id, type, entity_type, entity_id, preview)
    values (r.user_id, 'milestone_reminder', 'milestone', r.id::text, r.title);

    if private.wants_push(r.user_id, 'reminders') then
      perform private.send_push(
        r.user_id,
        r.title,
        'Reminder from your Journey · due ' || to_char(r.due_on, 'FMDD Mon YYYY'),
        jsonb_build_object('url', '/journey/' || r.id)
      );
    end if;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

revoke all on function private.send_push_to(uuid[], text, text, jsonb) from public, authenticated;
revoke all on function private.notify(uuid, text, uuid, text, text, text, text, text, text, text) from public, authenticated;
revoke all on function private.send_milestone_reminders(timestamptz) from public, authenticated;
