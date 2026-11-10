-- XSUS AI V3 — Phase 22.16.5.8.11
-- DRAFT migration: database-level uniqueness for client write operation IDs.
-- Not executed by committing this file. Review existing schema, RLS, and
-- deployment migration ordering before applying in Supabase.
--
-- Existing messages remain compatible: operation_id is nullable.
-- PostgreSQL UNIQUE index permits multiple NULL values.
-- This is a uniqueness guard, not a complete retry/read-back protocol.
-- The write adapter must pass operation_id and handle duplicate attempts
-- safely; existing adapter does neither yet.

BEGIN;

ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS operation_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS
  ai_messages_user_conversation_operation_unique
ON public.ai_messages (user_id, conversation_id, operation_id)
WHERE operation_id IS NOT NULL;

COMMENT ON COLUMN public.ai_messages.operation_id IS
  'Stable client-generated UUID for idempotent user-message write attempts. NULL for legacy messages.';

COMMIT;
