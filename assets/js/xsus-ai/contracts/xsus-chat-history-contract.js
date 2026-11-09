
/**
 * XSUS AI — Private Chat History Contract
 * Version: 1.0.0
 *
 * Phase: 22.16.1
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Define conversation and message contracts.
 * - Validate conversation identifiers.
 * - Validate database conversation records.
 * - Validate database message records.
 * - Normalize private history data.
 * - Provide consistent error codes.
 *
 * Security:
 * - No database access.
 * - No browser storage.
 * - No authentication bypass.
 * - No service-role credentials.
 * - No direct XSUS AI Core dependency.
 * - No Hyper XSUS Core dependency.
 *
 * This module performs validation only.
 * Authorization remains the responsibility
 * of Supabase Auth and database RLS.
 */

export const CHAT_HISTORY_CONTRACT_VERSION = "1.0.0";

/* ============================================
   CONSTANTS
============================================ */

export const CHAT_HISTORY_LIMITS = Object.freeze({
  MAX_CONVERSATIONS: 100,
  MAX_MESSAGES: 200,
  MAX_TITLE_LENGTH: 200,
  MAX_CONTENT_LENGTH: 12000
});

export const CHAT_HISTORY_ROLES = Object.freeze([
  "user",
  "assistant"
]);

export const CHAT_HISTORY_ERROR_CODES = Object.freeze({
  INVALID_CONVERSATION_ID:
    "INVALID_CONVERSATION_ID",

  INVALID_CONVERSATION:
    "INVALID_CONVERSATION",

  INVALID_MESSAGE:
    "INVALID_MESSAGE",

  INVALID_ROLE:
    "INVALID_ROLE",

  INVALID_CONTENT:
    "INVALID_CONTENT",

  AUTHENTICATION_REQUIRED:
    "AUTHENTICATION_REQUIRED",

  ACCESS_DENIED:
    "ACCESS_DENIED",

  DATABASE_ERROR:
    "DATABASE_ERROR",

  INTERNAL_ERROR:
    "INTERNAL_ERROR"
});

/* ============================================
   UUID VALIDATION
============================================ */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidConversationId(value) {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  );
}

export function validateConversationId(value) {
  if (!isValidConversationId(value)) {
    throw new TypeError(
      "Invalid conversation ID."
    );
  }

  return value;
}

/* ============================================
   INTERNAL HELPERS
============================================ */

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isValidTimestamp(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

function requireTimestamp(value, field) {
  if (!isValidTimestamp(value)) {
    throw new TypeError(
      `Invalid ${field}.`
    );
  }

  return value;
}

function requireString(value, field) {
  if (typeof value !== "string") {
    throw new TypeError(
      `Invalid ${field}.`
    );
  }

  return value;
}

/* ============================================
   CONVERSATION CONTRACT
============================================ */

/**
 * Expected database fields:
 *
 * id
 * title
 * created_at
 * updated_at
 *
 * The database and RLS remain responsible
 * for verifying user ownership.
 */

export function normalizeConversation(record) {
  if (!isRecord(record)) {
    throw new TypeError(
      "Invalid conversation."
    );
  }

  const id = validateConversationId(
    record.id
  );

  const title = requireString(
    record.title,
    "conversation title"
  ).trim();

  if (
    title.length === 0 ||
    title.length >
      CHAT_HISTORY_LIMITS.MAX_TITLE_LENGTH
  ) {
    throw new TypeError(
      "Invalid conversation title."
    );
  }

  return Object.freeze({
    id,
    title,

    createdAt: requireTimestamp(
      record.created_at,
      "conversation created_at"
    ),

    updatedAt: requireTimestamp(
      record.updated_at,
      "conversation updated_at"
    )
  });
}

export function isValidConversation(record) {
  try {
    normalizeConversation(record);
    return true;
  } catch {
    return false;
  }
}

/* ============================================
   MESSAGE CONTRACT
============================================ */

/**
 * Expected database fields:
 *
 * id
 * conversation_id
 * role
 * content
 * created_at
 *
 * Both user and assistant roles can be
 * represented by this contract.
 *
 * IMPORTANT:
 * This does not grant INSERT permission
 * for assistant messages.
 *
 * Assistant-message persistence requires
 * an independently authorized server path.
 */

export function normalizeMessage(record) {
  if (!isRecord(record)) {
    throw new TypeError(
      "Invalid message."
    );
  }

  const id = validateConversationId(
    record.id
  );

  const conversationId =
    validateConversationId(
      record.conversation_id
    );

  const role = requireString(
    record.role,
    "message role"
  );

  if (!CHAT_HISTORY_ROLES.includes(role)) {
    throw new TypeError(
      "Invalid message role."
    );
  }

  const content = requireString(
    record.content,
    "message content"
  );

  if (
    content.trim().length === 0 ||
    content.length >
      CHAT_HISTORY_LIMITS.MAX_CONTENT_LENGTH
  ) {
    throw new TypeError(
      "Invalid message content."
    );
  }

  return Object.freeze({
    id,
    conversationId,
    role,
    content,

    createdAt: requireTimestamp(
      record.created_at,
      "message created_at"
    )
  });
}

export function isValidMessage(record) {
  try {
    normalizeMessage(record);
    return true;
  } catch {
    return false;
  }
}

/* ============================================
   COLLECTION NORMALIZATION
============================================ */

export function normalizeConversations(records) {
  if (!Array.isArray(records)) {
    throw new TypeError(
      "Conversations must be an array."
    );
  }

  if (
    records.length >
    CHAT_HISTORY_LIMITS.MAX_CONVERSATIONS
  ) {
    throw new RangeError(
      "Conversation limit exceeded."
    );
  }

  return Object.freeze(
    records.map(normalizeConversation)
  );
}

export function normalizeMessages(
  records,
  conversationId
) {
  validateConversationId(conversationId);

  if (!Array.isArray(records)) {
    throw new TypeError(
      "Messages must be an array."
    );
  }

  if (
    records.length >
    CHAT_HISTORY_LIMITS.MAX_MESSAGES
  ) {
    throw new RangeError(
      "Message limit exceeded."
    );
  }

  const messages = records.map(
    normalizeMessage
  );

  for (const message of messages) {
    if (
      message.conversationId !==
      conversationId
    ) {
      throw new TypeError(
        "Message conversation mismatch."
      );
    }
  }

  return Object.freeze(messages);
}

/* ============================================
   STANDARDIZED ERRORS
============================================ */

export function createHistoryError(
  code,
  message
) {
  if (
    !Object.values(
      CHAT_HISTORY_ERROR_CODES
    ).includes(code)
  ) {
    throw new TypeError(
      "Invalid history error code."
    );
  }

  if (
    typeof message !== "string" ||
    !message.trim()
  ) {
    throw new TypeError(
      "Invalid history error message."
    );
  }

  return Object.freeze({
    success: false,
    code,
    message
  });
}

/* ============================================
   PUBLIC CONTRACT
============================================ */

export const XSUS_CHAT_HISTORY_CONTRACT =
  Object.freeze({
    version:
      CHAT_HISTORY_CONTRACT_VERSION,

    limits:
      CHAT_HISTORY_LIMITS,

    roles:
      CHAT_HISTORY_ROLES,

    errorCodes:
      CHAT_HISTORY_ERROR_CODES
  });
