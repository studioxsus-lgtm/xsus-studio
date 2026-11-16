-- Hyper XSUS Core — recovery incident history CAS, server-only.
-- Apply through a trusted database migration process, not the browser.
create table if not exists public.xsus_recovery_incident_histories (
  scope text primary key check (scope ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  revision bigint not null check (revision >= 0),
  snapshot jsonb not null,
  updated_at timestamptz not null default now(),
  constraint incident_history_revision_matches check (
    jsonb_typeof(snapshot) = 'object'
    and jsonb_typeof(snapshot -> 'entries') = 'array'
    and (snapshot ->> 'revision') ~ '^[0-9]+$'
    and (snapshot ->> 'revision')::numeric = revision
    and jsonb_array_length(snapshot -> 'entries') = revision
  )
);
alter table public.xsus_recovery_incident_histories enable row level security;
alter table public.xsus_recovery_incident_histories force row level security;
revoke all on public.xsus_recovery_incident_histories from public, anon, authenticated;
grant select, insert, update on public.xsus_recovery_incident_histories to service_role;

create or replace function public.xsus_recovery_incident_history_cas(
  p_scope text, p_expected_revision bigint, p_snapshot jsonb
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare
  changed integer;
begin
  if p_scope is null or p_scope !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
     or p_expected_revision is null or p_expected_revision < 0
     or p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object'
     or jsonb_typeof(p_snapshot -> 'entries') <> 'array'
     or (p_snapshot ->> 'revision') is null
     or (p_snapshot ->> 'revision') !~ '^[0-9]+$'
     or (p_snapshot ->> 'revision')::numeric <> p_expected_revision + 1
     or jsonb_array_length(p_snapshot -> 'entries') <> p_expected_revision + 1 then
    raise exception 'Invalid recovery incident history CAS payload'
      using errcode = '22023';
  end if;
  if p_expected_revision = 0 then
    insert into public.xsus_recovery_incident_histories(scope, revision, snapshot)
    values (p_scope, 1, p_snapshot)
    on conflict (scope) do nothing;
  else
    update public.xsus_recovery_incident_histories
       set revision = p_expected_revision + 1, snapshot = p_snapshot,
           updated_at = now()
     where scope = p_scope and revision = p_expected_revision;
  end if;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.xsus_recovery_incident_history_cas(text, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.xsus_recovery_incident_history_cas(text, bigint, jsonb)
  to service_role;
