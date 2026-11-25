-- Phase 3: chat.
-- Spec: docs/arriv-mvp-spec.md §3.4, §4, §5 (chat-attachments), §6.
-- Also completes the community chat deferred from Phase 2: creating a community
-- creates its conversation, joins/leaves are mirrored, and existing communities
-- are backfilled. Notifications for new messages arrive in Phase 7.

create type public.conversation_kind as enum ('direct', 'group', 'community');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  community_id uuid unique references public.communities (id) on delete cascade,
  title text check (char_length(btrim(title)) between 1 and 60),
  -- set null, not cascade: deleting one account must not delete everyone else's chat
  created_by uuid references public.profiles (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check ((kind = 'community') = (community_id is not null)),
  check (kind = 'group' or title is null)
);

create index conversations_last_message_idx on public.conversations (last_message_at desc);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  last_read_at timestamptz not null default now(), -- joining doesn't make old history "unread"
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text check (char_length(body) <= 4000),
  attachment_path text unique,
  attachment_name text check (char_length(attachment_name) between 1 and 200),
  attachment_mime text check (attachment_mime in (
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  -- something to say, or something attached
  check (char_length(btrim(coalesce(body, ''))) > 0 or attachment_path is not null),
  -- attachment fields come together, and the file sits under the conversation
  check ((attachment_path is null) = (attachment_name is null)
     and (attachment_path is null) = (attachment_mime is null)),
  check (attachment_path is null or attachment_path like conversation_id::text || '/%')
);

create index messages_conversation_idx on public.messages (conversation_id, id desc);

-- Groups: being added is a request; the invitee accepts or declines.
create table public.conversation_invites (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, invitee_id)
);

create index conversation_invites_invitee_idx on public.conversation_invites (invitee_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function private.is_conversation_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = (select auth.uid())
  );
$$;

-- Member, and for a direct chat, no block between the two people.
create function private.can_send_message(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_conversation_member(conv)
    and not exists (
      select 1
      from public.conversations c
      join public.conversation_members m on m.conversation_id = c.id
      where c.id = conv
        and c.kind = 'direct'
        and m.user_id <> (select auth.uid())
        and private.is_blocked((select auth.uid()), m.user_id)
    );
$$;

create function private.is_conversation_mod(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv and user_id = (select auth.uid()) and role in ('owner', 'moderator')
  );
$$;

create function private.is_invited_to(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_invites
    where conversation_id = conv and invitee_id = (select auth.uid())
  );
$$;

grant execute on function private.is_conversation_member(uuid) to authenticated;
grant execute on function private.can_send_message(uuid) to authenticated;
grant execute on function private.is_conversation_mod(uuid) to authenticated;
grant execute on function private.is_invited_to(uuid) to authenticated;

-- Invite people to a group on behalf of p_inviter. Skips yourself, current
-- members, people already invited and anyone in a block with the inviter.
-- Members plus pending invites stay within 50. Returns how many were invited.
create function private.invite_to_group(p_conversation uuid, p_inviter uuid, p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitees uuid[];
  taken integer;
begin
  select coalesce(array_agg(distinct p.id), '{}') into invitees
  from public.profiles p
  where p.id = any (coalesce(p_user_ids, '{}'))
    and p.id <> p_inviter
    and not private.is_blocked(p_inviter, p.id)
    and not exists (select 1 from public.conversation_members m
                    where m.conversation_id = p_conversation and m.user_id = p.id)
    and not exists (select 1 from public.conversation_invites i
                    where i.conversation_id = p_conversation and i.invitee_id = p.id);

  select (select count(*) from public.conversation_members where conversation_id = p_conversation)
       + (select count(*) from public.conversation_invites where conversation_id = p_conversation)
    into taken;
  if taken + cardinality(invitees) > 50 then
    raise exception 'A group chat holds up to 50 people' using errcode = '23514';
  end if;

  insert into public.conversation_invites (conversation_id, invitee_id, invited_by)
  select p_conversation, unnest(invitees), p_inviter;
  return cardinality(invitees);
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Community created -> its chat room. Named so it fires before
-- communities_add_owner (triggers run in name order), so the owner's
-- membership is mirrored into a room that already exists.
create function private.communities_add_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.conversations (kind, community_id, created_by)
  values ('community', new.id, new.created_by);
  return new;
end;
$$;

create trigger communities_add_conversation
  after insert on public.communities
  for each row execute function private.communities_add_conversation();

-- Join / leave / role change in a community -> same in its chat room.
create function private.community_members_mirror()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.conversation_members (conversation_id, user_id, role)
    select c.id, new.user_id, new.role
    from public.conversations c where c.community_id = new.community_id
    on conflict (conversation_id, user_id) do update set role = excluded.role;
  elsif tg_op = 'UPDATE' then
    update public.conversation_members m set role = new.role
    from public.conversations c
    where c.community_id = new.community_id and m.conversation_id = c.id and m.user_id = new.user_id;
  else
    delete from public.conversation_members m
    using public.conversations c
    where c.community_id = old.community_id and m.conversation_id = c.id and m.user_id = old.user_id;
  end if;
  return null;
end;
$$;

create trigger community_members_mirror
  after insert or delete or update of role on public.community_members
  for each row execute function private.community_members_mirror();

-- Groups hold up to 50 people.
create function private.conversation_members_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select kind from public.conversations where id = new.conversation_id) = 'group'
     and (select count(*) from public.conversation_members where conversation_id = new.conversation_id) > 50 then
    raise exception 'A group chat holds up to 50 people' using errcode = '23514';
  end if;
  return null;
end;
$$;

create trigger conversation_members_cap
  after insert on public.conversation_members
  for each row execute function private.conversation_members_cap();

-- Someone leaves a group (or their account is deleted): if the owner left, the
-- longest-standing member takes over; if nobody is left, the group goes.
create function private.conversation_members_after_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conv_kind public.conversation_kind;
begin
  select kind into conv_kind from public.conversations where id = old.conversation_id;
  if conv_kind is distinct from 'group' then
    return null; -- direct/community, or the conversation itself is being deleted
  end if;
  if not exists (select 1 from public.conversation_members where conversation_id = old.conversation_id) then
    delete from public.conversations where id = old.conversation_id;
  elsif not exists (select 1 from public.conversation_members
                    where conversation_id = old.conversation_id and role = 'owner') then
    update public.conversation_members set role = 'owner'
    where (conversation_id, user_id) = (
      select conversation_id, user_id from public.conversation_members
      where conversation_id = old.conversation_id
      order by joined_at, user_id
      limit 1
    );
  end if;
  return null;
end;
$$;

create trigger conversation_members_after_leave
  after delete on public.conversation_members
  for each row execute function private.conversation_members_after_leave();

-- New message -> conversation moves to the top of the inbox; the sender has read it.
create function private.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;
  return null;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function private.messages_after_insert();

create function private.messages_set_edited_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at = now();
  end if;
  return new;
end;
$$;

create trigger messages_set_edited_at
  before update on public.messages
  for each row execute function private.messages_set_edited_at();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- One direct conversation per pair; blocked people can't start one.
create function public.get_or_create_direct(p_other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  conv uuid;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_other_user is null or p_other_user = me then
    raise exception 'Pick someone else to message' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user)
     or private.is_blocked(me, p_other_user) then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  -- serialise concurrent calls for the same pair
  perform pg_advisory_xact_lock(hashtextextended(
    least(me, p_other_user)::text || greatest(me, p_other_user)::text, 0));

  select c.id into conv
  from public.conversations c
  join public.conversation_members a on a.conversation_id = c.id and a.user_id = me
  join public.conversation_members b on b.conversation_id = c.id and b.user_id = p_other_user
  where c.kind = 'direct'
  limit 1;

  if conv is null then
    insert into public.conversations (kind, created_by) values ('direct', me) returning id into conv;
    insert into public.conversation_members (conversation_id, user_id)
    values (conv, me), (conv, p_other_user);
  end if;
  return conv;
end;
$$;

-- The creator is the owner and the only member; everyone else gets an invite.
create function public.create_group(p_title text, p_invitee_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  conv uuid;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if coalesce(btrim(p_title), '') = '' then
    raise exception 'Give the group a name' using errcode = '22023';
  end if;

  insert into public.conversations (kind, title, created_by)
  values ('group', btrim(p_title), me) returning id into conv;
  insert into public.conversation_members (conversation_id, user_id, role) values (conv, me, 'owner');

  if private.invite_to_group(conv, me, p_invitee_ids) = 0 then
    raise exception 'Invite at least one person' using errcode = '22023';
  end if;
  return conv;
end;
$$;

-- Any group member can invite more people. Returns how many were invited.
create function public.invite_to_group(p_conversation uuid, p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation and c.kind = 'group' and private.is_conversation_member(c.id)
  ) then
    raise exception 'Group not found' using errcode = 'P0002';
  end if;
  return private.invite_to_group(p_conversation, (select auth.uid()), p_user_ids);
end;
$$;

-- Accept: join the group. Decline: the invite goes away.
create function public.respond_to_group_invite(p_conversation uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  delete from public.conversation_invites
  where conversation_id = p_conversation and invitee_id = me;
  if not found then
    raise exception 'Invite not found' using errcode = 'P0002';
  end if;
  if p_accept then
    insert into public.conversation_members (conversation_id, user_id) values (p_conversation, me);
  end if;
end;
$$;

-- Soft delete: the sender; in a community chat its owner/moderators; or an admin.
create function public.delete_message(p_message bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  select m.sender_id, c.community_id into target
  from public.messages m join public.conversations c on c.id = m.conversation_id
  where m.id = p_message and m.deleted_at is null;
  if not found then
    raise exception 'Message not found' using errcode = 'P0002';
  end if;
  if not (
    target.sender_id = (select auth.uid())
    or (target.community_id is not null and private.is_community_mod(target.community_id))
    or private.is_admin()
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.messages set deleted_at = now() where id = p_message;
end;
$$;

-- Inbox: one row per conversation, newest activity first.
-- security invoker: conversations/messages/profiles RLS (membership, blocks) still applies.
create function public.get_inbox()
returns table (
  conversation_id uuid,
  kind public.conversation_kind,
  title text,
  community_id uuid,
  other_user_id uuid,
  last_message_at timestamptz,
  last_message_id bigint,
  last_message_body text,
  last_message_sender_id uuid,
  last_message_has_attachment boolean,
  unread_count integer,
  muted boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id, c.kind, c.title, c.community_id, other.user_id,
    c.last_message_at,
    lm.id, lm.body, lm.sender_id, lm.attachment_path is not null,
    (select count(*)::int from (
       select 1 from public.messages u
       where u.conversation_id = c.id
         and u.created_at > me.last_read_at
         and u.sender_id <> me.user_id
       limit 100
     ) capped),
    me.muted
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join lateral (
    select m.user_id from public.conversation_members m
    where c.kind = 'direct' and m.conversation_id = c.id and m.user_id <> me.user_id
    limit 1
  ) other on true
  left join lateral (
    select m.id, m.body, m.sender_id, m.attachment_path from public.messages m
    where m.conversation_id = c.id
    order by m.id desc
    limit 1
  ) lm on true
  where me.user_id = (select auth.uid())
    and (other.user_id is null or not private.is_blocked(me.user_id, other.user_id))
  order by c.last_message_at desc;
$$;

revoke all on function public.get_or_create_direct(uuid) from public, anon;
revoke all on function public.create_group(text, uuid[]) from public, anon;
revoke all on function public.invite_to_group(uuid, uuid[]) from public, anon;
revoke all on function public.respond_to_group_invite(uuid, boolean) from public, anon;
revoke all on function public.delete_message(bigint) from public, anon;
revoke all on function public.get_inbox() from public, anon;
revoke all on function private.invite_to_group(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.get_or_create_direct(uuid) to authenticated;
grant execute on function public.create_group(text, uuid[]) to authenticated;
grant execute on function public.invite_to_group(uuid, uuid[]) to authenticated;
grant execute on function public.respond_to_group_invite(uuid, boolean) to authenticated;
grant execute on function public.delete_message(bigint) to authenticated;
grant execute on function public.get_inbox() to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges. Conversations and memberships are only made by RPCs/triggers.
-- ---------------------------------------------------------------------------
revoke all on public.conversations, public.conversation_members, public.messages,
  public.conversation_invites from anon;
revoke insert, update, delete on public.conversations, public.conversation_members, public.messages,
  public.conversation_invites from authenticated;

grant select on public.conversations to authenticated;
grant update (title) on public.conversations to authenticated;

grant select, delete on public.conversation_invites to authenticated;

grant select, delete on public.conversation_members to authenticated;
grant update (last_read_at, muted) on public.conversation_members to authenticated;

grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body, attachment_path, attachment_name, attachment_mime)
  on public.messages to authenticated;
grant update (body) on public.messages to authenticated; -- soft delete via delete_message()

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_invites enable row level security;

-- Invitees see the group (its name) but not its messages or members until they accept.
create policy "conversations: members and invitees read"
  on public.conversations for select to authenticated
  using (private.is_conversation_member(id) or private.is_invited_to(id));

create policy "conversations: group owner or moderator renames"
  on public.conversations for update to authenticated
  using (kind = 'group' and private.is_conversation_mod(id))
  with check (kind = 'group' and private.is_conversation_mod(id));

create policy "conversation_invites: invitee and group members read"
  on public.conversation_invites for select to authenticated
  using (invitee_id = (select auth.uid()) or private.is_conversation_member(conversation_id));

-- The invitee declines (also via respond_to_group_invite); the inviter or a group owner/moderator cancels.
create policy "conversation_invites: decline or cancel"
  on public.conversation_invites for delete to authenticated
  using (
    invitee_id = (select auth.uid())
    or invited_by = (select auth.uid())
    or private.is_conversation_mod(conversation_id)
  );

create policy "conversation_members: members read"
  on public.conversation_members for select to authenticated
  using (private.is_conversation_member(conversation_id));

create policy "conversation_members: update own read state and mute"
  on public.conversation_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Leaving a community chat happens by leaving the community; direct chats stay.
create policy "conversation_members: leave a group"
  on public.conversation_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.kind = 'group')
  );

create policy "messages: members read"
  on public.messages for select to authenticated
  using (
    deleted_at is null
    and private.is_conversation_member(conversation_id)
    and not private.is_blocked((select auth.uid()), sender_id)
  );

create policy "messages: members send"
  on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.can_send_message(conversation_id));

create policy "messages: sender edits"
  on public.messages for update to authenticated
  using (sender_id = (select auth.uid()) and deleted_at is null)
  with check (sender_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime: new messages for open conversations and the inbox (RLS applies).
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- Storage: chat-attachments (private; read = members; write = members who can send)
-- Path: {conversation_id}/{message_uuid}-{name}. Served through signed URLs (1 hour).
-- Images are capped at 10 MB in the app; the bucket allows files up to 20 MB.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-attachments', 'chat-attachments', false, 20971520, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])
on conflict (id) do nothing;

create policy "chat-attachments: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id::text = (storage.foldername(name))[1]
        and m.user_id = (select auth.uid())
    )
  );

create policy "chat-attachments: members upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1] and private.can_send_message(c.id)
    )
  );

create policy "chat-attachments: uploader deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-attachments' and owner_id = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Backfill: a chat room for every community created before this migration.
-- ---------------------------------------------------------------------------
insert into public.conversations (kind, community_id, created_by, created_at)
select 'community', c.id, c.created_by, c.created_at
from public.communities c
where not exists (select 1 from public.conversations v where v.community_id = c.id);

insert into public.conversation_members (conversation_id, user_id, role, joined_at)
select v.id, cm.user_id, cm.role, cm.joined_at
from public.community_members cm
join public.conversations v on v.community_id = cm.community_id
on conflict (conversation_id, user_id) do nothing;
