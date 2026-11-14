-- Hyper v8.2.27 — DRAFT ONLY, NEVER APPLY WITHOUT APPROVAL.
-- Applies to the NEW atomic bundle table, not the earlier evidence table.
-- Triggers reject ordinary UPDATE, DELETE and TRUNCATE.
-- Owners and elevated roles can disable triggers; this is not tamper-proof.
create or replace function public.hyper_atomic_bundle_reject_mutation()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'hyper_runtime_evidence_bundles is append-only'
    using errcode = '42501';
end;
$$;
revoke all on function public.hyper_atomic_bundle_reject_mutation()
  from public, anon, authenticated;
drop trigger if exists hyper_atomic_bundle_no_update_delete
  on public.hyper_runtime_evidence_bundles;
create trigger hyper_atomic_bundle_no_update_delete
before update or delete on public.hyper_runtime_evidence_bundles
for each row execute function public.hyper_atomic_bundle_reject_mutation();
drop trigger if exists hyper_atomic_bundle_no_truncate
  on public.hyper_runtime_evidence_bundles;
create trigger hyper_atomic_bundle_no_truncate
before truncate on public.hyper_runtime_evidence_bundles
for each statement execute function public.hyper_atomic_bundle_reject_mutation();
revoke update, delete, truncate on public.hyper_runtime_evidence_bundles
  from anon, authenticated;
-- Review grants for service_role and owner; RLS is not a substitute for grants.
