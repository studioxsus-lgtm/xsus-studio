-- Hyper v8.2.28 READ-ONLY audit. Manual review; do not treat as attestation.
select n.nspname, c.relname, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='hyper_runtime_evidence_bundles';

select r.rolname,
  has_table_privilege(r.oid,to_regclass('public.hyper_runtime_evidence_bundles'),'SELECT') as can_select,
  has_table_privilege(r.oid,to_regclass('public.hyper_runtime_evidence_bundles'),'INSERT') as can_insert,
  has_table_privilege(r.oid,to_regclass('public.hyper_runtime_evidence_bundles'),'UPDATE') as can_update,
  has_table_privilege(r.oid,to_regclass('public.hyper_runtime_evidence_bundles'),'DELETE') as can_delete,
  has_table_privilege(r.oid,to_regclass('public.hyper_runtime_evidence_bundles'),'TRUNCATE') as can_truncate
from pg_roles r
where r.rolname in ('anon','authenticated','service_role')
  and to_regclass('public.hyper_runtime_evidence_bundles') is not null
order by r.rolname;

select tgname, tgenabled, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid=to_regclass('public.hyper_runtime_evidence_bundles')
  and not tgisinternal order by tgname;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='hyper_runtime_evidence_bundles'
order by policyname;
