-- Phase 7c: deleting an account.
-- The delete-account Edge Function (service role) asks for every stored file that
-- belongs to the person, removes them through the Storage API, then deletes the
-- auth user; the database cascades everything else (profile, posts, comments, own
-- messages, Backpack rows, Journey, connections, tokens, notifications). The
-- profiles_before_delete trigger still refuses while they own a community.

-- Every file of a person: their Backpack and avatar folders, the photos of their
-- posts, and anything they uploaded (chat attachments). Server only.
create function public.account_storage_paths(p_user uuid)
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.owner_id = p_user::text
     or (o.bucket_id in ('backpack', 'avatars') and (storage.foldername(o.name))[1] = p_user::text)
     or (o.bucket_id = 'post-media' and exists (
           select 1 from public.posts p
           where p.id::text = (storage.foldername(o.name))[1] and p.author_id = p_user))
  group by o.bucket_id, o.name;
$$;

revoke all on function public.account_storage_paths(uuid) from public, anon, authenticated;
grant execute on function public.account_storage_paths(uuid) to service_role;
