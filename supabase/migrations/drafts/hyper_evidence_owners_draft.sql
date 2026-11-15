-- DRAFT ONLY. DO NOT APPLY WITHOUT APPROVAL AND SECURITY REVIEW.
-- The owner association must be written by a trusted server workflow when
-- the evidence is created, never from an untrusted browser request.
create table if not exists public.hyper_evidence_owners (
  observation_id text primary key
    check (observation_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.hyper_evidence_owners enable row level security;
alter table public.hyper_evidence_owners force row level security;
revoke all on public.hyper_evidence_owners from public, anon, authenticated;
-- service_role bypasses RLS. Limit its use to trusted server code and audit
-- grants, ownership provisioning, deletion and lifecycle separately.
-- This draft does not create an automatic ownership provisioning mechanism.
