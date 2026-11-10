/**
 * XSUS AI V3 — Supabase Idempotent Write Bridge
 * Phase 22.16.5.8.11.2 — opt-in only; no production activation.
 * Requires migration 20261110_xsus_ai_message_operation_id.sql and RLS.
 * No service-role credentials. Existing saveMyUserMessage API is untouched.
 */
import { createIdempotentMessageWriteAdapter } from "./xsus-idempotent-message-write-adapter.js";
import { normalizeMessage } from "../contracts/xsus-chat-history-contract.js";

export const SUPABASE_IDEMPOTENT_WRITE_VERSION = "1.0.0";
const FIELDS = "id, user_id, conversation_id, operation_id, role, content, created_at";

export function createSupabaseIdempotentWriteAdapter({ supabase } = {}) {
  if (!supabase || typeof supabase.from !== "function" ||
      typeof supabase.auth?.getSession !== "function" ||
      typeof supabase.auth?.getUser !== "function") {
    throw new TypeError("A Supabase client with authentication is required.");
  }

  async function getUserId() {
    const session = await supabase.auth.getSession();
    if (session.error || !session.data?.session) {
      throw new Error("Authentication required.");
    }
    const user = await supabase.auth.getUser();
    if (user.error || !user.data?.user?.id) {
      throw new Error("Authentication required.");
    }
    return user.data.user.id;
  }

  async function findMessage({ userId, conversationId, operationId }) {
    const { data, error } = await supabase.from("ai_messages")
      .select(FIELDS)
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .eq("operation_id", operationId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function insertMessage({ userId, conversationId, operationId, content }) {
    const { data, error } = await supabase.from("ai_messages")
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        operation_id: operationId,
        role: "user",
        content
      })
      .select(FIELDS)
      .single();
    if (error) throw error;
    if (!data) throw new Error("Message creation returned no data.");
    return data;
  }

  const core = createIdempotentMessageWriteAdapter({
    getUserId, findMessage, insertMessage
  });

  return Object.freeze({
    async save(request) {
      const record = await core.save(request);
      return normalizeMessage(record);
    }
  });
}
