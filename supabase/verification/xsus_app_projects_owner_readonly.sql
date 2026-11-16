-- Read-only XSUS App project ownership readiness audit.
-- Run in Supabase SQL editor; this does not create or change anything.
select
  to_regclass('public.xsus_app_projects') is not null as projects_table_exists,
  coalesce((
    select c.relrowsecurity
    from pg_class c
    where c.oid = to_regclass('public.xsus_app_projects')
  ), false) as rls_enabled,
  coalesce((
    select c.relforcerowsecurity
    from pg_class c
    where c.oid = to_regclass('public.xsus_app_projects')
  ), false) as force_rls_enabled,
  coalesce((
    select count(*) filter (where polname = 'xsus_app_projects_select_own') = 1
      and count(*) filter (where polname = 'xsus_app_projects_insert_own') = 1
      and count(*) filter (where polname = 'xsus_app_projects_update_own') = 1
      and count(*) filter (where polname = 'xsus_app_projects_delete_own') = 1
    from pg_policy
    where polrelid = to_regclass('public.xsus_app_projects')
  ), false) as expected_policies_exist,
  coalesce((select not has_table_privilege('anon', c.oid, 'SELECT')\n    from pg_class c where c.oid = to_regclass('public.xsus_app_projects')), false) as anon_select_denied;
