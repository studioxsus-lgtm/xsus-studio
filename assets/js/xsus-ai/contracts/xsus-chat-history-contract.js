
/**
 * XSUS AI — Private Chat History Contract
 * Version: 1.0.1
 *
 * Phase: 22.16.2
 * Brand: THE X IDENTITY
 *
 * Responsibilities:
 * - Define conversation and message contracts.
 * - Validate conversation identifiers.
 * - Validate database conversation records.
 * - Validate database message records.
 * - Normalize private history data.
 * - Validate collection boundaries.
 * - Provide consistent error codes.
 * - Preserve immutable normalized results.
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
 *
 * Authorization remains the responsibility
 * of Supabase Auth and database RLS.
 *
 * IMPORTANT:
 * Validation does not grant database
 * permissions or establish ownership.
 */

export const CHAT_HISTORY_CONTRACT_VERSION = "1.0.1";

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

/**
 * Accepts standard UUID versions 1–8.
 *
 * UUID comparisons are case-insensitive.
 *
 * UUID validation does not prove
 * database record ownership.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns true for a valid UUID.
 */
export function isValidConversationId(value) {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  );
}

/**
 * Validates and returns the original UUID.
 *
 * Preserving the original representation
 * maintains compatibility with callers.
 */
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

/**
 * Returns true only for non-null,
 * non-array objects.
 */
function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

/**
 * Validate a timestamp string.
 *
 * Accepts ISO 8601 timestamps with
 * an explicit timezone (Z or offset).
 *
 * Also rejects impossible calendar dates
 * when expressed as YYYY-MM-DD.
 */
function isValidTimestamp(value) {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return false;
  }

  const timestamp = value.trim();

  const ISO_TIMESTAMP_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i;

  if (!ISO_TIMESTAMP_PATTERN.test(timestamp)) {
    return false;
  }

  const parsed = Date.parse(timestamp);

  if (!Number.isFinite(parsed)) {
    return false;
  }

  const match = timestamp.match(
    /^(\d{4})-(\d{2})-(\d{2})T/
  );

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  const daysInMonth = new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();

  if (day > daysInMonth) {
    return false;
  }

  const timeMatch = timestamp.match(
    /T(\d{2}):(\d{2}):(\d{2})/
  );

  if (!timeMatch) {
    return false;
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3]);

  if (
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false;
  }

  const offsetMatch = timestamp.match(
    /([+-])(\d{2}):(\d{2})$/
  );

  if (offsetMatch) {
    const offsetHours = Number(offsetMatch[2]);
    const offsetMinutes = Number(offsetMatch[3]);

    if (
      offsetHours > 23 ||
      offsetMinutes > 59
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Require a valid timestamp.
 */
function requireTimestamp(value, field) {
  if (!isValidTimestamp(value)) {
    throw new TypeError(
      `Invalid ${field}.`
    );
  }

  return value;
}

/**
 * Require a string.
 */
function requireString(value, field) {
  if (typeof value !== "string") {
    throw new TypeError(
      `Invalid ${field}.`
    );
  }

  return value;
}

/**
 * Compare two valid UUIDs.
 *
 * UUIDs are case-insensitive.
 */
function areSameUUID(first, second) {
  return (
    first.toLowerCase() ===
    second.toLowerCase()
  );
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

/**
 * Normalize a single conversation.
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

  const createdAt = requireTimestamp(
    record.created_at,
    "conversation created_at"
  );

  const updatedAt = requireTimestamp(
    record.updated_at,
    "conversation updated_at"
  );

  return Object.freeze({
    id,
    title,
    createdAt,
    updatedAt
  });
}

/**
 * Check whether a conversation record
 * satisfies the public contract.
 */
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

/**
 * Normalize a single message.
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

  const createdAt = requireTimestamp(
    record.created_at,
    "message created_at"
  );

  return Object.freeze({
    id,
    conversationId,
    role,
    content,
    createdAt
  });
}

/**
 * Check whether a message record
 * satisfies the public contract.
 */
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

/**
 * Normalize a collection of conversations.
 *
 * Maximum: 100 conversations.
 *
 * The returned array and its records
 * are immutable.
 */
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

/**
 * Normalize messages belonging to
 * one specific conversation.
 *
 * Maximum: 200 messages.
 *
 * Rejects records belonging to
 * another conversation.
 *
 * UUID equality is case-insensitive.
 */
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
      !areSameUUID(
        message.conversationId,
        conversationId
      )
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

/**
 * Create a standardized immutable
 * history error object.
 */
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

/**
 * Shared metadata for the
 * XSUS AI private history contract.
 *
 * This object does not expose
 * authentication or database access.
 */
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
