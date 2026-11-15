-- XSUS Hyper evidence initial setup — REVIEW REQUIRED BEFORE EXECUTION.
-- Draft for an environment where both tables are absent (readiness audit 2026-11-15).
-- No existing tables are dropped, altered, or overwritten. Execute only once
-- after verifying the Supabase project and reviewing service-role privileges.
-- Does NOT provision evidence ownership or enable the Render endpoint.
begin;
create table public.hyper_runtime_evidence_bundles (
  observation_id text primary key check (observation_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  service_id text not null check (service_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  instance_id text not null check (instance_id ~ '^[A-Za-z0-9-]{8,128}$'),
  process_id bigint not null check (process_id > 0),
  started_at timestamptz not null,
  observed_at timestamptz not null,
  source text not null check (source = 'local-process-observation'),
  envelope_version integer not null check (envelope_version = 1),
  envelope_algorithm text not null check (envelope_algorithm = 'HMAC-SHA256'),
  envelope_key_id text not null check (envelope_key_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  evidence_digest text not null check (evidence_digest ~ '^[a-f0-9]{64}$'),
  authentication_tag text not null check (authentication_tag ~ '^[a-f0-9]{64}$'),
  constraint hyper_evidence_time_order check (started_at <= observed_at)
);
create table public.hyper_evidence_owners (
  observation_id text primary key
    references public.hyper_runtime_evidence_bundles(observation_id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index hyper_evidence_owners_user_id_idx on public.hyper_evidence_owners(user_id);
alter table public.hyper_runtime_evidence_bundles enable row level security;
alter table public.hyper_runtime_evidence_bundles force row level security;
alter table public.hyper_evidence_owners enable row level security;
alter table public.hyper_evidence_owners force row level security;
revoke all on table public.hyper_runtime_evidence_bundles from public, anon, authenticated;
revoke all on table public.hyper_evidence_owners from public, anon, authenticated;
-- No policies: ordinary clients cannot read/write these tables.
-- Service-role access bypasses RLS; keep key server-side only.
-- Prevent ordinary mutation (table owners/elevated roles can bypass triggers).
create function public.hyper_evidence_reject_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Hyper evidence records are append-only' using errcode = '42501';
end; $$;
revoke all on function public.hyper_evidence_reject_mutation() from public, anon, authenticated;
create trigger hyper_evidence_bundles_no_update_delete
  before update or delete on public.hyper_runtime_evidence_bundles
  for each row execute function public.hyper_evidence_reject_mutation();
create trigger hyper_evidence_bundles_no_truncate
  before truncate on public.hyper_runtime_evidence_bundles
  for each statement execute function public.hyper_evidence_reject_mutation();
create trigger hyper_evidence_owners_no_update_delete
  before update or delete on public.hyper_evidence_owners
  for each row execute function public.hyper_evidence_reject_mutation();
create trigger hyper_evidence_owners_no_truncate
  before truncate on public.hyper_evidence_owners
  for each statement execute function public.hyper_evidence_reject_mutation();
commit;
-- Next: run hyper_evidence_readiness_check.sql, review outputs,
-- implement trusted owner provisioning, and run real integration tests.
