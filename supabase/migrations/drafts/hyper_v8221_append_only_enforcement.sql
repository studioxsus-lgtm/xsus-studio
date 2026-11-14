-- Hyper v8.2.21 — DRAFT ONLY; DO NOT RUN ON LIVE SUPABASE.
-- Requires security review, migration rehearsal and explicit authorization.
-- Protects ordinary DML from UPDATE / DELETE / TRUNCATE.
-- NOT tamper-proof against privileged owners, superusers or disabled triggers.
-- Service-role and table-owner privileges must be independently audited.

create or replace function public.hyper_runtime_evidence_reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'hyper_runtime_evidence is append-only'
    using errcode = '42501';
end;
$$;

revoke all on function public.hyper_runtime_evidence_reject_mutation()
  from public, anon, authenticated;

drop trigger if exists hyper_runtime_evidence_no_mutation
  on public.hyper_runtime_evidence;
create trigger hyper_runtime_evidence_no_mutation
before update or delete on public.hyper_runtime_evidence
for each row execute function public.hyper_runtime_evidence_reject_mutation();

-- TRUNCATE has statement-level triggers, not row-level triggers.
drop trigger if exists hyper_runtime_evidence_no_truncate
  on public.hyper_runtime_evidence;
create trigger hyper_runtime_evidence_no_truncate
before truncate on public.hyper_runtime_evidence
for each statement execute function public.hyper_runtime_evidence_reject_mutation();

-- Explicitly restrict ordinary client roles. No policies are granted.
revoke update, delete, truncate on public.hyper_runtime_evidence
  from anon, authenticated;
-- NOTE: Does not authorize INSERT or SELECT for any role.
-- Provenance signatures and operational retention remain separate work.
