
/**
 * XSUS AI V3 — Private History Write Adapter
 * Version: 1.0.0
 * Phase: 22.16.5.8
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Create private conversations.
 * - Save authenticated user messages.
 * - Validate inputs and returned records.
 * - Preserve Supabase Auth and RLS boundaries.
 *
 * Security:
 * - No service-role key.
 * - No anonymous writes.
 * - No client-side assistant-message writes.
 * - No direct AI Core dependency.
 * - No browser persistence.
 *
 * Database RLS must independently enforce
 * ownership and permitted message roles.
 */

import {
  supabase
} from "../../../../services/supabase-client.js";

import {
  CHAT_HISTORY_LIMITS,
  validateConversationId,
  normalizeConversation,
  normalizeMessage
} from "../contracts/xsus-chat-history-contract.js";

export const CHAT_HISTORY_WRITE_VERSION =
  "1.0.0";

/* ============================================
   INPUT VALIDATION
============================================ */

function validateTitle(value) {
  if (typeof value !== "string") {
    throw new TypeError(
      "Invalid conversation title."
    );
  }

  const title = value.trim();

  if (
    !title ||
    title.length >
      CHAT_HISTORY_LIMITS.MAX_TITLE_LENGTH
  ) {
    throw new TypeError(
      "Invalid conversation title."
    );
  }

  return title;
}

function validateContent(value) {
  if (typeof value !== "string") {
    throw new TypeError(
      "Invalid message content."
    );
  }

  if (
    !value.trim() ||
    value.length >
      CHAT_HISTORY_LIMITS.MAX_CONTENT_LENGTH
  ) {
    throw new TypeError(
      "Invalid message content."
    );
  }

  return value;
}

/* ============================================
   AUTHENTICATION
============================================ */

async function requireAuthenticatedUser() {
  const {
    data: sessionData,
    error: sessionError
  } = await supabase.auth.getSession();

  if (
    sessionError ||
    !sessionData?.session
  ) {
    throw new Error(
      "Authentication required."
    );
  }

  const {
    data,
    error
  } = await supabase.auth.getUser();

  if (
    error ||
    !data?.user?.id
  ) {
    throw new Error(
      "Authentication required."
    );
  }

  return data.user.id;
}

/* ============================================
   DATABASE ERROR
============================================ */

function databaseError(
  operation,
  error
) {
  const result = new Error(
    `Private history ${operation} failed.`
  );

  result.code =
    typeof error?.code === "string"
      ? error.code
      : "DATABASE_ERROR";

  return result;
}

/* ============================================
   CREATE CONVERSATION
============================================ */

/**
 * Creates a private conversation.
 *
 * The user_id is taken exclusively
 * from verified Supabase authentication.
 *
 * Returns a normalized conversation.
 */

export async function createMyConversation({
  title = "New conversation"
} = {}) {
  const normalizedTitle =
    validateTitle(title);

  const userId =
    await requireAuthenticatedUser();

  const {
    data,
    error
  } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      title: normalizedTitle
    })
    .select(
      "id, title, created_at, updated_at"
    )
    .single();

  if (error) {
    throw databaseError(
      "conversation creation",
      error
    );
  }

  if (!data) {
    throw new Error(
      "Conversation creation returned no data."
    );
  }

  /*
   * Recheck identity before returning
   * a private record to the caller.
   *
   * This does not replace RLS.
   */
  const verifiedUserId =
    await requireAuthenticatedUser();

  if (verifiedUserId !== userId) {
    throw new Error(
      "Authentication changed during conversation creation."
    );
  }

  return normalizeConversation(data);
}

/* ============================================
   SAVE USER MESSAGE
============================================ */

/**
 * Saves one user-authored message.
 *
 * This function deliberately does not
 * accept an arbitrary role.
 *
 * Assistant messages require a separately
 * authorized server-side persistence path.
 *
 * RLS must reject inserts into conversations
 * not owned by the authenticated user.
 */

export async function saveMyUserMessage({
  conversationId,
  content
} = {}) {
  const normalizedConversationId =
    validateConversationId(
      conversationId
    );

  const normalizedContent =
    validateContent(content);

  const userId =
    await requireAuthenticatedUser();

  const {
    data,
    error
  } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id:
        normalizedConversationId,

      user_id: userId,

      role: "user",

      content: normalizedContent
    })
    .select(
      "id, conversation_id, role, content, created_at"
    )
    .single();

  if (error) {
    throw databaseError(
      "message creation",
      error
    );
  }

  if (!data) {
    throw new Error(
      "Message creation returned no data."
    );
  }

  const verifiedUserId =
    await requireAuthenticatedUser();

  if (verifiedUserId !== userId) {
    throw new Error(
      "Authentication changed during message creation."
    );
  }

  const normalizedMessage =
    normalizeMessage(data);

  if (
    normalizedMessage.conversationId
      .toLowerCase() !==
    normalizedConversationId
      .toLowerCase()
  ) {
    throw new Error(
      "Saved message conversation mismatch."
    );
  }

  if (
    normalizedMessage.role !== "user" ||
    normalizedMessage.content !==
      normalizedContent
  ) {
    throw new Error(
      "Saved message verification failed."
    );
  }

  return normalizedMessage;
}

/* ============================================
   PUBLIC CAPABILITIES
============================================ */

export const CHAT_HISTORY_WRITE_CAPABILITIES =
  Object.freeze({
    version: CHAT_HISTORY_WRITE_VERSION,

    createConversation: true,

    saveUserMessage: true,

    saveAssistantMessage: false,

    anonymousWrites: false,

    requiresAuthentication: true,

    requiresRLS: true
  });
