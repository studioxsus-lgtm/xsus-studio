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
    -- Verify ordered FK columns from PostgreSQL catalogs, not rendered SQL text.
    EXISTS (
      SELECT 1
      FROM pg_constraint c
      WHERE c.conrelid = 'public.ai_messages'::regclass
        AND c.confrelid = 'public.ai_conversations'::regclass
        AND c.contype = 'f'
        AND (SELECT array_agg(a.attname ORDER BY k.ordinality)
             FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality)
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum)
            = ARRAY['conversation_id', 'user_id']::name[]
        AND (SELECT array_agg(a.attname ORDER BY k.ordinality)
             FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ordinality)
             JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum)
            = ARRAY['id', 'user_id']::name[]
    ) AS composite_owner_fk,
    -- Only a valid, immediate unique index with exactly these keys qualifies.
    EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND t.relname = 'ai_messages'
        AND i.indisunique AND i.indisvalid AND i.indimmediate
        AND i.indnkeyatts = 3
        AND (SELECT array_agg(a.attname ORDER BY k.ordinality)
             FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ordinality)
             JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
             WHERE k.ordinality <= i.indnkeyatts)
            = ARRAY['user_id', 'conversation_id', 'operation_id']::name[]
        AND (i.indpred IS NULL OR pg_get_expr(i.indpred, i.indrelid) ~*
             'operation_id[[:space:]]+IS[[:space:]]+NOT[[:space:]]+NULL')
    ) AS operation_unique,
    -- Accept PostgreSQL rendering of (SELECT auth.uid() AS uid) and role casts.
    EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ai_messages'
        AND cmd = 'INSERT'
        AND 'authenticated' = ANY(roles)
        AND position('auth.uid()' in regexp_replace(with_check, '[[:space:]]+', '', 'g')) > 0
        AND with_check ~* 'role[[:space:]]*=[[:space:]]*''user'''
        AND with_check ~* 'user_id'
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
