-- Hyper XSUS Core v8.1: server-only immutable audit storage.
-- Execute in Supabase SQL editor only after reviewing permissions and backups.
-- This is NOT a trusted external anchor or complete signed audit migration.
begin;
create table if not exists public.xsus_hyper_audit_v81 (
 event_id uuid primary key,
 sequence bigint not null unique check (sequence > 0),
 previous_hash text not null check (previous_hash ~ '^[a-f0-9]{64}$'),
 entry_hash text not null check (entry_hash ~ '^[a-f0-9]{64}$'),
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
 created_at timestamptz not null default now()
);
alter table public.xsus_hyper_audit_v81 enable row level security;
alter table public.xsus_hyper_audit_v81 force row level security;
revoke all on public.xsus_hyper_audit_v81 from public, anon, authenticated;
-- Service-role access is reserved for the trusted Node backend only.
grant select, insert on public.xsus_hyper_audit_v81 to service_role;
create or replace function public.xsus_hyper_audit_v81_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
 raise exception 'XSUS Hyper audit rows are immutable';
end;
$$;
drop trigger if exists xsus_hyper_audit_v81_no_mutation on public.xsus_hyper_audit_v81;
create trigger xsus_hyper_audit_v81_no_mutation
before update or delete on public.xsus_hyper_audit_v81
for each row execute function public.xsus_hyper_audit_v81_immutable();
-- Concurrency and hash-chain validation still require a separate
-- database-atomic append function before production use.
commit;
