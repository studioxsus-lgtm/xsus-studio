-- Hyper v8.2.20 — READ ONLY security inspection.
-- Execute manually in the intended Supabase project after reviewing.
-- Returns catalog facts, NOT a certification or automatic activation.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls,
  c.relkind as relation_kind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'hyper_runtime_evidence';

select
  r.rolname as role_name,
  has_table_privilege(r.oid, to_regclass('public.hyper_runtime_evidence'), 'SELECT') as can_select,
  has_table_privilege(r.oid, to_regclass('public.hyper_runtime_evidence'), 'INSERT') as can_insert,
  has_table_privilege(r.oid, to_regclass('public.hyper_runtime_evidence'), 'UPDATE') as can_update,
  has_table_privilege(r.oid, to_regclass('public.hyper_runtime_evidence'), 'DELETE') as can_delete
from pg_roles r
where r.rolname in ('anon', 'authenticated', 'service_role')
  and to_regclass('public.hyper_runtime_evidence') is not null
order by r.rolname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'hyper_runtime_evidence'
order by policyname;

select
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t
where t.tgrelid = to_regclass('public.hyper_runtime_evidence')
  and not t.tgisinternal;

select
  a.attname as column_name,
  format_type(a.atttypid, a.atttypmod) as data_type,
  a.attnotnull as not_null
from pg_attribute a
where a.attrelid = to_regclass('public.hyper_runtime_evidence')
  and a.attnum > 0 and not a.attisdropped
order by a.attnum;
