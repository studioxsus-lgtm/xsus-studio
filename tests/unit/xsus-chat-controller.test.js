
/**
 * @vitest-environment jsdom
 *
 * XSUS AI V3 — Chat Controller Tests
 * Version: 1.0.0
 * Phase: 22.16.5.3
 * Brand: THE X IDENTITY
 *
 * Tests:
 * - Public API
 * - History hydration
 * - Contract validation
 * - Atomic state replacement
 * - Conversation navigation
 * - Memory clearing
 * - AI response lifecycle isolation
 *
 * No Supabase access.
 * No database writes.
 */

import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach
} from "vitest";

import {
  CHAT_VERSION,
  createChatController
} from "../../assets/js/xsus-ai/chat.js";

/* ============================================
   FIXTURES
============================================ */

const CONVERSATION_ID =
  "29fa4033-8f78-4123-8379-112cf1ed250e";

const OTHER_CONVERSATION_ID =
  "123e4567-e89b-42d3-a456-426614174001";

const MESSAGE_ID =
  "123e4567-e89b-42d3-a456-426614174000";

const SECOND_MESSAGE_ID =
  "123e4567-e89b-42d3-a456-426614174002";

const TIMESTAMP =
  "2026-11-09T12:00:00.000Z";

function makeConversation(overrides = {}) {
  return {
    id: CONVERSATION_ID,
    title: "XSUS Private Conversation",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides
  };
}

function makeMessage(overrides = {}) {
  return {
    id: MESSAGE_ID,
    conversationId: CONVERSATION_ID,
    role: "user",
    content: "Hello XSUS AI",
    createdAt: TIMESTAMP,
    ...overrides
  };
}

function makeHistory({
  conversations = [makeConversation()],
  messages = [makeMessage()]
} = {}) {
  return {
    conversations,
    messagesByConversation: {
      [CONVERSATION_ID]: messages
    }
  };
}

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject
  };
}

/* ============================================
   DOM TEST HARNESS
============================================ */

let controller;
let input;
let sendButton;
let messagesContainer;
let historyContainer;
let onError;
let onConversationChange;
let uuidCounter;

function setupController(options = {}) {
  document.body.innerHTML = `
    <main class="xsus-ai-workspace">
      <section class="xsus-ai-welcome"></section>

      <section class="xsus-conversation" hidden>
        <div class="xsus-conversation-messages"></div>
      </section>

      <div class="xsus-sidebar-history"></div>

      <textarea class="xsus-chat-input"></textarea>

      <button class="xsus-send-button">
        Send
      </button>
    </main>
  `;

  input = document.querySelector(
    ".xsus-chat-input"
  );

  sendButton = document.querySelector(
    ".xsus-send-button"
  );

  messagesContainer = document.querySelector(
    ".xsus-conversation-messages"
  );

  historyContainer = document.querySelector(
    ".xsus-sidebar-history"
  );

  onError = vi.fn();
  onConversationChange = vi.fn();

  controller = createChatController({
    messagesContainer,
    input,
    sendButton,

    conversationContainer:
      document.querySelector(
        ".xsus-conversation"
      ),

    welcomeContainer:
      document.querySelector(
        ".xsus-ai-welcome"
      ),

    historyContainer,

    onError,
    onConversationChange,

    ...options
  });

  return controller;
}

beforeEach(() => {
  localStorage.clear();

  uuidCounter = 0;

  vi.stubGlobal("crypto", {
    randomUUID: () => {
      uuidCounter += 1;

      return (
        "a0000000-0000-4000-8000-" +
        String(uuidCounter).padStart(12, "0")
      );
    }
  });
});

afterEach(() => {
  controller?.destroy();
  controller = null;

  vi.unstubAllGlobals();
  vi.restoreAllMocks();

  document.body.innerHTML = "";
  localStorage.clear();
});

/* ============================================
   1. PUBLIC API
============================================ */

describe("XSUS Chat — Public API", () => {

  test("exposes version 3.3.0", () => {
    expect(CHAT_VERSION).toBe("3.3.0");
  });

  test("exposes hydration and clearing methods", () => {
    setupController();

    expect(
      typeof controller.hydrateHistory
    ).toBe("function");

    expect(
      typeof controller.clearHistory
    ).toBe("function");

    expect(
      typeof controller.getMessages
    ).toBe("function");
  });

  test("preserves existing controller methods", () => {
    setupController();

    for (const method of [
      "newConversation",
      "selectConversation",
      "deleteConversation",
      "sendMessage",
      "getActiveConversationId",
      "getConversations",
      "getMessages",
      "refresh",
      "destroy"
    ]) {
      expect(
        typeof controller[method]
      ).toBe("function");
    }
  });

});

/* ============================================
   2. HISTORY HYDRATION
============================================ */

describe("XSUS Chat — History Hydration", () => {

  test("imports a valid conversation", () => {
    setupController();

    expect(
      controller.hydrateHistory(
        makeHistory()
      )
    ).toBe(true);

    const conversations =
      controller.getConversations();

    expect(conversations).toHaveLength(1);

    expect(conversations[0].id).toBe(
      CONVERSATION_ID
    );

    expect(conversations[0].title).toBe(
      "XSUS Private Conversation"
    );

    expect(
      controller.getActiveConversationId()
    ).toBe(CONVERSATION_ID);
  });

  test("imports user and assistant messages", () => {
    setupController();

    const history = makeHistory({
      messages: [
        makeMessage(),
        makeMessage({
          id: SECOND_MESSAGE_ID,
          role: "assistant",
          content: "Hello from XSUS AI"
        })
      ]
    });

    controller.hydrateHistory(history);

    const messages =
      controller.getMessages();

    expect(messages).toHaveLength(2);

    expect(messages[0].role).toBe("user");

    expect(messages[1].role).toBe(
      "assistant"
    );

    expect(messages[1].content).toBe(
      "Hello from XSUS AI"
    );

    expect(
      messages[1].attachments
    ).toEqual([]);
  });

  test("renders imported messages safely", () => {
    setupController();

    controller.hydrateHistory(
      makeHistory({
        messages: [
          makeMessage({
            content: "<script>alert(1)</script>"
          })
        ]
      })
    );

    expect(
      messagesContainer.querySelector(
        "script"
      )
    ).toBeNull();

    expect(
      messagesContainer.textContent
    ).toContain(
      "<script>alert(1)</script>"
    );
  });

  test("imports empty history", () => {
    setupController();

    controller.hydrateHistory(
      makeHistory()
    );

    expect(
      controller.hydrateHistory({
        conversations: [],
        messagesByConversation: {}
      })
    ).toBe(true);

    expect(
      controller.getConversations()
    ).toEqual([]);

    expect(
      controller.getActiveConversationId()
    ).toBeNull();

    expect(
      controller.getMessages()
    ).toEqual([]);
  });

  test("does not retain caller-owned arrays", () => {
    setupController();

    const history = makeHistory();

    controller.hydrateHistory(history);

    history.conversations[0].title =
      "Changed externally";

    history.messagesByConversation[
      CONVERSATION_ID
    ][0].content = "Changed externally";

    expect(
      controller.getConversations()[0].title
    ).toBe("XSUS Private Conversation");

    expect(
      controller.getMessages()[0].content
    ).toBe("Hello XSUS AI");
  });

  test("replaces old history atomically", () => {
    setupController();

    controller.hydrateHistory(
      makeHistory()
    );

    expect(() => {
      controller.hydrateHistory({
        conversations: [
          makeConversation({
            id: OTHER_CONVERSATION_ID,
            title: ""
          })
        ],
        messagesByConversation: {}
      });
    }).toThrow(TypeError);

    expect(
      controller.getConversations()
    ).toHaveLength(1);

    expect(
      controller.getActiveConversationId()
    ).toBe(CONVERSATION_ID);
  });

});

/* ============================================
   3. VALIDATION
============================================ */

describe("XSUS Chat — Validation", () => {

  test("rejects missing conversations", () => {
    setupController();

    expect(() =>
      controller.hydrateHistory({})
    ).toThrow(TypeError);
  });

  test("rejects invalid conversation UUID", () => {
    setupController();

    expect(() =>
      controller.hydrateHistory({
        conversations: [
          makeConversation({
            id: "invalid-id"
          })
        ]
      })
    ).toThrow(TypeError);
  });

  test("rejects duplicate conversation UUIDs", () => {
    setupController();

    expect(() =>
      controller.hydrateHistory({
        conversations: [
          makeConversation(),
          makeConversation({
            id: CONVERSATION_ID.toUpperCase()
          })
        ]
      })
    ).toThrow(
      "Duplicate conversation ID."
    );
  });

  test("rejects invalid timestamps", () => {
    setupController();

    expect(() =>
      controller.hydrateHistory({
        conversations: [
          makeConversation({
            createdAt: "not-a-date"
          })
        ]
      })
    ).toThrow(TypeError);
  });

  test("rejects more than 100 conversations", () => {
    setupController();

    const conversations =
      Array.from(
        { length: 101 },
        () => makeConversation()
      );

    expect(() =>
      controller.hydrateHistory({
        conversations
      })
    ).toThrow(RangeError);
  });

  test("rejects invalid message role", () => {
    setupController();

    expect(() =>
      controller.hydrateHistory(
        makeHistory({
          messages: [
            makeMessage({
              role: "system"
            })
          ]
        })
      )
    ).toThrow(TypeError);
  });

  test("rejects messages from another conversation", () => {
    setupController();

    expect(() =>
      controller.hydrateHistory(
        makeHistory({
          messages: [
            makeMessage({
              conversationId:
                OTHER_CONVERSATION_ID
            })
          ]
        })
      )
    ).toThrow(
      "Message conversation mismatch."
    );
  });

  test("rejects duplicate message IDs", () => {
    setupController();

    expect(() =>
      controller.hydrateHistory(
        makeHistory({
          messages: [
            makeMessage(),
            makeMessage({
              content: "Another message"
            })
          ]
        })
      )
    ).toThrow(
      "Duplicate message ID."
    );
  });

  test("rejects oversized message content", () => {
    setupController();

    expect(() =>
      controller.hydrateHistory(
        makeHistory({
          messages: [
            makeMessage({
              content: "X".repeat(12001)
            })
          ]
        })
      )
    ).toThrow(TypeError);
  });

  test("rejects more than 200 messages", () => {
    setupController();

    const messages =
      Array.from(
        { length: 201 },
        () => makeMessage()
      );

    expect(() =>
      controller.hydrateHistory(
        makeHistory({ messages })
      )
    ).toThrow(RangeError);
  });

});

/* ============================================
   4. CONVERSATION NAVIGATION
============================================ */

describe("XSUS Chat — Navigation", () => {

  test("selects an imported conversation", () => {
    setupController();

    controller.hydrateHistory({
      conversations: [
        makeConversation(),
        makeConversation({
          id: OTHER_CONVERSATION_ID,
          title: "Second conversation"
        })
      ],

      messagesByConversation: {
        [CONVERSATION_ID]: [
          makeMessage()
        ],

        [OTHER_CONVERSATION_ID]: [
          makeMessage({
            id: SECOND_MESSAGE_ID,
            conversationId:
              OTHER_CONVERSATION_ID,
            content: "Second chat message"
          })
        ]
      }
    });

    expect(
      controller.selectConversation(
        OTHER_CONVERSATION_ID
      )
    ).toBe(true);

    expect(
      controller.getActiveConversationId()
    ).toBe(OTHER_CONVERSATION_ID);

    expect(
      controller.getMessages()[0].content
    ).toBe("Second chat message");
  });

  test("rejects selection of unknown conversation", () => {
    setupController();

    controller.hydrateHistory(
      makeHistory()
    );

    expect(
      controller.selectConversation(
        OTHER_CONVERSATION_ID
      )
    ).toBe(false);

    expect(
      controller.getActiveConversationId()
    ).toBe(CONVERSATION_ID);
  });

});

/* ============================================
   5. CLEAR HISTORY
============================================ */

describe("XSUS Chat — Clear History", () => {

  test("clears conversations and messages", () => {
    setupController();

    controller.hydrateHistory(
      makeHistory()
    );

    expect(
      controller.clearHistory()
    ).toBe(true);

    expect(
      controller.getConversations()
    ).toEqual([]);

    expect(
      controller.getMessages()
    ).toEqual([]);

    expect(
      controller.getActiveConversationId()
    ).toBeNull();

    expect(
      historyContainer.children
    ).toHaveLength(0);
  });

  test("clears composer input", () => {
    setupController();

    controller.hydrateHistory(
      makeHistory()
    );

    input.value = "Private draft";

    controller.clearHistory();

    expect(input.value).toBe("");
  });

  test("does not write history into localStorage", () => {
    setupController();

    controller.hydrateHistory(
      makeHistory()
    );

    expect(
      localStorage.getItem(
        "xsus-ai-v3-conversations"
      )
    ).toBeNull();
  });

  test("rejects hydration after destruction", () => {
    setupController();

    controller.destroy();

    expect(
      controller.hydrateHistory(
        makeHistory()
      )
    ).toBe(false);

    expect(
      controller.clearHistory()
    ).toBe(false);
  });

});

/* ============================================
   6. AI RESPONSE LIFECYCLE
============================================ */

describe("XSUS Chat — AI Lifecycle", () => {

  test("ignores AI response after history clearing", async () => {
    const deferred =
      createDeferred();

    setupController({
      onSend: () => deferred.promise
    });

    input.value = "Private request";

    const pending =
      controller.sendMessage();

    expect(
      controller.getMessages()
    ).toHaveLength(1);

    controller.clearHistory();

    deferred.resolve({
      answer: "Old session answer"
    });

    expect(await pending).toBe(false);

    expect(
      controller.getMessages()
    ).toEqual([]);

    expect(
      messagesContainer.textContent
    ).not.toContain(
      "Old session answer"
    );
  });

  test("ignores old rejected request after clearing", async () => {
    const deferred =
      createDeferred();

    setupController({
      onSend: () => deferred.promise
    });

    input.value = "Private request";

    const pending =
      controller.sendMessage();

    controller.clearHistory();

    deferred.reject(
      new Error("Old session failure")
    );

    expect(await pending).toBe(false);

    expect(onError).not.toHaveBeenCalled();
  });

  test("allows a new session after clearing", async () => {
    const oldDeferred =
      createDeferred();

    let calls = 0;

    setupController({
      onSend: () => {
        calls += 1;

        if (calls === 1) {
          return oldDeferred.promise;
        }

        return Promise.resolve({
          answer: "New session answer"
        });
      }
    });

    input.value = "Old request";

    const oldPending =
      controller.sendMessage();

    controller.clearHistory();

    input.value = "New request";

    expect(
      await controller.sendMessage()
    ).toBe(true);

    oldDeferred.resolve({
      answer: "Old session answer"
    });

    expect(await oldPending).toBe(false);

    const contents =
      controller.getMessages().map(
        item => item.content
      );

    expect(contents).toContain(
      "New session answer"
    );

    expect(contents).not.toContain(
      "Old session answer"
    );
  });

});

