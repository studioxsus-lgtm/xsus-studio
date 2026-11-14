-- XSUS Hyper v8.2.5 — read-only PostgreSQL catalog audit.
-- Run separately against BOTH Supabase projects (audit and checkpoint).
-- No DDL, DML, migrations, credentials or application data are accessed.
-- Results describe database metadata only; they do NOT prove live persistence.
BEGIN READ ONLY;

-- 1. Candidate Hyper tables and their row-level security state.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls,
       c.relkind AS relation_kind
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND (c.relname ILIKE '%hyper%'
       OR c.relname ILIKE '%checkpoint%'
       OR c.relname ILIKE '%audit%')
ORDER BY n.nspname, c.relname;

-- 2. Policies for candidate tables (metadata only).
SELECT schemaname, tablename, policyname, permissive, roles, cmd,
       qual IS NOT NULL AS has_using_clause,
       with_check IS NOT NULL AS has_check_clause
FROM pg_catalog.pg_policies
WHERE tablename ILIKE '%hyper%'
   OR tablename ILIKE '%checkpoint%'
   OR tablename ILIKE '%audit%'
ORDER BY schemaname, tablename, policyname;

-- 3. Candidate table columns, types, nullability (no row data).
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND (table_name ILIKE '%hyper%'
       OR table_name ILIKE '%checkpoint%'
       OR table_name ILIKE '%audit%')
ORDER BY table_schema, table_name, ordinal_position;

-- 4. Indexes and constraints supporting candidate tables.
SELECT n.nspname AS schema_name, t.relname AS table_name,
       i.relname AS index_name, x.indisunique AS is_unique,
       x.indisprimary AS is_primary
FROM pg_catalog.pg_index AS x
JOIN pg_catalog.pg_class AS t ON t.oid = x.indrelid
JOIN pg_catalog.pg_class AS i ON i.oid = x.indexrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
WHERE (t.relname ILIKE '%hyper%'
       OR t.relname ILIKE '%checkpoint%'
       OR t.relname ILIKE '%audit%')
ORDER BY n.nspname, t.relname, i.relname;

COMMIT;
