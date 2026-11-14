-- XSUS Hyper v8.2.24 — DRAFT ONLY; DO NOT EXECUTE ON LIVE DATABASE.
-- Atomicity: evidence fields and MAC fields live in ONE row, ONE INSERT.
-- This is a NEW table; does not mutate v8.2.16 runtime evidence schema.
-- An HMAC proves possession of the shared secret, NOT independent Render identity.
-- Review server role privileges, RLS, backups, retention and key rotation first.
create table if not exists public.hyper_runtime_evidence_bundles (
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
  recorded_at timestamptz not null default now(),
  check (started_at <= observed_at),
  check (observed_at <= recorded_at + interval '5 minutes')
);
create index if not exists hyper_runtime_evidence_bundles_service_observed_idx
  on public.hyper_runtime_evidence_bundles (service_id, observed_at desc);
alter table public.hyper_runtime_evidence_bundles enable row level security;
alter table public.hyper_runtime_evidence_bundles force row level security;
revoke all on public.hyper_runtime_evidence_bundles from anon, authenticated;
-- No client policies, no server grants and no runtime activation.
-- IMPORTANT: v8.2.21 triggers target another table. This draft is NOT
-- append-only protected until dedicated UPDATE/DELETE/TRUNCATE controls exist.
