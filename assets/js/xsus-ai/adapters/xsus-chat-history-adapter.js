
/**
 * XSUS AI — Private Chat History Adapter
 * Version: 1.2.0
 *
 * Phase: 22.16.3
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Verify authenticated Supabase users.
 * - Load private conversations.
 * - Load private conversation messages.
 * - Validate and normalize loaded records.
 * - Create temporary RLS test conversations.
 * - Create temporary RLS test messages.
 * - Verify direct RLS read isolation.
 * - Verify unauthorized insert protection.
 *
 * Security:
 * - No service-role keys.
 * - No anonymous persistent history.
 * - User identity comes from Supabase Auth.
 * - Database RLS must enforce ownership.
 * - No direct dependency on XSUS AI Core.
 * - No direct dependency on Hyper XSUS Core.
 *
 * Temporary test functions are preserved
 * until security verification is complete.
 */

import {
  supabase
} from "../../../../services/supabase-client.js";

import {
  validateConversationId,
  normalizeConversations,
  normalizeMessages
} from "../contracts/xsus-chat-history-contract.js";

export const CHAT_HISTORY_ADAPTER_VERSION = "1.2.0";

/* ============================================
   AUTHENTICATION
============================================ */

/**
 * Returns the authenticated Supabase user,
 * or null when no valid session exists.
 *
 * A local session alone is not considered
 * sufficient proof of authentication.
 *
 * Database RLS must independently verify
 * ownership for every request.
 */
async function getAuthenticatedUser() {
  try {
    const {
      data: sessionData,
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        "XSUS session verification failed:",
        sessionError
      );

      return null;
    }

    if (!sessionData?.session) {
      return null;
    }

    const {
      data,
      error
    } = await supabase.auth.getUser();

    if (error || !data?.user) {
      console.error(
        "XSUS authentication verification failed:",
        error
      );

      return null;
    }

    return data.user;

  } catch (error) {
    console.error(
      "XSUS authentication error:",
      error
    );

    return null;
  }
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
 *
 * Authenticated results are normalized
 * through the shared history contract.
 *
 * RLS must enforce ownership.
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

  return normalizeConversations(data ?? []);
}

/* ============================================
   PRIVATE MESSAGES
============================================ */

/**
 * Load messages from a conversation
 * belonging to the authenticated user.
 *
 * The conversation ID must be a valid UUID.
 *
 * Results are normalized and checked
 * against the requested conversation ID.
 *
 * RLS must independently enforce ownership.
 */
export async function loadMyMessages(
  conversationId
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  validateConversationId(conversationId);

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

  return normalizeMessages(
    data ?? [],
    conversationId
  );
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
 * Remove this function only after
 * security verification is complete.
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
 * RLS and database constraints must
 * enforce ownership.
 *
 * This function performs a real INSERT.
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

  validateConversationId(conversationId);

  const {
    data,
    error
  } = await supabase
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
 * Read-only.
 *
 * Remove only after security verification.
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

  validateConversationId(conversationId);

  const {
    data,
    error
  } = await supabase
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
 * IMPORTANT:
 * This test performs a real INSERT attempt.
 * If the database accepts the insert,
 * a test message will be created.
 *
 * Remove only after security verification.
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

  validateConversationId(conversationId);

  const {
    error
  } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: "XSUS unauthorized RLS insert test"
    });

  if (error) {
    const errorCode =
      error.code ?? null;

    const rlsBlocked =
      errorCode === "42501";

    return {
      success: rlsBlocked,
      test: "unauthorized_message_insert",
      conversationId,
      blocked: true,
      rlsBlocked,
      databaseErrorCode: errorCode,
      databaseError: error.message
    };
  }

  return {
    success: false,
    test: "unauthorized_message_insert",
    conversationId,
    blocked: false,
    rlsBlocked: false,
    securityWarning:
      "Unauthorized insert was accepted. Review RLS policies immediately."
  };
}
