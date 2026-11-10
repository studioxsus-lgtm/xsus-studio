-- XSUS AI V3 — Phase 22.16.5.8.11.3
-- READ-ONLY PREFLIGHT: run manually in Supabase SQL Editor with authorized access.
-- Does not change schema, policies, or user data.
-- SQL Editor may run with elevated privileges: do not interpret these
-- metadata checks as proof that an authenticated user is RLS-isolated.
-- Only proceed to controlled role-based integration tests after review.

-- 1. Table and operation_id column existence/type/nullability
SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'ai_messages'
  AND c.column_name IN ('id', 'user_id', 'conversation_id', 'operation_id', 'role', 'content')
ORDER BY c.ordinal_position;

-- 2. Index definition (must be UNIQUE on user_id, conversation_id, operation_id
--    and partial WHERE operation_id IS NOT NULL)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'ai_messages'
ORDER BY indexname;

-- 3. RLS enabled and forced flags
SELECT n.nspname AS schema_name, t.relname AS table_name,
       t.relrowsecurity AS rls_enabled, t.relforcerowsecurity AS rls_forced
FROM pg_class AS t
JOIN pg_namespace AS n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('ai_messages', 'ai_conversations')
  AND t.relkind IN ('r', 'p')
ORDER BY t.relname;

-- 4. RLS policies (review SELECT and INSERT rules and WITH CHECK clauses)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ai_messages', 'ai_conversations')
ORDER BY tablename, policyname;

-- 5. Foreign keys and check constraints affecting private messages
SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint AS c
JOIN pg_class AS t ON t.oid = c.conrelid
JOIN pg_namespace AS n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'ai_messages'
ORDER BY c.conname;

-- No INSERT, UPDATE, DELETE, DDL, or privileged role switching.
