-- XSUS AI V3 — production-readiness database security gate.
-- READ ONLY: no user data or secrets are selected.
-- Run in Supabase SQL Editor. PASS is required for every row.
-- This does NOT replace live two-account authorization tests.
WITH checks AS (
  SELECT
    EXISTS (
      SELECT 1 FROM pg_class
      WHERE oid = 'public.ai_messages'::regclass
        AND relrowsecurity AND relforcerowsecurity
    ) AS messages_rls,
    EXISTS (
      SELECT 1 FROM pg_class
      WHERE oid = 'public.ai_conversations'::regclass
        AND relrowsecurity AND relforcerowsecurity
    ) AS conversations_rls,
    EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.ai_messages'::regclass
        AND contype = 'f'
        AND pg_get_constraintdef(oid) ~* 'FOREIGN KEY \\(conversation_id, user_id\\)'
        AND pg_get_constraintdef(oid) ~* 'REFERENCES .*ai_conversations.*\\(id, user_id\\)'
    ) AS composite_owner_fk,
    EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'ai_messages'
        AND indexdef ~* 'CREATE UNIQUE INDEX'
        AND indexdef ~* '\\(user_id, conversation_id, operation_id\\)'
    ) AS operation_unique,
    EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ai_messages'
        AND cmd = 'INSERT'
        AND 'authenticated' = ANY(roles)
        AND with_check ~* 'auth\\.uid\\(\\)'
        AND with_check ~* 'role'
        AND with_check ~* '''user'''
    ) AS user_only_insert_policy,
    NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ai_messages'
        AND cmd = 'INSERT'
        AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
    ) AS no_public_message_insert_policy
)
SELECT requirement, CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status
FROM checks
CROSS JOIN LATERAL (
  VALUES
    ('messages_rls_forced', messages_rls),
    ('conversations_rls_forced', conversations_rls),
    ('composite_conversation_owner_fk', composite_owner_fk),
    ('unique_user_conversation_operation', operation_unique),
    ('authenticated_user_only_insert', user_only_insert_policy),
    ('no_anon_or_public_insert_policy', no_public_message_insert_policy)
) AS gate(requirement, passed)
ORDER BY requirement;
