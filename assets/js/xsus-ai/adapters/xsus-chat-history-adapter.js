
/**
 * XSUS AI — Private Chat History Adapter
 * Version: 1.1.0
 *
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Verify authenticated Supabase users.
 * - Load private conversations.
 * - Load private conversation messages.
 * - Create a temporary RLS test conversation.
 *
 * Security:
 * - No service-role keys.
 * - No anonymous persistent history.
 * - User identity comes from Supabase Auth.
 * - Row Level Security enforces ownership.
 * - No direct dependency on XSUS AI Core.
 * - No direct dependency on Hyper XSUS Core.
 *
 * The test creation function is temporary.
 */

import {
  supabase
} from "../../../../services/supabase-client.js";

export const CHAT_HISTORY_ADAPTER_VERSION = "1.1.0";

/* ============================================
   AUTHENTICATION
============================================ */

/**
 * Returns the authenticated Supabase user,
 * or null when no valid session exists.
 */
async function getAuthenticatedUser() {
  const {
    data,
    error
  } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

/* ============================================
   PRIVATE CONVERSATIONS
============================================ */

/**
 * Load conversations belonging to
 * the currently authenticated user.
 *
 * Returns an empty array when the
 * user is not authenticated.
 */
export async function loadMyConversations() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const {
    data,
    error
  } = await supabase
    .from("ai_conversations")
    .select(
      "id, title, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("updated_at", {
      ascending: false
    })
    .limit(100);

  if (error) {
    throw new Error(
      "Could not load private conversations."
    );
  }

  return data ?? [];
}

/* ============================================
   PRIVATE MESSAGES
============================================ */

/**
 * Load messages from a conversation
 * belonging to the authenticated user.
 *
 * The conversation ID must be a valid UUID.
 */
export async function loadMyMessages(
  conversationId
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  if (
    typeof conversationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      conversationId
    )
  ) {
    throw new TypeError(
      "Invalid conversation ID."
    );
  }

  const {
    data,
    error
  } = await supabase
    .from("ai_messages")
    .select(
      "id, conversation_id, role, content, created_at"
    )
    .eq("user_id", user.id)
    .eq(
      "conversation_id",
      conversationId
    )
    .order("created_at", {
      ascending: true
    })
    .limit(200);

  if (error) {
    throw new Error(
      "Could not load private messages."
    );
  }

  return data ?? [];
}

/* ============================================
   TEMPORARY RLS SECURITY TEST
============================================ */

/**
 * Create a private test conversation.
 *
 * This function is used only for
 * verifying Supabase Row Level Security
 * with two authenticated accounts.
 *
 * The user ID is obtained from
 * Supabase Auth, not from user input.
 *
 * RLS must independently enforce
 * that the authenticated user can
 * insert only their own conversations.
 *
 * Remove this function after testing.
 */
export async function createMyTestConversation() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error(
      "Authentication required."
    );
  }

  const {
    data,
    error
  } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: user.id,
      title: "XSUS RLS Security Test"
    })
    .select(
      "id, title, created_at"
    )
    .single();

  if (error) {
    throw new Error(
      `Could not create test conversation: ${error.message}`
    );
  }

  return data;
}
