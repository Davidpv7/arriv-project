-- Guard for CLAUDE.md rule "every new table gets RLS enabled".
-- Fails as soon as any table in `public` is created without row level security.
begin;
create extension if not exists pgtap with schema extensions;

select plan(1);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every table in public has row level security enabled'
);

select * from finish();
rollback;
