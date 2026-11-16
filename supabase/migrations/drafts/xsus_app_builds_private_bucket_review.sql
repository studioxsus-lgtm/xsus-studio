-- XSUS App build storage bucket — REVIEW DRAFT ONLY.
-- Do not execute until existing Supabase Storage policies and bucket settings
-- have been inspected. This does not activate Hyper application endpoints.
-- Server-side service_role accesses Storage only after application-level
-- JWT, ownership, and operation authorization checks.
begin;

-- Never overwrite an existing bucket's security settings silently.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'xsus-app-builds',
  'xsus-app-builds',
  false,
  262144,
  array['text/html', 'text/css', 'application/javascript']
)
on conflict (id) do nothing;

-- Deny browser roles direct object access. Policies for other buckets
-- are left unchanged; review existing global storage.objects policies.
revoke all on storage.objects from anon;
revoke all on storage.objects from authenticated;

-- IMPORTANT: PostgREST/Storage privilege behavior depends on the actual
-- project configuration. Review before applying these global revokes.
-- No authenticated/anon object policy is added for this bucket.
commit;
