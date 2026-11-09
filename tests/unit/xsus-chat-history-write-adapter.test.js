
/**
 * XSUS AI V3 — Private History Write Adapter Tests
 * Version: 1.0.0
 * Phase: 22.16.5.8.1
 * Brand: THE X IDENTITY
 *
 * Categories:
 * 1. Public contract
 * 2. Authentication
 * 3. Input validation
 * 4. Conversation creation
 * 5. User message persistence
 * 6. Identity and database integrity
 *
 * No real Supabase requests.
 * No real database writes.
 */

import {
  describe,
  test,
  expect,
  vi,
  beforeEach
} from "vitest";

/* ============================================
   HOISTED MOCKS
============================================ */

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),

  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn()
}));

vi.mock(
  "../../services/supabase-client.js",
  () => ({
    supabase: {
      auth: {
        getSession: mocks.getSession,
        getUser: mocks.getUser
      },
      from: mocks.from
    }
  })
);

import {
  CHAT_HISTORY_WRITE_VERSION,
  CHAT_HISTORY_WRITE_CAPABILITIES,
  createMyConversation,
  saveMyUserMessage
} from "../../assets/js/xsus-ai/adapters/xsus-chat-history-write-adapter.js";

/* ============================================
   FIXTURES
============================================ */

const USER_A =
  "11111111-1111-4111-8111-111111111111";

const USER_B =
  "22222222-2222-4222-8222-222222222222";

const CONVERSATION_ID =
  "33333333-3333-4333-8333-333333333333";

const OTHER_CONVERSATION_ID =
  "44444444-4444-4444-8444-444444444444";

const MESSAGE_ID =
  "55555555-5555-4555-8555-555555555555";

const TIMESTAMP =
  "2026-11-09T12:00:00.000Z";

function conversationRecord(
  title = "XSUS Private Chat"
) {
  return {
    id: CONVERSATION_ID,
    title,
    created_at: TIMESTAMP,
    updated_at: TIMESTAMP
  };
}

function messageRecord(
  content = "Hello XSUS"
) {
  return {
    id: MESSAGE_ID,
    conversation_id: CONVERSATION_ID,
    role: "user",
    content,
    created_at: TIMESTAMP
  };
}

/* ============================================
   MOCK DATABASE CHAIN
============================================ */

function setDatabaseResult(data, error = null) {
  mocks.single.mockResolvedValue({
    data,
    error
  });
}

function setAuthenticatedUser(userId = USER_A) {
  mocks.getSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id: userId
        }
      }
    },
    error: null
  });

  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: userId
      }
    },
    error: null
  });
}

function setSignedOut() {
  mocks.getSession.mockResolvedValue({
    data: {
      session: null
    },
    error: null
  });

  mocks.getUser.mockResolvedValue({
    data: {
      user: null
    },
    error: null
  });
}

function getInsertPayload() {
  return mocks.insert.mock.calls.at(-1)?.[0];
}

/* ============================================
   BEFORE EACH
============================================ */

beforeEach(() => {
  vi.resetAllMocks();

  mocks.from.mockImplementation(() => ({
    insert: mocks.insert
  }));

  mocks.insert.mockImplementation(() => ({
    select: mocks.select
  }));

  mocks.select.mockImplementation(() => ({
    single: mocks.single
  }));

  setAuthenticatedUser();

  setDatabaseResult(
    conversationRecord()
  );
});

/* ============================================
   1. PUBLIC CONTRACT
============================================ */

describe(
  "XSUS History Write — Public Contract",
  () => {

    test(
      "01. exposes version 1.0.0",
      () => {
        expect(
          CHAT_HISTORY_WRITE_VERSION
        ).toBe("1.0.0");
      }
    );

    test(
      "02. declares safe write capabilities",
      () => {
        expect(
          CHAT_HISTORY_WRITE_CAPABILITIES
        ).toEqual(
          expect.objectContaining({
            version: "1.0.0",
            createConversation: true,
            saveUserMessage: true,
            saveAssistantMessage: false,
            anonymousWrites: false,
            requiresAuthentication: true,
            requiresRLS: true
          })
        );

        expect(
          Object.isFrozen(
            CHAT_HISTORY_WRITE_CAPABILITIES
          )
        ).toBe(true);
      }
    );

  }
);

/* ============================================
   2. AUTHENTICATION
============================================ */

describe(
  "XSUS History Write — Authentication",
  () => {

    test(
      "03. rejects conversation creation when signed out",
      async () => {
        setSignedOut();

        await expect(
          createMyConversation({
            title: "Private"
          })
        ).rejects.toThrow(
          "Authentication required."
        );

        expect(
          mocks.from
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "04. rejects message persistence when signed out",
      async () => {
        setSignedOut();

        await expect(
          saveMyUserMessage({
            conversationId: CONVERSATION_ID,
            content: "Hello"
          })
        ).rejects.toThrow(
          "Authentication required."
        );

        expect(
          mocks.from
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "05. rejects invalid authenticated user",
      async () => {
        mocks.getUser.mockResolvedValue({
          data: {
            user: null
          },
          error: null
        });

        await expect(
          createMyConversation({
            title: "Private"
          })
        ).rejects.toThrow(
          "Authentication required."
        );

        expect(
          mocks.from
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "06. rejects session verification errors",
      async () => {
        mocks.getSession.mockResolvedValue({
          data: {
            session: null
          },
          error: {
            message: "Invalid session"
          }
        });

        await expect(
          createMyConversation({
            title: "Private"
          })
        ).rejects.toThrow(
          "Authentication required."
        );

        expect(
          mocks.from
        ).not.toHaveBeenCalled();
      }
    );

  }
);

/* ============================================
   3. INPUT VALIDATION
============================================ */

describe(
  "XSUS History Write — Input Validation",
  () => {

    test(
      "07. rejects empty conversation title",
      async () => {
        await expect(
          createMyConversation({
            title: "   "
          })
        ).rejects.toThrow(
          TypeError
        );

        expect(
          mocks.from
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "08. rejects oversized conversation title",
      async () => {
        await expect(
          createMyConversation({
            title: "X".repeat(201)
          })
        ).rejects.toThrow(
          TypeError
        );

        expect(
          mocks.from
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "09. rejects invalid conversation UUID",
      async () => {
        await expect(
          saveMyUserMessage({
            conversationId: "invalid-id",
            content: "Hello"
          })
        ).rejects.toThrow(
          TypeError
        );

        expect(
          mocks.from
        ).not.toHaveBeenCalled();
      }
    );

    test(
      "10. rejects empty and oversized message content",
      async () => {
        for (const content of [
          "",
          "   ",
          "X".repeat(12001)
        ]) {
          await expect(
            saveMyUserMessage({
              conversationId: CONVERSATION_ID,
              content
            })
          ).rejects.toThrow(
            TypeError
          );
        }

        expect(
          mocks.from
        ).not.toHaveBeenCalled();
      }
    );

  }
);

/* ============================================
   4. CONVERSATION CREATION
============================================ */

describe(
  "XSUS History Write — Conversation Creation",
  () => {

    test(
      "11. creates private conversation with authenticated owner",
      async () => {
        setDatabaseResult(
          conversationRecord()
        );

        const result =
          await createMyConversation({
            title: "XSUS Private Chat"
          });

        expect(
          mocks.from
        ).toHaveBeenCalledWith(
          "ai_conversations"
        );

        expect(
          getInsertPayload()
        ).toEqual({
          user_id: USER_A,
          title: "XSUS Private Chat"
        });

        expect(result).toEqual({
          id: CONVERSATION_ID,
          title: "XSUS Private Chat",
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP
        });

        expect(
          Object.isFrozen(result)
        ).toBe(true);
      }
    );

    test(
      "12. trims conversation title before insert",
      async () => {
        setDatabaseResult(
          conversationRecord("XSUS")
        );

        await createMyConversation({
          title: "  XSUS  "
        });

        expect(
          getInsertPayload().title
        ).toBe("XSUS");
      }
    );

    test(
      "13. reports database conversation errors",
      async () => {
        setDatabaseResult(
          null,
          {
            code: "42501",
            message: "RLS denied"
          }
        );

        await expect(
          createMyConversation({
            title: "Private"
          })
        ).rejects.toMatchObject({
          message:
            "Private history conversation creation failed.",
          code: "42501"
        });
      }
    );

  }
);

/* ============================================
   5. USER MESSAGE PERSISTENCE
============================================ */

describe(
  "XSUS History Write — User Messages",
  () => {

    test(
      "14. saves a user message with authenticated owner",
      async () => {
        setDatabaseResult(
          messageRecord()
        );

        const result =
          await saveMyUserMessage({
            conversationId:
              CONVERSATION_ID,
            content: "Hello XSUS"
          });

        expect(
          mocks.from
        ).toHaveBeenCalledWith(
          "ai_messages"
        );

        expect(
          getInsertPayload()
        ).toEqual({
          conversation_id:
            CONVERSATION_ID,
          user_id: USER_A,
          role: "user",
          content: "Hello XSUS"
        });

        expect(result).toEqual({
          id: MESSAGE_ID,
          conversationId:
            CONVERSATION_ID,
          role: "user",
          content: "Hello XSUS",
          createdAt: TIMESTAMP
        });
      }
    );

    test(
      "15. rejects assistant role from returned database record",
      async () => {
        setDatabaseResult({
          ...messageRecord(),
          role: "assistant"
        });

        await expect(
          saveMyUserMessage({
            conversationId:
              CONVERSATION_ID,
            content: "Hello XSUS"
          })
        ).rejects.toThrow(
          "Saved message verification failed."
        );

        expect(
          getInsertPayload().role
        ).toBe("user");
      }
    );

    test(
      "16. rejects mismatched conversation in returned message",
      async () => {
        setDatabaseResult({
          ...messageRecord(),
          conversation_id:
            OTHER_CONVERSATION_ID
        });

        await expect(
          saveMyUserMessage({
            conversationId:
              CONVERSATION_ID,
            content: "Hello XSUS"
          })
        ).rejects.toThrow(
          "Saved message conversation mismatch."
        );
      }
    );

  }
);

/* ============================================
   6. IDENTITY AND DATABASE INTEGRITY
============================================ */

describe(
  "XSUS History Write — Identity Integrity",
  () => {

    test(
      "17. rejects account changes during conversation creation",
      async () => {
        mocks.getUser
          .mockResolvedValueOnce({
            data: {
              user: {
                id: USER_A
              }
            },
            error: null
          })
          .mockResolvedValueOnce({
            data: {
              user: {
                id: USER_B
              }
            },
            error: null
          });

        setDatabaseResult(
          conversationRecord()
        );

        await expect(
          createMyConversation({
            title: "Private"
          })
        ).rejects.toThrow(
          "Authentication changed during conversation creation."
        );
      }
    );

    test(
      "18. rejects account changes during message persistence",
      async () => {
        mocks.getUser
          .mockResolvedValueOnce({
            data: {
              user: {
                id: USER_A
              }
            },
            error: null
          })
          .mockResolvedValueOnce({
            data: {
              user: {
                id: USER_B
              }
            },
            error: null
          });

        setDatabaseResult(
          messageRecord()
        );

        await expect(
          saveMyUserMessage({
            conversationId:
              CONVERSATION_ID,
            content: "Hello XSUS"
          })
        ).rejects.toThrow(
          "Authentication changed during message creation."
        );
      }
    );

  }
);
