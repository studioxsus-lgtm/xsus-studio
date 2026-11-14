-- Hyper XSUS Core v8.1.1: atomic chain-head compare-and-append.
-- REVIEW BEFORE APPLYING. Requires v8.1 base schema.
-- No signing key is stored in SQL. Cryptographic payload verification remains
-- the responsibility of the trusted server; this RPC enforces chain continuity.
begin;
-- Remove direct insertion privileges. Only the vetted RPC may append.
revoke insert on public.xsus_hyper_audit_v81 from public, anon, authenticated, service_role;

create or replace function public.xsus_hyper_append_v811(
 p_event_id uuid,
 p_sequence bigint,
 p_previous_hash text,
 p_entry_hash text,
 p_payload jsonb
)
returns setof public.xsus_hyper_audit_v81
language plpgsql security definer
set search_path = ''
as $$
declare
 v_sequence bigint;
 v_tip text;
begin
 -- Never allow a browser/user JWT to call this privileged function.
 if coalesce(auth.role(), '') <> 'service_role' then
   raise exception 'XSUS Hyper audit access denied' using errcode = '42501';
 end if;
 if p_event_id is null or p_sequence is null or p_sequence < 1
    or p_previous_hash !~ '^[a-f0-9]{64}$'
    or p_entry_hash !~ '^[a-f0-9]{64}$'
    or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
   raise exception 'XSUS Hyper audit invalid append';
 end if;

 -- Serialize concurrent writers, including the empty-chain first insert.
 lock table public.xsus_hyper_audit_v81 in exclusive mode;
 select sequence, entry_hash into v_sequence, v_tip
 from public.xsus_hyper_audit_v81
 order by sequence desc limit 1;

 if v_sequence is null then
   if p_sequence <> 1 or p_previous_hash <> repeat('0', 64) then
     raise exception 'XSUS Hyper audit chain head mismatch';
   end if;
 elsif p_sequence <> v_sequence + 1 or p_previous_hash <> v_tip then
   raise exception 'XSUS Hyper audit chain head mismatch';
 end if;

 return query
 insert into public.xsus_hyper_audit_v81
 (event_id, sequence, previous_hash, entry_hash, payload)
 values (p_event_id, p_sequence, p_previous_hash, p_entry_hash, p_payload)
 returning *;
end;
$$;
revoke all on function public.xsus_hyper_append_v811(uuid,bigint,text,text,jsonb)
 from public, anon, authenticated;
grant execute on function public.xsus_hyper_append_v811(uuid,bigint,text,text,jsonb)
 to service_role;
commit;
