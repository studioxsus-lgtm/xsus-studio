-- REVIEW ONLY: do not execute until security review and explicit approval.
-- Atomic insert of signed bundle + verified owner. Caller MUST be trusted
-- server-side service_role; never expose this RPC to browser clients.
begin;
create or replace function public.hyper_insert_owned_evidence(
  p_bundle jsonb, p_user_id uuid
) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_observation_id text;
  v_claims_role text;
begin
  v_claims_role := current_setting('request.jwt.claim.role', true);
  -- Supabase PostgREST service_role only. SQL Editor superusers must not use
  -- this function for application traffic.
  if v_claims_role is distinct from 'service_role' then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if p_user_id is null or p_bundle is null or jsonb_typeof(p_bundle) <> 'object' then
    raise exception 'Invalid evidence payload' using errcode = '22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_bundle)) <> 12 then
    raise exception 'Unexpected evidence fields' using errcode = '22023';
  end if;
  insert into public.hyper_runtime_evidence_bundles (
    observation_id, service_id, instance_id, process_id,
    started_at, observed_at, source, envelope_version,
    envelope_algorithm, envelope_key_id, evidence_digest, authentication_tag
  ) values (
    p_bundle->>'observation_id', p_bundle->>'service_id',
    p_bundle->>'instance_id', (p_bundle->>'process_id')::bigint,
    (p_bundle->>'started_at')::timestamptz,
    (p_bundle->>'observed_at')::timestamptz,
    p_bundle->>'source', (p_bundle->>'envelope_version')::integer,
    p_bundle->>'envelope_algorithm', p_bundle->>'envelope_key_id',
    p_bundle->>'evidence_digest', p_bundle->>'authentication_tag'
  ) returning observation_id into v_observation_id;
  insert into public.hyper_evidence_owners(observation_id,user_id)
    values(v_observation_id,p_user_id);
  return v_observation_id;
end;
$$;
revoke all on function public.hyper_insert_owned_evidence(jsonb,uuid)
  from public, anon, authenticated;
grant execute on function public.hyper_insert_owned_evidence(jsonb,uuid)
  to service_role;
commit;
-- NOTE: service_role is privileged and can forge an owner mapping.
-- The trusted server MUST independently establish userId from an authenticated
-- operation, not from untrusted client JSON. HMAC signature and database grants
-- do not establish that relationship on their own.
