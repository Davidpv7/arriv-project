-- The API roles have exactly the table privileges the app needs, granted explicitly
-- (the hosted project grants nothing by default), and new objects get nothing until a
-- migration grants it. RLS decides rows; these decide whether the table is usable at all.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- The app can read every table it uses (RLS then filters rows).
select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and not has_table_privilege('authenticated', c.oid, 'select')
$$, 'authenticated can select from every public table');

-- Deletes the app relies on (owner-only via RLS).
select ok(has_table_privilege('authenticated', 'public.documents', 'delete'), 'authenticated can delete documents (own, via RLS)');
select ok(has_table_privilege('authenticated', 'public.milestones', 'delete'), 'authenticated can delete milestones (own, via RLS)');
select ok(has_table_privilege('authenticated', 'public.notifications', 'delete'), 'authenticated can clear notifications (own, via RLS)');
select ok(has_table_privilege('authenticated', 'public.notification_settings', 'insert')
  and has_table_privilege('authenticated', 'public.notification_settings', 'update'),
  'authenticated can save push settings');

-- Things the app must never do directly stay closed.
select ok(not has_table_privilege('authenticated', 'public.reports', 'update'), 'reports are resolved only through resolve_report');
select ok(not has_table_privilege('authenticated', 'public.notifications', 'insert'), 'only the database creates notifications');
select ok(not has_table_privilege('anon', 'public.documents', 'select'), 'signed-out visitors cannot read documents');

-- The server role (delete-account) can read and delete everywhere.
select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and not (has_table_privilege('service_role', c.oid, 'select') and has_table_privilege('service_role', c.oid, 'delete'))
$$, 'service_role can select and delete on every public table');

-- New objects are exposed to nobody until a migration grants it (same as hosted).
create table public.privileges_probe (id int);
select ok(not has_table_privilege('authenticated', 'public.privileges_probe', 'select')
  and not has_table_privilege('anon', 'public.privileges_probe', 'select')
  and not has_table_privilege('service_role', 'public.privileges_probe', 'select'),
  'a new table is not exposed to any API role by default');

select * from finish();
rollback;
