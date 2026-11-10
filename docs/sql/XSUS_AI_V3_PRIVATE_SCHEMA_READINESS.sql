-- XSUS AI V3 / Phase 34 — READ-ONLY schema readiness audit.
-- Run manually in Supabase SQL Editor with a trusted administrator session.
-- Does not INSERT, UPDATE, DELETE, CREATE, ALTER or grant permissions.
-- Inspect results before enabling private reply writes.

-- 1. Tables and row-level security switches.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('ai_conversations', 'ai_messages')
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- 2. Columns required by private-chat authorization and assistant writer.
SELECT table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('ai_conversations', 'ai_messages')
  AND column_name IN ('id', 'user_id', 'conversation_id', 'operation_id',
                      'role', 'content', 'created_at')
ORDER BY table_name, ordinal_position;

-- 3. Constraints: primary, foreign, unique, and check constraints.
SELECT t.relname AS table_name, con.conname AS constraint_name,
       con.contype AS constraint_type, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class t ON t.oid = con.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN ('ai_conversations', 'ai_messages')
ORDER BY table_name, constraint_name;

-- 4. Unique indexes used for idempotency (including partial indexes).
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('ai_conversations', 'ai_messages')
ORDER BY tablename, indexname;

-- 5. RLS policies and their expressions. Check user role is restricted to
-- authenticated clients; browser clients must never be allowed to insert
-- assistant-role messages.
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ai_conversations', 'ai_messages')
ORDER BY tablename, cmd, policyname;

-- 6. Table privileges (not a substitute for RLS or ownership checks).
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('ai_conversations', 'ai_messages')
ORDER BY table_name, grantee, privilege_type;

-- REVIEW CHECKLIST (manual):
-- [ ] Both tables exist and have RLS enabled.
-- [ ] ai_messages has UUID user_id/conversation_id/operation_id and
--     nonempty role/content constraints consistent with the writer.
-- [ ] A unique constraint/index prevents duplicate assistant operations.
-- [ ] A composite FK or equivalent DB constraint prevents user_id from
--     referring to a conversation owned by another user.
-- [ ] Authenticated browser INSERT permits only role='user'.
-- [ ] SELECT policies restrict rows to auth.uid().
-- [ ] Service-role credential remains server-only.
-- [ ] Actual live persistence and UI Refresh are STILL UNVERIFIED.
