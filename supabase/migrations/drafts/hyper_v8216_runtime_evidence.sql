-- XSUS Hyper v8.2.16 — DRAFT ONLY. DO NOT APPLY TO PRODUCTION.
-- Dedicated, append-only runtime observations. Must be reviewed for the
-- actual Supabase project, roles, operational retention and audit requirements.
create table if not exists public.hyper_runtime_evidence (
  observation_id text primary key
    check (observation_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  service_id text not null
    check (service_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  instance_id text not null
    check (instance_id ~ '^[A-Za-z0-9-]{8,128}$'),
  process_id bigint not null check (process_id > 0),
  started_at timestamptz not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  source text not null default 'local-process-observation'
    check (source = 'local-process-observation'),
  check (started_at <= observed_at),
  check (observed_at <= recorded_at + interval '5 minutes')
);
create index if not exists hyper_runtime_evidence_service_observed_idx
  on public.hyper_runtime_evidence(service_id, observed_at desc);
alter table public.hyper_runtime_evidence enable row level security;
alter table public.hyper_runtime_evidence force row level security;
revoke all on public.hyper_runtime_evidence from anon, authenticated;
-- No client policies or grants are created. Server access must be separately
-- reviewed and constrained; FORCE RLS does not itself authenticate evidence.
-- Append-only enforcement, provenance signing and retention remain TODO.
