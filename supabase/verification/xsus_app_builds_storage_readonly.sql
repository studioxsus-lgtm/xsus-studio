-- XSUS App private build storage — read-only production audit.
-- Run in Supabase SQL Editor and review every returned row.
-- No production state is modified.
select
  exists (
    select 1 from storage.buckets
    where id = 'xsus-app-builds'
      and name = 'xsus-app-builds'
      and public = false
  ) as private_bucket_exists,
  (
    select file_size_limit
    from storage.buckets where id = 'xsus-app-builds'
  ) as configured_file_size_limit,
  (
    select allowed_mime_types
    from storage.buckets where id = 'xsus-app-builds'
  ) as configured_mime_types,
  coalesce((
    select c.relrowsecurity
    from pg_class c where c.oid = to_regclass('storage.objects')
  ), false) as storage_objects_rls_enabled;

-- Audit every storage.objects policy: policies on this shared table can
-- unintentionally authorize access to xsus-app-builds even if the bucket
-- is private. Review USING and WITH CHECK conditions manually.
select
  schemaname, tablename, policyname, permissive, roles, cmd,
  qual as using_expression, with_check as check_expression
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- Detect existing objects for manual migration review without exposing
-- content, owner identities, or object paths.
select count(*) as existing_build_objects
from storage.objects where bucket_id = 'xsus-app-builds';
