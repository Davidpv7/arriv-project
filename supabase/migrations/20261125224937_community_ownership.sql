-- Communities outlive the person who created them.
-- Decided 26 Nov 2026: deleting an account never deletes a community by itself.
-- Before deleting their account, an owner either deletes each community they
-- own or hands it to another member (transfer_community_ownership). The database
-- refuses to delete a profile that still owns a community.
-- Who is in charge is community_members.role = 'owner'; created_by is history only.

alter table public.communities alter column created_by drop not null;
alter table public.communities
  drop constraint communities_created_by_fkey,
  add constraint communities_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

create function private.is_community_owner(c uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_members
    where community_id = c and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

grant execute on function private.is_community_owner(uuid) to authenticated;

-- The current owner deletes (not whoever created it, once it has been handed over).
drop policy "communities: owner or admin deletes" on public.communities;
create policy "communities: owner or admin deletes"
  on public.communities for delete to authenticated
  using (private.is_community_owner(id) or private.is_admin());

-- Hand a community to another member. The old owner stays on as a moderator
-- (and can then leave). The chat room's roles follow via community_members_mirror.
create function public.transfer_community_ownership(p_community uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if not private.is_community_owner(p_community) then
    raise exception 'Only the owner can hand over a community' using errcode = '42501';
  end if;
  if p_new_owner is null or p_new_owner = me then
    raise exception 'Pick another member' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.community_members
    where community_id = p_community and user_id = p_new_owner
  ) or private.is_blocked(me, p_new_owner) then
    raise exception 'The new owner must be a member of the community' using errcode = '22023';
  end if;

  update public.community_members set role = 'moderator'
  where community_id = p_community and user_id = me;
  update public.community_members set role = 'owner'
  where community_id = p_community and user_id = p_new_owner;
end;
$$;

revoke all on function public.transfer_community_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_community_ownership(uuid, uuid) to authenticated;

-- Safety net for the delete-account flow (and the dashboard): an account that
-- still owns a community can't be deleted, so no community is left without an owner.
create function private.profiles_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.community_members where user_id = old.id and role = 'owner') then
    raise exception 'Delete or hand over the communities you own before deleting this account'
      using errcode = '55006';
  end if;
  return old;
end;
$$;

create trigger profiles_before_delete
  before delete on public.profiles
  for each row execute function private.profiles_before_delete();
