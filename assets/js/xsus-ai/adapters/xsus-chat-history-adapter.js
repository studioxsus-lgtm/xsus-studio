
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
 * - Create temporary RLS test conversations.
 * - Create temporary RLS test messages.
 * - Verify direct RLS read isolation.
 * - Verify unauthorized insert protection.
 *
 * Security:
 * - No service-role keys.
 * - No anonymous persistent history.
 * - User identity comes from Supabase Auth.
 * - Row Level Security must enforce ownership.
 * - No direct dependency on XSUS AI Core.
 * - No direct dependency on Hyper XSUS Core.
 *
 * Temporary test functions must be removed
 * after security verification.
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
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
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
 * The user ID comes from Supabase Auth.
 * RLS must independently enforce ownership.
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

/* ============================================
   TEMPORARY MESSAGE SECURITY TEST
============================================ */

/**
 * Create a harmless test message in a
 * conversation owned by the signed-in user.
 *
 * RLS must enforce both user ownership
 * and conversation ownership.
 */
export async function createMyTestMessage(
  conversationId
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error(
      "Authentication required."
    );
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

  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: "XSUS RLS message security test"
    })
    .select(
      "id, conversation_id, role, created_at"
    )
    .single();

  if (error) {
    throw new Error(
      `Could not create test message: ${error.message}`
    );
  }

  return data;
}

/* ============================================
   TEMPORARY DIRECT RLS READ TEST
============================================ */

/**
 * Verify database-enforced message isolation.
 *
 * Intentionally omits the user_id filter.
 * Supabase RLS must restrict the result.
 *
 * Read-only. Remove after testing.
 */
export async function testDirectMessageRLS(
  conversationId
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error(
      "Authentication required."
    );
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    typeof conversationId !== "string" ||
    !uuidPattern.test(conversationId)
  ) {
    throw new TypeError(
      "Invalid conversation ID."
    );
  }

  const { data, error } = await supabase
    .from("ai_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .limit(10);

  if (error) {
    throw new Error(
      `Direct RLS test failed: ${error.message}`
    );
  }

  return {
    success: true,
    test: "direct_message_rls",
    conversationId,
    visibleMessageCount: data?.length ?? 0
  };
}

/* ============================================
   TEMPORARY UNAUTHORIZED INSERT RLS TEST
============================================ */

/**
 * Attempt to insert a harmless message
 * into another user's conversation.
 *
 * Expected: database rejects the insert.
 *
 * Uses the authenticated user's ID.
 * Does not use service-role credentials.
 *
 * Remove after security verification.
 */
export async function testUnauthorizedMessageInsert(
  conversationId
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error(
      "Authentication required."
    );
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    typeof conversationId !== "string" ||
    !uuidPattern.test(conversationId)
  ) {
    throw new TypeError(
      "Invalid conversation ID."
    );
  }

  const { error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: "XSUS unauthorized RLS insert test"
    });

  if (error) {
    return {
      success: true,
      test: "unauthorized_message_insert",
      conversationId,
      blocked: true,
      databaseErrorCode: error.code ?? null,
      databaseError: error.message
    };
  }

  return {
    success: false,
    test: "unauthorized_message_insert",
    conversationId,
    blocked: false,
    securityWarning:
      "Unauthorized insert was accepted. Review RLS policies immediately."
  };
}
