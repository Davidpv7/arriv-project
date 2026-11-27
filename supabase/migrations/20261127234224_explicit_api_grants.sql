-- Explicit table privileges for the API roles.
--
-- Found 28 Nov 2026: the hosted project (created Nov 2026) does not grant new
-- tables, sequences or functions to anon/authenticated/service_role by default,
-- while the local stack still did. Migrations from Phase 4 on relied on the old
-- default, so on the hosted project the app couldn't read Backpack, Journey,
-- notifications or reports, and the delete-account function (service_role)
-- couldn't read any table. RLS policies were all in place; the table-level
-- privileges underneath them were missing.
--
-- This grants exactly what the local stack had (minus anything anon), and makes
-- the local stack behave like hosted from now on, so a missing grant fails in
-- local tests instead of in production.

-- ---------------------------------------------------------------------------
-- authenticated: table privileges (RLS still decides which rows).
-- Inserts and updates on most of these are column grants in their own migrations.
-- ---------------------------------------------------------------------------
grant select, delete on
  public.backpack_folders,
  public.documents,
  public.milestones,
  public.milestone_documents,
  public.notifications,
  public.push_tokens
to authenticated;

grant select, insert, update, delete on public.notification_settings to authenticated;

-- Signed-out visitors never touch the Backpack (hosted already has nothing here).
revoke all on public.backpack_folders, public.documents from anon;
revoke usage on sequence public.messages_id_seq from anon;
grant select on public.reports to authenticated;
grant usage on sequence public.messages_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- service_role: server-side only (Edge Functions such as delete-account; never in
-- the app). It bypasses RLS by design and gets full access, as Supabase sets up.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- From now on, local = hosted: objects created by later migrations are exposed to
-- nobody until the migration grants it explicitly (see CLAUDE.md).
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
-- (New functions are still executable by PUBLIC, on hosted too: that's PostgreSQL's
-- built-in default. Sensitive functions revoke it explicitly, as they already do.)
