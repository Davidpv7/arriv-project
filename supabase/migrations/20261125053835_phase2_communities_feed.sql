-- Phase 2: communities and feed.
-- Spec: docs/arriv-mvp-spec.md §3.3, §4, §5 (post-media), §6.
-- The community chat conversation (spec §3.3 trigger) is added with the chat
-- tables in Phase 3. posts.milestone_id is added with milestones in Phase 5.

create extension if not exists unaccent with schema extensions;

create type public.community_kind as enum ('city', 'visa', 'language', 'culture', 'interest');
create type public.member_role as enum ('owner', 'moderator', 'member');
create type public.post_kind as enum ('post', 'question', 'journey_update');

-- ---------------------------------------------------------------------------
-- communities
-- ---------------------------------------------------------------------------
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  -- Always set by the communities_set_slug trigger; the default only makes it optional on insert.
  slug extensions.citext not null default '' unique check (slug::text ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 3 and 40),
  description text not null default '' check (char_length(description) <= 500),
  kind public.community_kind not null,
  city text check (char_length(city) <= 60),          -- null = Australia-wide ("Gate AU")
  language text check (language ~ '^[a-z]{2}$'),       -- ISO 639-1, e.g. 'es'
  visa_subclass text check (visa_subclass ~ '^[0-9]{3}$'),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  stamp_color text not null default 'tangerine'
    check (stamp_color in ('tangerine', 'sunshine', 'sky', 'card')),
  is_private boolean not null default false,
  member_count integer not null default 0,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index communities_city_idx on public.communities (lower(city));
create index communities_visa_idx on public.communities (visa_subclass);
create index communities_language_idx on public.communities (language);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index community_members_user_idx on public.community_members (user_id);

-- ---------------------------------------------------------------------------
-- posts, media, comments, likes
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  community_id uuid references public.communities (id) on delete cascade, -- null = profile post
  kind public.post_kind not null default 'post',
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index posts_created_idx on public.posts (created_at desc) where deleted_at is null;
create index posts_community_idx on public.posts (community_id, created_at desc) where deleted_at is null;
create index posts_author_idx on public.posts (author_id, created_at desc) where deleted_at is null;

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null unique,
  width integer check (width > 0),
  height integer check (height > 0),
  position smallint not null default 0 check (position between 0 and 3),
  unique (post_id, position),
  check (storage_path like post_id::text || '/%')
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade, -- null = top level
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index comments_post_idx on public.comments (post_id, created_at);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_user_idx on public.post_likes (user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function private.is_community_member(c uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_members
    where community_id = c and user_id = (select auth.uid())
  );
$$;

create function private.is_community_mod(c uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_members
    where community_id = c and user_id = (select auth.uid()) and role in ('owner', 'moderator')
  );
$$;

-- Public communities: anyone signed in. Private (not used in the v1 UI): members and admins.
create function private.can_read_community(c uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.communities
    where id = c and (not is_private or private.is_community_member(c) or private.is_admin())
  );
$$;

grant execute on function private.is_community_member(uuid) to authenticated;
grant execute on function private.is_community_mod(uuid) to authenticated;
grant execute on function private.can_read_community(uuid) to authenticated;

-- Main language for an origin country (used only to suggest language crews).
create function private.origin_language(country char(2))
returns text
language sql
immutable
set search_path = ''
as $$
  select case upper(country)
    when 'BR' then 'pt' when 'PT' then 'pt' when 'AO' then 'pt' when 'MZ' then 'pt'
    when 'ES' then 'es' when 'MX' then 'es' when 'CO' then 'es' when 'AR' then 'es'
    when 'CL' then 'es' when 'PE' then 'es' when 'VE' then 'es' when 'EC' then 'es'
    when 'UY' then 'es' when 'BO' then 'es' when 'PY' then 'es' when 'CR' then 'es'
    when 'GT' then 'es' when 'HN' then 'es' when 'NI' then 'es' when 'PA' then 'es'
    when 'SV' then 'es' when 'DO' then 'es' when 'CU' then 'es'
    when 'CN' then 'zh' when 'TW' then 'zh' when 'HK' then 'zh'
    when 'KR' then 'ko' when 'JP' then 'ja' when 'VN' then 'vi' when 'TH' then 'th'
    when 'ID' then 'id' when 'MY' then 'ms' when 'PH' then 'tl'
    when 'IN' then 'hi' when 'NP' then 'ne' when 'PK' then 'ur' when 'BD' then 'bn' when 'LK' then 'si'
    when 'FR' then 'fr' when 'DE' then 'de' when 'IT' then 'it' when 'NL' then 'nl'
    when 'TR' then 'tr' when 'IR' then 'fa' when 'RU' then 'ru' when 'UA' then 'uk'
    when 'PL' then 'pl' when 'GR' then 'el'
    when 'SA' then 'ar' when 'EG' then 'ar' when 'LB' then 'ar' when 'JO' then 'ar'
    when 'SY' then 'ar' when 'IQ' then 'ar' when 'AE' then 'ar'
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Slug from the name, unique: "Latinos en Sydney" -> "latinos-en-sydney"(-1234)
create function private.communities_set_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text;
  candidate text;
begin
  base := left(trim(both '-' from
    regexp_replace(lower(extensions.unaccent(new.name)), '[^a-z0-9]+', '-', 'g')), 40);
  if char_length(base) < 3 then
    base := 'crew';
  end if;
  candidate := base;
  while exists (select 1 from public.communities where slug = candidate::extensions.citext) loop
    candidate := base || '-' || (1000 + floor(random() * 9000))::int::text;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

create trigger communities_set_slug
  before insert on public.communities
  for each row execute function private.communities_set_slug();

-- Creator becomes the owner.
create function private.communities_add_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.community_members (community_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger communities_add_owner
  after insert on public.communities
  for each row execute function private.communities_add_owner();

create function private.community_members_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
  else
    update public.communities set member_count = greatest(member_count - 1, 0) where id = old.community_id;
  end if;
  return null;
end;
$$;

create trigger community_members_count
  after insert or delete on public.community_members
  for each row execute function private.community_members_count();

create function private.post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger post_likes_count
  after insert or delete on public.post_likes
  for each row execute function private.post_likes_count();

create function private.comments_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif new.deleted_at is not null and old.deleted_at is null then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = new.post_id;
  end if;
  return null;
end;
$$;

create trigger comments_count
  after insert or update of deleted_at on public.comments
  for each row execute function private.comments_count();

-- Replies are one level deep and stay on the same post.
create function private.comments_check_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.comments
    where id = new.parent_id and post_id = new.post_id and parent_id is null
  ) then
    raise exception 'Replies must answer a top-level comment on the same post'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger comments_check_parent
  before insert on public.comments
  for each row execute function private.comments_check_parent();

create function private.posts_set_edited_at()
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

create trigger posts_set_edited_at
  before update on public.posts
  for each row execute function private.posts_set_edited_at();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Home feed: own posts, posts in joined communities, posts by connections.
-- security invoker: posts RLS (blocks, private communities) still applies.
create function public.get_home_feed(p_cursor timestamptz default null, p_limit integer default 20)
returns setof public.posts
language sql
stable
security invoker
set search_path = ''
as $$
  select p.*
  from public.posts p
  where p.deleted_at is null
    and (p_cursor is null or p.created_at < p_cursor)
    and (
      p.author_id = (select auth.uid())
      or (p.community_id is not null and private.is_community_member(p.community_id))
      or private.are_connected((select auth.uid()), p.author_id)
    )
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Suggested crews: same city, same visa subclass, home-country language,
-- then Australia-wide; excludes ones already joined.
create function public.suggest_communities(p_limit integer default 8)
returns setof public.communities
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select p.city, v.visa_subclass, private.origin_language(p.origin_country) as lang
    from public.profiles p
    left join public.profile_visas v on v.user_id = p.id
    where p.id = (select auth.uid())
  )
  select c.*
  from public.communities c, me
  where not c.is_private
    and not private.is_community_member(c.id)
    and (
      (c.city is not null and lower(c.city) = lower(me.city))
      or (c.visa_subclass is not null and c.visa_subclass = me.visa_subclass)
      or (c.language is not null and c.language = me.lang)
      or c.city is null
    )
  order by
    -- coalesce: a missing city/visa/language is "no match" (0), never NULL
    (coalesce(lower(c.city) = lower(me.city), false)::int * 3
      + coalesce(c.visa_subclass = me.visa_subclass, false)::int * 3
      + coalesce(c.language = me.lang, false)::int * 2) desc,
    c.member_count desc
  limit least(greatest(p_limit, 1), 20);
$$;

-- Soft delete: the author, the community's owner/moderators, or an admin.
create function public.delete_post(p_post uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.posts;
begin
  select * into target from public.posts where id = p_post and deleted_at is null;
  if not found then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;
  if not (
    target.author_id = (select auth.uid())
    or (target.community_id is not null and private.is_community_mod(target.community_id))
    or private.is_admin()
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.posts set deleted_at = now() where id = p_post;
end;
$$;

create function public.delete_comment(p_comment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target record;
begin
  select c.author_id, p.community_id into target
  from public.comments c join public.posts p on p.id = c.post_id
  where c.id = p_comment and c.deleted_at is null;
  if not found then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;
  if not (
    target.author_id = (select auth.uid())
    or (target.community_id is not null and private.is_community_mod(target.community_id))
    or private.is_admin()
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.comments set deleted_at = now() where id = p_comment;
end;
$$;

revoke all on function public.get_home_feed(timestamptz, integer) from public, anon;
revoke all on function public.suggest_communities(integer) from public, anon;
revoke all on function public.delete_post(uuid) from public, anon;
revoke all on function public.delete_comment(uuid) from public, anon;
grant execute on function public.get_home_feed(timestamptz, integer) to authenticated;
grant execute on function public.suggest_communities(integer) to authenticated;
grant execute on function public.delete_post(uuid) to authenticated;
grant execute on function public.delete_comment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges (signed-in only; counts, slugs and ownership are never client-written).
-- Clients may choose ids (random UUIDs) so a post's image path is known before upload.
-- ---------------------------------------------------------------------------
revoke all on public.communities, public.community_members, public.posts,
  public.post_media, public.comments, public.post_likes from anon;
revoke insert, update on public.communities, public.community_members, public.posts,
  public.post_media, public.comments, public.post_likes from authenticated;

grant select, delete on public.communities to authenticated;
grant insert (id, name, description, kind, city, language, visa_subclass, tags, stamp_color, created_by)
  on public.communities to authenticated;
grant update (name, description, city, language, visa_subclass, tags, stamp_color)
  on public.communities to authenticated;

grant select, delete on public.community_members to authenticated;
grant insert (community_id, user_id) on public.community_members to authenticated;

grant select on public.posts to authenticated;
grant insert (id, author_id, community_id, kind, body) on public.posts to authenticated;
grant update (body) on public.posts to authenticated;
revoke delete on public.posts from authenticated; -- soft delete via delete_post()

grant select, delete on public.post_media to authenticated;
grant insert (post_id, storage_path, width, height, position) on public.post_media to authenticated;

grant select on public.comments to authenticated;
grant insert (id, post_id, author_id, parent_id, body) on public.comments to authenticated;
revoke delete on public.comments from authenticated; -- soft delete via delete_comment()

grant select, delete on public.post_likes to authenticated;
grant insert (post_id, user_id) on public.post_likes to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;

-- communities
create policy "communities: read"
  on public.communities for select to authenticated
  using (not is_private or private.is_community_member(id) or private.is_admin());

create policy "communities: anyone creates (public only in v1)"
  on public.communities for insert to authenticated
  with check (created_by = (select auth.uid()) and not is_private);

create policy "communities: owner or moderator edits"
  on public.communities for update to authenticated
  using (private.is_community_mod(id))
  with check (private.is_community_mod(id));

create policy "communities: owner or admin deletes"
  on public.communities for delete to authenticated
  using (created_by = (select auth.uid()) or private.is_admin());

-- community_members
create policy "community_members: read"
  on public.community_members for select to authenticated
  using (private.can_read_community(community_id));

create policy "community_members: join yourself"
  on public.community_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and exists (select 1 from public.communities c where c.id = community_id and not c.is_private)
  );

create policy "community_members: leave, or moderators remove members"
  on public.community_members for delete to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or (role = 'member' and private.is_community_mod(community_id))
  );

-- posts
create policy "posts: read"
  on public.posts for select to authenticated
  using (
    deleted_at is null
    and not private.is_blocked((select auth.uid()), author_id)
    and (community_id is null or private.can_read_community(community_id))
  );

create policy "posts: members post"
  on public.posts for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and kind in ('post', 'question') -- journey updates arrive with milestones (Phase 5)
    and (community_id is null or private.is_community_member(community_id))
  );

create policy "posts: author edits"
  on public.posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- post_media: same as the parent post; the author adds and removes
create policy "post_media: read with the post"
  on public.post_media for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "post_media: author adds"
  on public.post_media for insert to authenticated
  with check (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );

create policy "post_media: author removes"
  on public.post_media for delete to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );

-- comments
create policy "comments: read with the post"
  on public.comments for select to authenticated
  using (
    deleted_at is null
    and not private.is_blocked((select auth.uid()), author_id)
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "comments: comment on readable posts"
  on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );

-- post_likes
create policy "post_likes: read with the post"
  on public.post_likes for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "post_likes: like readable posts"
  on public.post_likes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "post_likes: unlike"
  on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Storage: post-media (private; read = can read the post; write = post author)
-- Path: {post_id}/{file}. The app serves images through signed URLs (1 hour).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "post-media: read if the post is readable"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-media'
    and exists (select 1 from public.posts p where p.id::text = (storage.foldername(name))[1])
  );

create policy "post-media: post author uploads"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(name))[1] and p.author_id = (select auth.uid())
    )
  );

create policy "post-media: post author deletes"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-media'
    and exists (
      select 1 from public.posts p
      where p.id::text = (storage.foldername(name))[1] and p.author_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Fix from Phase 1: strip accents when deriving a handle ("José" -> "jose",
-- not "jos"). Redefined here because applied migrations are never edited.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text;
  base text;
  candidate text;
begin
  name := left(coalesce(
    nullif(btrim(meta ->> 'display_name'), ''),
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Traveller'
  ), 50);

  base := left(regexp_replace(lower(extensions.unaccent(name)), '[^a-z0-9_]', '', 'g'), 15);
  if char_length(base) < 3 then
    base := 'traveller';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate::extensions.citext) loop
    candidate := base || (1000 + floor(random() * 9000))::int::text;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, candidate, name);

  insert into public.profile_visas (user_id) values (new.id);

  return new;
end;
$$;
