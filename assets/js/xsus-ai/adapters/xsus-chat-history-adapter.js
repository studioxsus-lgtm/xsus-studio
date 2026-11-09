
/**
 * XSUS AI — Private Chat History Adapter
 * Version: 1.0.0
 *
 * Read-only integration with Supabase.
 * Every query runs under the current user's session.
 *
 * No service-role keys.
 * No anonymous persistent history.
 * No direct dependency on XSUS AI Core.
 */

import {
  supabase
} from "../../../../services/supabase-client.js";

export const CHAT_HISTORY_ADAPTER_VERSION = "1.0.0";

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

export async function loadMyConversations() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, created_at, updated_at")
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

export async function loadMyMessages(
  conversationId
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return [];
  }

  if (
    typeof conversationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId)
  ) {
    throw new TypeError(
      "Invalid conversation ID."
    );
  }

  const { data, error } = await supabase
    .from("ai_messages")
    .select(
      "id, conversation_id, role, content, created_at"
    )
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
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
