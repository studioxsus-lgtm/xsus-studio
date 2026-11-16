-- Read-only Supabase readiness audit. No changes to production.
select
  to_regclass('public.xsus_app_projects') is not null as projects_table_exists,
  to_regclass('public.xsus_app_architecture_drafts') is not null as drafts_table_exists,
  coalesce((
    select c.relrowsecurity and c.relforcerowsecurity
    from pg_class c
    where c.oid = to_regclass('public.xsus_app_architecture_drafts')
  ), false) as drafts_rls_and_force_rls,
  coalesce((
    select not has_table_privilege('anon', c.oid, 'SELECT')
      and not has_table_privilege('authenticated', c.oid, 'INSERT')
      and not has_table_privilege('authenticated', c.oid, 'UPDATE')
      and not has_table_privilege('authenticated', c.oid, 'DELETE')
    from pg_class c
    where c.oid = to_regclass('public.xsus_app_architecture_drafts')
  ), false) as drafts_browser_writes_denied,
  coalesce((
    select count(*) = 1 from pg_policy
    where polrelid = to_regclass('public.xsus_app_architecture_drafts')
      and polname = 'xsus_app_architecture_drafts_select_own'
  ), false) as drafts_owner_read_policy_exists;
