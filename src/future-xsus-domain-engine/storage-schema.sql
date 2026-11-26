-- Deployment candidate: not applied automatically.
-- Service-only storage; application must authenticate and authorize account context.
create schema if not exists xsus_domain;
create table if not exists xsus_domain.operations (
 account_id uuid not null,
 operation_key text not null check (operation_key ~ '^[a-f0-9]{64}$'),
 revision integer not null default 0 check (revision >= 0),
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
 created_at timestamptz not null default now(),
 primary key (account_id, operation_key),
 check (payload->>'accountId' is not null and payload->>'accountId' = account_id::text),
 check (payload->>'key' is not null and payload->>'key' = operation_key),
 check (payload->>'revision' is not null and (payload->>'revision')::integer = revision),
 check (payload->>'status' is not null and payload->>'status' in ('draft','approved','cancelled'))
);
alter table xsus_domain.operations enable row level security;
alter table xsus_domain.operations force row level security;
revoke all on schema xsus_domain from public;
revoke all on xsus_domain.operations from public;
-- No client policies: deny by default. Service grants require deployment review.
