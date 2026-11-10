-- XSUS AI V3 — private assistant persistence security audit
-- READ ONLY. Execute in Supabase SQL Editor as a privileged administrator.
-- These metadata checks are NOT an authenticated RLS integration test.
-- Do not paste returned secrets, tokens, or private message contents.
--
-- 1. Exact columns/types/defaults
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ai_messages'
  AND column_name IN ('id','user_id','conversation_id','operation_id','role','content')
ORDER BY ordinal_position;

-- 2. Constraints including ownership linkage and allowed roles
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.ai_messages'::regclass
ORDER BY conname;

-- 3. Message uniqueness (must include user, conversation, operation)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'ai_messages'
ORDER BY indexname;

-- 4. RLS configuration for both tables
SELECT relname, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE oid IN ('public.ai_messages'::regclass, 'public.ai_conversations'::regclass);

-- 5. Roles and policy conditions
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('ai_messages', 'ai_conversations')
ORDER BY tablename, policyname;

-- 6. Check for unintended table-level grants to anon/authenticated.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('ai_messages','ai_conversations')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee, privilege_type;

-- 7. Verify message/conversation ownership relationship.
-- A simple FK(conversation_id)->ai_conversations(id) alone does NOT
-- enforce matching user_id. Check composite FK or DB trigger/guard.
SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid = 'public.ai_messages'::regclass
  AND c.contype = 'f';

-- SECURITY GATE:
-- Do not enable XSUS_PRIVATE_REPLY_WRITES_ENABLED until:
-- (a) owner linkage is enforced at write time, including privileged writes;
-- (b) assistant role cannot be inserted by browser clients;
-- (c) authenticated two-account RLS tests pass;
-- (d) concurrent retry behavior and answer consistency are verified.
