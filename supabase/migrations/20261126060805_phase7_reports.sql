-- Phase 7a: reports and admin review.
-- Anyone signed in can report a post, comment, message, profile or community they
-- can see. Admins review reports in the app and either remove the content or
-- dismiss the report (decided 26 Nov 2026). Suspending an account is done in the
-- Supabase dashboard for v1.
--
-- A report keeps a snapshot of what was reported, taken by the database at report
-- time, so admins can judge it even if it's edited or deleted later, and even when
-- it's a message in a chat they're not in. Reporting a message therefore shows
-- that message to admins; the report screen says so.

create type public.report_target as enum ('post', 'comment', 'message', 'profile', 'community');
create type public.report_status as enum ('open', 'actioned', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id text not null,
  -- Who wrote or owns the reported thing (filled by the database).
  target_user_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'scam', 'false_information', 'other')),
  details text check (char_length(details) <= 1000),
  snapshot jsonb not null default '{}',
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz
);

-- One open report per person per thing.
create unique index reports_one_open on public.reports (reporter_id, target_type, target_id)
  where status = 'open';
create index reports_review on public.reports (status, created_at desc);
create index reports_target on public.reports (target_type, target_id);

-- Check the reported thing exists and the reporter could see it, and take the snapshot.
create function private.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  owner uuid;
  snap jsonb;
begin
  case new.target_type
    when 'post' then
      select p.author_id, jsonb_build_object('body', p.body, 'kind', p.kind, 'community_id', p.community_id)
        into owner, snap
      from public.posts p
      where p.id::text = new.target_id and p.deleted_at is null
        and (p.community_id is null or private.can_read_community(p.community_id));
    when 'comment' then
      select c.author_id, jsonb_build_object('body', c.body, 'post_id', c.post_id)
        into owner, snap
      from public.comments c
      join public.posts p on p.id = c.post_id
      where c.id::text = new.target_id and c.deleted_at is null and p.deleted_at is null
        and (p.community_id is null or private.can_read_community(p.community_id));
    when 'message' then
      select m.sender_id, jsonb_build_object(
          'body', m.body, 'attachment_name', m.attachment_name, 'conversation_id', m.conversation_id)
        into owner, snap
      from public.messages m
      where m.id::text = new.target_id and m.deleted_at is null
        and private.is_conversation_member(m.conversation_id);
    when 'profile' then
      select p.id, jsonb_build_object('display_name', p.display_name, 'handle', p.handle, 'bio', p.bio)
        into owner, snap
      from public.profiles p
      where p.id::text = new.target_id;
    when 'community' then
      select c.created_by, jsonb_build_object('name', c.name, 'description', c.description, 'slug', c.slug)
        into owner, snap
      from public.communities c
      where c.id::text = new.target_id;
  end case;

  if snap is null then
    raise exception 'Nothing to report there' using errcode = 'P0002';
  end if;
  if owner = me then
    raise exception 'You can''t report yourself' using errcode = '22023';
  end if;

  new.reporter_id := me;
  new.target_user_id := owner;
  new.snapshot := snap;
  new.status := 'open';
  new.resolved_by := null;
  new.resolved_at := null;
  return new;
end;
$$;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function private.reports_before_insert();

alter table public.reports enable row level security;

create policy "reports: reporter or admin reads"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_admin());

create policy "reports: anyone signed in reports"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

revoke all on public.reports from anon;
revoke insert, update, delete on public.reports from authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;

-- Admin review: remove the reported thing, or dismiss. Closes every open report
-- about the same thing. Profiles can't be removed here (suspend in the dashboard).
create function public.resolve_report(p_report uuid, p_remove boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reports;
begin
  if not private.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select * into r from public.reports where id = p_report;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  if p_remove then
    case r.target_type
      when 'post' then
        update public.posts set deleted_at = coalesce(deleted_at, now()) where id::text = r.target_id;
      when 'comment' then
        update public.comments set deleted_at = coalesce(deleted_at, now()) where id::text = r.target_id;
      when 'message' then
        update public.messages set deleted_at = coalesce(deleted_at, now()) where id::text = r.target_id;
      when 'community' then
        delete from public.communities where id::text = r.target_id;
      when 'profile' then
        raise exception 'Suspend accounts in the Supabase dashboard' using errcode = '22023';
    end case;
  end if;

  update public.reports
  set status = case when p_remove then 'actioned' else 'dismissed' end::public.report_status,
      resolved_by = (select auth.uid()),
      resolved_at = now()
  where target_type = r.target_type and target_id = r.target_id and status = 'open';
end;
$$;

revoke all on function public.resolve_report(uuid, boolean) from public, anon;
grant execute on function public.resolve_report(uuid, boolean) to authenticated;
