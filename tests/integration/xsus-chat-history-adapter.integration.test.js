
/**
 * XSUS AI — Private Chat History Adapter
 * Integration Tests
 *
 * Phase: 22.16.4
 * Adapter: 1.2.0
 * Contract: 1.0.1
 *
 * Uses mocked Supabase.
 * Does not access a real database.
 * Does not modify RLS policies.
 */

import {
  beforeEach,
  describe,
  expect,
  test,
  vi
} from "vitest";

/* ============================================
   MOCK STATE
============================================ */

const mock = vi.hoisted(() => ({
  session: {
    data: {
      session: {
        access_token: "test-token"
      }
    },
    error: null
  },

  user: {
    data: {
      user: {
        id: "123e4567-e89b-42d3-a456-426614174099"
      }
    },
    error: null
  },

  response: {
    data: [],
    error: null
  },

  calls: [],
  getSession: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn()
}));

/* ============================================
   SUPABASE MOCK
============================================ */

vi.mock(
  "../../services/supabase-client.js",
  () => ({
    supabase: {
      auth: {
        getSession: mock.getSession,
        getUser: mock.getUser
      },

      from: mock.from
    }
  })
);

/* ============================================
   ADAPTER IMPORT
============================================ */

import {
  CHAT_HISTORY_ADAPTER_VERSION,
  loadMyConversations,
  loadMyMessages,
  createMyTestConversation,
  createMyTestMessage,
  testDirectMessageRLS,
  testUnauthorizedMessageInsert
} from "../../assets/js/xsus-ai/adapters/xsus-chat-history-adapter.js";

/* ============================================
   FIXTURES
============================================ */

const USER_ID =
  "123e4567-e89b-42d3-a456-426614174099";

const CONVERSATION_ID =
  "29fa4033-8f78-4123-8379-112cf1ed250e";

const OTHER_CONVERSATION_ID =
  "123e4567-e89b-42d3-a456-426614174001";

const MESSAGE_ID =
  "123e4567-e89b-42d3-a456-426614174000";

const TIMESTAMP =
  "2026-11-09T12:00:00.000Z";

function conversation(overrides = {}) {
  return {
    id: CONVERSATION_ID,
    title: "XSUS AI",
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP,
    ...overrides
  };
}

function message(overrides = {}) {
  return {
    id: MESSAGE_ID,
    conversation_id: CONVERSATION_ID,
    role: "user",
    content: "Hello XSUS",
    created_at: TIMESTAMP,
    ...overrides
  };
}

/* ============================================
   QUERY BUILDER MOCK
============================================ */

function createQuery(table) {
  const query = {};

  query.select = vi.fn((...args) => {
    mock.calls.push({
      table,
      method: "select",
      args
    });

    return query;
  });

  query.eq = vi.fn((...args) => {
    mock.calls.push({
      table,
      method: "eq",
      args
    });

    return query;
  });

  query.order = vi.fn((...args) => {
    mock.calls.push({
      table,
      method: "order",
      args
    });

    return query;
  });

  query.insert = vi.fn((...args) => {
    mock.calls.push({
      table,
      method: "insert",
      args
    });

    return query;
  });

  query.limit = vi.fn((...args) => {
    mock.calls.push({
      table,
      method: "limit",
      args
    });

    return Promise.resolve(mock.response);
  });

  query.single = vi.fn(() => {
    return Promise.resolve(mock.response);
  });

  // Supports awaited INSERT queries
  // that do not call single() or limit().
  query.then = (resolve, reject) => {
    return Promise.resolve(
      mock.response
    ).then(resolve, reject);
  };

  return query;
}

/* ============================================
   TEST SETUP
============================================ */

beforeEach(() => {
  vi.clearAllMocks();

  mock.calls.length = 0;

  mock.session = {
    data: {
      session: {
        access_token: "test-token"
      }
    },
    error: null
  };

  mock.user = {
    data: {
      user: {
        id: USER_ID
      }
    },
    error: null
  };

  mock.response = {
    data: [],
    error: null
  };

  mock.getSession.mockImplementation(
    async () => mock.session
  );

  mock.getUser.mockImplementation(
    async () => mock.user
  );

  mock.from.mockImplementation(
    table => createQuery(table)
  );
});

/* ============================================
   1. PUBLIC API
============================================ */

describe("XSUS Adapter — Public API", () => {

  test("exposes version 1.2.0", () => {
    expect(
      CHAT_HISTORY_ADAPTER_VERSION
    ).toBe("1.2.0");
  });

  test("preserves all public functions", () => {
    const functions = [
      loadMyConversations,
      loadMyMessages,
      createMyTestConversation,
      createMyTestMessage,
      testDirectMessageRLS,
      testUnauthorizedMessageInsert
    ];

    for (const fn of functions) {
      expect(typeof fn).toBe("function");
    }
  });

});

/* ============================================
   2. AUTHENTICATION
============================================ */

describe("XSUS Adapter — Authentication", () => {

  test("returns no conversations without session", async () => {
    mock.session.data.session = null;

    const result =
      await loadMyConversations();

    expect(result).toEqual([]);
    expect(mock.from).not.toHaveBeenCalled();
    expect(mock.getUser).not.toHaveBeenCalled();
  });

  test("returns no messages without session", async () => {
    mock.session.data.session = null;

    const result = await loadMyMessages(
      CONVERSATION_ID
    );

    expect(result).toEqual([]);
    expect(mock.from).not.toHaveBeenCalled();
  });

  test("rejects unverified user identity", async () => {
    mock.user.data.user = null;

    const result =
      await loadMyConversations();

    expect(result).toEqual([]);
    expect(mock.from).not.toHaveBeenCalled();
  });

  test("handles session verification errors", async () => {
    mock.session.error = {
      message: "Invalid session"
    };

    const result =
      await loadMyConversations();

    expect(result).toEqual([]);
    expect(mock.from).not.toHaveBeenCalled();
  });

});

/* ============================================
   3. CONVERSATION LOADING
============================================ */

describe("XSUS Adapter — Conversations", () => {

  test("normalizes private conversations", async () => {
    mock.response.data = [
      conversation()
    ];

    const result =
      await loadMyConversations();

    expect(result).toHaveLength(1);

    expect(result[0]).toEqual({
      id: CONVERSATION_ID,
      title: "XSUS AI",
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP
    });

    expect(
      Object.isFrozen(result)
    ).toBe(true);

    expect(
      Object.isFrozen(result[0])
    ).toBe(true);
  });

  test("filters conversations by authenticated user", async () => {
    await loadMyConversations();

    expect(mock.from).toHaveBeenCalledWith(
      "ai_conversations"
    );

    expect(mock.calls).toContainEqual({
      table: "ai_conversations",
      method: "eq",
      args: ["user_id", USER_ID]
    });

    expect(mock.calls).toContainEqual({
      table: "ai_conversations",
      method: "limit",
      args: [100]
    });
  });

  test("rejects malformed database conversations", async () => {
    mock.response.data = [
      conversation({
        title: ""
      })
    ];

    await expect(
      loadMyConversations()
    ).rejects.toThrow(TypeError);
  });

  test("propagates conversation database failures", async () => {
    mock.response.error = {
      message: "Database unavailable"
    };

    await expect(
      loadMyConversations()
    ).rejects.toThrow(
      "Could not load private conversations."
    );
  });

});

/* ============================================
   4. MESSAGE LOADING
============================================ */

describe("XSUS Adapter — Messages", () => {

  test("normalizes private messages", async () => {
    mock.response.data = [
      message()
    ];

    const result = await loadMyMessages(
      CONVERSATION_ID
    );

    expect(result).toHaveLength(1);

    expect(result[0]).toEqual({
      id: MESSAGE_ID,
      conversationId: CONVERSATION_ID,
      role: "user",
      content: "Hello XSUS",
      createdAt: TIMESTAMP
    });

    expect(
      Object.isFrozen(result)
    ).toBe(true);
  });

  test("filters messages by user and conversation", async () => {
    await loadMyMessages(
      CONVERSATION_ID
    );

    expect(mock.from).toHaveBeenCalledWith(
      "ai_messages"
    );

    expect(mock.calls).toContainEqual({
      table: "ai_messages",
      method: "eq",
      args: ["user_id", USER_ID]
    });

    expect(mock.calls).toContainEqual({
      table: "ai_messages",
      method: "eq",
      args: [
        "conversation_id",
        CONVERSATION_ID
      ]
    });

    expect(mock.calls).toContainEqual({
      table: "ai_messages",
      method: "limit",
      args: [200]
    });
  });

  test("rejects invalid conversation UUID", async () => {
    await expect(
      loadMyMessages("invalid-id")
    ).rejects.toThrow(TypeError);

    expect(mock.from).not.toHaveBeenCalled();
  });

  test("rejects mismatched message ownership context", async () => {
    mock.response.data = [
      message({
        conversation_id:
          OTHER_CONVERSATION_ID
      })
    ];

    await expect(
      loadMyMessages(CONVERSATION_ID)
    ).rejects.toThrow(
      "Message conversation mismatch."
    );
  });

  test("accepts case-insensitive UUID equality", async () => {
    mock.response.data = [
      message({
        conversation_id:
          CONVERSATION_ID.toUpperCase()
      })
    ];

    const result = await loadMyMessages(
      CONVERSATION_ID
    );

    expect(result).toHaveLength(1);
  });

  test("propagates message database failures", async () => {
    mock.response.error = {
      message: "Database unavailable"
    };

    await expect(
      loadMyMessages(CONVERSATION_ID)
    ).rejects.toThrow(
      "Could not load private messages."
    );
  });

});

/* ============================================
   5. TEMPORARY SECURITY FUNCTIONS
============================================ */

describe("XSUS Adapter — Security Test Functions", () => {

  test("requires authentication for test conversation creation", async () => {
    mock.session.data.session = null;

    await expect(
      createMyTestConversation()
    ).rejects.toThrow(
      "Authentication required."
    );

    expect(mock.from).not.toHaveBeenCalled();
  });

  test("uses authenticated user ID for test conversation", async () => {
    mock.response.data = {
      id: CONVERSATION_ID,
      title: "XSUS RLS Security Test",
      created_at: TIMESTAMP
    };

    await createMyTestConversation();

    expect(mock.calls).toContainEqual({
      table: "ai_conversations",
      method: "insert",
      args: [{
        user_id: USER_ID,
        title: "XSUS RLS Security Test"
      }]
    });
  });

  test("inserts only user-role test messages", async () => {
    mock.response.data = {
      id: MESSAGE_ID,
      conversation_id: CONVERSATION_ID,
      role: "user",
      created_at: TIMESTAMP
    };

    await createMyTestMessage(
      CONVERSATION_ID
    );

    const insertCall = mock.calls.find(
      call =>
        call.table === "ai_messages" &&
        call.method === "insert"
    );

    expect(insertCall).toBeDefined();

    expect(insertCall.args[0]).toMatchObject({
      conversation_id: CONVERSATION_ID,
      user_id: USER_ID,
      role: "user"
    });
  });

  test("direct RLS read test omits user filter", async () => {
    mock.response.data = [];

    const result = await testDirectMessageRLS(
      CONVERSATION_ID
    );

    expect(result.visibleMessageCount).toBe(0);

    expect(mock.calls).not.toContainEqual({
      table: "ai_messages",
      method: "eq",
      args: ["user_id", USER_ID]
    });
  });

  test("reports a 42501 insert rejection as RLS blocked", async () => {
    mock.response.error = {
      code: "42501",
      message: "Permission denied"
    };

    const result =
      await testUnauthorizedMessageInsert(
        OTHER_CONVERSATION_ID
      );

    expect(result.blocked).toBe(true);
    expect(result.rlsBlocked).toBe(true);
    expect(result.success).toBe(true);
  });

  test("does not mistake foreign-key failure for RLS proof", async () => {
    mock.response.error = {
      code: "23503",
      message: "Foreign key violation"
    };

    const result =
      await testUnauthorizedMessageInsert(
        OTHER_CONVERSATION_ID
      );

    expect(result.blocked).toBe(true);
    expect(result.rlsBlocked).toBe(false);
    expect(result.success).toBe(false);
  });

  test("reports accepted unauthorized insert as unsafe", async () => {
    mock.response = {
      data: null,
      error: null
    };

    const result =
      await testUnauthorizedMessageInsert(
        OTHER_CONVERSATION_ID
      );

    expect(result.success).toBe(false);
    expect(result.blocked).toBe(false);
    expect(result.rlsBlocked).toBe(false);
    expect(result.securityWarning).toBeTruthy();
  });

});
