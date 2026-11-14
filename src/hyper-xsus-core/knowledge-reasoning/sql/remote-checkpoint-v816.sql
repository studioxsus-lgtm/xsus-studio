-- Hyper XSUS Core v8.1.6 — deploy ONLY to a separately controlled
-- checkpoint Supabase project. Never deploy into the audit database.
-- Genesis record must be explicitly provisioned via reviewed operator procedure.
begin;
create table if not exists public.xsus_hyper_checkpoint_v816 (
 id integer primary key default 1 check(id=1),
 count bigint not null check(count>=0),
 tip text not null check(tip ~ '^[a-f0-9]{64}$'),
 signature text not null check(signature ~ '^[a-f0-9]{64}$'),
 "keyId" text not null check("keyId" ~ '^[A-Za-z0-9._-]{1,128}$')
);
alter table public.xsus_hyper_checkpoint_v816 enable row level security;
alter table public.xsus_hyper_checkpoint_v816 force row level security;
revoke all on public.xsus_hyper_checkpoint_v816 from public,anon,authenticated;
grant select on public.xsus_hyper_checkpoint_v816 to service_role;
-- Service role may read only. Writes happen via CAS RPC.
revoke insert,update,delete on public.xsus_hyper_checkpoint_v816 from service_role;

create or replace function public.xsus_hyper_checkpoint_cas_v816(
 p_expected_count bigint,p_expected_tip text,
 p_expected_signature text,p_expected_key_id text,
 p_next_count bigint,p_next_tip text,
 p_next_signature text,p_next_key_id text
) returns boolean language plpgsql security definer
set search_path = '' as $$
declare changed integer;
begin
 if coalesce(auth.role(),'') <> 'service_role' then
   raise exception 'XSUS checkpoint access denied' using errcode='42501';
 end if;
 if p_next_count is null or p_expected_count is null or
    p_next_count<>p_expected_count+1 or
    p_expected_key_id is distinct from p_next_key_id or
    p_expected_tip !~ '^[a-f0-9]{64}$' or
    p_next_tip !~ '^[a-f0-9]{64}$' or
    p_expected_signature !~ '^[a-f0-9]{64}$' or
    p_next_signature !~ '^[a-f0-9]{64}$' or
    p_expected_key_id !~ '^[A-Za-z0-9._-]{1,128}$' then
   raise exception 'XSUS checkpoint invalid CAS';
 end if;
 update public.xsus_hyper_checkpoint_v816
 set count=p_next_count,tip=p_next_tip,signature=p_next_signature
 where id=1 and count=p_expected_count and tip=p_expected_tip
 and signature=p_expected_signature and "keyId"=p_expected_key_id;
 get diagnostics changed = row_count;
 return changed=1;
end;
$$;
revoke all on function public.xsus_hyper_checkpoint_cas_v816(
 bigint,text,text,text,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.xsus_hyper_checkpoint_cas_v816(
 bigint,text,text,text,bigint,text,text,text) to service_role;
commit;
-- Caveat: SECURITY DEFINER bypasses table RLS for its owner; keep owner
-- privileged, restrict EXECUTE, and audit operator/admin access.
-- An independent administrator must control key custody and backups.
