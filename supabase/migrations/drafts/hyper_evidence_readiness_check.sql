-- READ ONLY: safe to run in Supabase SQL Editor.
-- No CREATE/ALTER/INSERT/UPDATE/DELETE statements.
-- All checks should be true before considering evidence-route activation.
with required_tables(table_name) as (
 values ('hyper_runtime_evidence_bundles'),('hyper_evidence_owners')
), table_state as (
 select t.table_name, c.oid, c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as force_rls
 from required_tables t
 left join pg_class c on c.oid=to_regclass('public.'||t.table_name)
), columns_expected(table_name,column_name) as (
 values ('hyper_runtime_evidence_bundles','observation_id'),
        ('hyper_evidence_owners','observation_id'),
        ('hyper_evidence_owners','user_id')
)
select 'table_exists:'||table_name as check_name, oid is not null as passed
from table_state
union all
select 'rls_enabled:'||table_name, coalesce(rls_enabled,false) from table_state
union all
select 'force_rls:'||table_name, coalesce(force_rls,false) from table_state
union all
select 'column_exists:'||table_name||'.'||column_name,
       exists(select 1 from information_schema.columns c
         where c.table_schema='public' and c.table_name=e.table_name
           and c.column_name=e.column_name)
from columns_expected e
union all
select 'owners_observation_fk',
       exists(select 1 from pg_constraint k
         where k.conrelid=to_regclass('public.hyper_evidence_owners')
           and k.contype='f'
           and k.confrelid=to_regclass('public.hyper_runtime_evidence_bundles'))
union all
select 'no_anon_authenticated_table_privileges',
       not exists (
         select 1 from information_schema.role_table_grants g
         where g.table_schema='public'
           and g.table_name in ('hyper_evidence_owners','hyper_runtime_evidence_bundles')
           and g.grantee in ('anon','authenticated')
           and g.privilege_type in ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE')
       )
order by check_name;
