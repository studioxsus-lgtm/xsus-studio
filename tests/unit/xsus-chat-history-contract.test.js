
/**
 * XSUS AI — Private Chat History Contract Tests
 * Phase: 22.16.2
 *
 * Tests:
 * - Public contract
 * - UUID validation
 * - Conversation validation
 * - Message validation
 * - Collection boundaries
 * - Immutability
 * - Standardized errors
 *
 * No Supabase connection required.
 */

import {
  describe,
  expect,
  test
} from "vitest";

import {
  CHAT_HISTORY_CONTRACT_VERSION,
  CHAT_HISTORY_LIMITS,
  CHAT_HISTORY_ROLES,
  CHAT_HISTORY_ERROR_CODES,
  XSUS_CHAT_HISTORY_CONTRACT,
  isValidConversationId,
  validateConversationId,
  normalizeConversation,
  isValidConversation,
  normalizeMessage,
  isValidMessage,
  normalizeConversations,
  normalizeMessages,
  createHistoryError
} from "../../assets/js/xsus-ai/contracts/xsus-chat-history-contract.js";

/* ============================================
   TEST FIXTURES
============================================ */

const CONVERSATION_ID =
  "29fa4033-8f78-4123-8379-112cf1ed250e";

const MESSAGE_ID =
  "123e4567-e89b-42d3-a456-426614174000";

const OTHER_CONVERSATION_ID =
  "123e4567-e89b-42d3-a456-426614174001";

const TIMESTAMP =
  "2026-11-09T12:00:00.000Z";

function makeConversation(overrides = {}) {
  return {
    id: CONVERSATION_ID,
    title: "XSUS Test Conversation",
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
    ...overrides
  };
}

function makeMessage(overrides = {}) {
  return {
    id: MESSAGE_ID,
    conversation_id: CONVERSATION_ID,
    role: "user",
    content: "XSUS test message",
    created_at: TIMESTAMP,
    ...overrides
  };
}

/* ============================================
   PUBLIC CONTRACT
============================================ */

describe("XSUS Chat History — Public Contract", () => {
  test("exposes version 1.0.0", () => {
    expect(
      CHAT_HISTORY_CONTRACT_VERSION
    ).toBe("1.0.0");
  });

  test("exposes consistent contract metadata", () => {
    expect(
      XSUS_CHAT_HISTORY_CONTRACT.version
    ).toBe(CHAT_HISTORY_CONTRACT_VERSION);

    expect(
      XSUS_CHAT_HISTORY_CONTRACT.limits
    ).toBe(CHAT_HISTORY_LIMITS);

    expect(
      XSUS_CHAT_HISTORY_CONTRACT.roles
    ).toBe(CHAT_HISTORY_ROLES);
  });

  test("defines user and assistant roles", () => {
    expect(CHAT_HISTORY_ROLES).toEqual([
      "user",
      "assistant"
    ]);
  });

  test("defines history limits", () => {
    expect(
      CHAT_HISTORY_LIMITS.MAX_CONVERSATIONS
    ).toBe(100);

    expect(
      CHAT_HISTORY_LIMITS.MAX_MESSAGES
    ).toBe(200);
  });
});

/* ============================================
   UUID VALIDATION
============================================ */

describe("XSUS Chat History — UUID Validation", () => {
  test("accepts valid UUID", () => {
    expect(
      isValidConversationId(CONVERSATION_ID)
    ).toBe(true);
  });

  test("rejects invalid UUID", () => {
    expect(
      isValidConversationId("invalid-id")
    ).toBe(false);
  });

  test("rejects non-string UUID", () => {
    expect(
      isValidConversationId(null)
    ).toBe(false);

    expect(
      isValidConversationId(123)
    ).toBe(false);
  });

  test("throws for invalid UUID", () => {
    expect(() =>
      validateConversationId("invalid")
    ).toThrow(TypeError);
  });

  test("returns valid UUID unchanged", () => {
    expect(
      validateConversationId(CONVERSATION_ID)
    ).toBe(CONVERSATION_ID);
  });
});

/* ============================================
   CONVERSATION VALIDATION
============================================ */

describe("XSUS Chat History — Conversations", () => {
  test("normalizes valid conversation", () => {
    const result = normalizeConversation(
      makeConversation()
    );

    expect(result.id).toBe(CONVERSATION_ID);
    expect(result.title).toBe(
      "XSUS Test Conversation"
    );

    expect(result.createdAt).toBe(TIMESTAMP);
    expect(result.updatedAt).toBe(TIMESTAMP);
  });

  test("trims conversation title", () => {
    const result = normalizeConversation(
      makeConversation({
        title: "  XSUS AI  "
      })
    );

    expect(result.title).toBe("XSUS AI");
  });

  test("rejects empty title", () => {
    expect(() =>
      normalizeConversation(
        makeConversation({
          title: "   "
        })
      )
    ).toThrow(TypeError);
  });

  test("rejects oversized title", () => {
    expect(() =>
      normalizeConversation(
        makeConversation({
          title: "X".repeat(
            CHAT_HISTORY_LIMITS.MAX_TITLE_LENGTH + 1
          )
        })
      )
    ).toThrow(TypeError);
  });

  test("rejects invalid timestamps", () => {
    expect(() =>
      normalizeConversation(
        makeConversation({
          created_at: "invalid-date"
        })
      )
    ).toThrow(TypeError);
  });

  test("rejects invalid conversation object", () => {
    expect(
      isValidConversation(null)
    ).toBe(false);

    expect(
      isValidConversation(makeConversation())
    ).toBe(true);
  });
});

/* ============================================
   MESSAGE VALIDATION
============================================ */

describe("XSUS Chat History — Messages", () => {
  test("normalizes valid user message", () => {
    const result = normalizeMessage(
      makeMessage()
    );

    expect(result.id).toBe(MESSAGE_ID);
    expect(result.conversationId).toBe(
      CONVERSATION_ID
    );
    expect(result.role).toBe("user");
    expect(result.content).toBe(
      "XSUS test message"
    );
  });

  test("accepts assistant role", () => {
    const result = normalizeMessage(
      makeMessage({
        role: "assistant"
      })
    );

    expect(result.role).toBe("assistant");
  });

  test("rejects invalid role", () => {
    expect(() =>
      normalizeMessage(
        makeMessage({
          role: "admin"
        })
      )
    ).toThrow(TypeError);
  });

  test("rejects empty message", () => {
    expect(() =>
      normalizeMessage(
        makeMessage({
          content: "   "
        })
      )
    ).toThrow(TypeError);
  });

  test("rejects oversized content", () => {
    expect(() =>
      normalizeMessage(
        makeMessage({
          content: "X".repeat(
            CHAT_HISTORY_LIMITS.MAX_CONTENT_LENGTH + 1
          )
        })
      )
    ).toThrow(TypeError);
  });

  test("rejects invalid message object", () => {
    expect(
      isValidMessage(null)
    ).toBe(false);

    expect(
      isValidMessage(makeMessage())
    ).toBe(true);
  });
});

/* ============================================
   COLLECTION VALIDATION
============================================ */

describe("XSUS Chat History — Collections", () => {
  test("normalizes conversation array", () => {
    const result = normalizeConversations([
      makeConversation()
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(CONVERSATION_ID);
  });

  test("rejects invalid conversation collection", () => {
    expect(() =>
      normalizeConversations(null)
    ).toThrow(TypeError);
  });

  test("rejects excessive conversations", () => {
    const records = Array.from(
      {
        length:
          CHAT_HISTORY_LIMITS.MAX_CONVERSATIONS + 1
      },
      () => makeConversation()
    );

    expect(() =>
      normalizeConversations(records)
    ).toThrow(RangeError);
  });

  test("normalizes messages for conversation", () => {
    const result = normalizeMessages(
      [makeMessage()],
      CONVERSATION_ID
    );

    expect(result).toHaveLength(1);
    expect(result[0].conversationId).toBe(
      CONVERSATION_ID
    );
  });

  test("rejects messages from another conversation", () => {
    expect(() =>
      normalizeMessages(
        [
          makeMessage({
            conversation_id:
              OTHER_CONVERSATION_ID
          })
        ],
        CONVERSATION_ID
      )
    ).toThrow(
      "Message conversation mismatch."
    );
  });

  test("accepts case-insensitive UUID equality", () => {
    const result = normalizeMessages(
      [
        makeMessage({
          conversation_id:
            CONVERSATION_ID.toUpperCase()
        })
      ],
      CONVERSATION_ID
    );

    expect(result).toHaveLength(1);
  });

  test("rejects excessive messages", () => {
    const records = Array.from(
      {
        length:
          CHAT_HISTORY_LIMITS.MAX_MESSAGES + 1
      },
      () => makeMessage()
    );

    expect(() =>
      normalizeMessages(
        records,
        CONVERSATION_ID
      )
    ).toThrow(RangeError);
  });
});

/* ============================================
   IMMUTABILITY
============================================ */

describe("XSUS Chat History — Immutability", () => {
  test("freezes normalized conversation", () => {
    const result = normalizeConversation(
      makeConversation()
    );

    expect(
      Object.isFrozen(result)
    ).toBe(true);
  });

  test("freezes normalized message", () => {
    const result = normalizeMessage(
      makeMessage()
    );

    expect(
      Object.isFrozen(result)
    ).toBe(true);
  });

  test("freezes normalized collections", () => {
    const result = normalizeMessages(
      [makeMessage()],
      CONVERSATION_ID
    );

    expect(
      Object.isFrozen(result)
    ).toBe(true);

    expect(
      Object.isFrozen(result[0])
    ).toBe(true);
  });
});

/* ============================================
   STANDARDIZED ERRORS
============================================ */

describe("XSUS Chat History — Errors", () => {
  test("creates standardized error", () => {
    const result = createHistoryError(
      CHAT_HISTORY_ERROR_CODES.ACCESS_DENIED,
      "Access denied."
    );

    expect(result).toEqual({
      success: false,
      code: "ACCESS_DENIED",
      message: "Access denied."
    });

    expect(
      Object.isFrozen(result)
    ).toBe(true);
  });

  test("rejects unknown error code", () => {
    expect(() =>
      createHistoryError(
        "UNKNOWN_ERROR",
        "Unknown error."
      )
    ).toThrow(TypeError);
  });

  test("rejects empty error message", () => {
    expect(() =>
      createHistoryError(
        CHAT_HISTORY_ERROR_CODES.DATABASE_ERROR,
        " "
      )
    ).toThrow(TypeError);
  });
});
