
/**
 * @vitest-environment jsdom
 *
 * XSUS AI V3 — Private History Integration
 * Phase: 22.16.5.6
 *
 * Tests:
 * - Application initialization
 * - Private history startup
 * - Authenticated history loading
 * - Signed-out isolation
 * - Account switching
 * - Manual refresh
 * - Disabled private history
 * - Application destruction
 *
 * No real Supabase requests.
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

/* ============================================
   MOCKS
============================================ */

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),

  loadMyConversations: vi.fn(),
  loadMyMessages: vi.fn(),

  createChatController: vi.fn(),
  createNavigation: vi.fn(),
  createPlusMenu: vi.fn(),
  createLanguageController: vi.fn(),

  chat: null,
  authCallback: null
}));

vi.mock(
  "../../services/supabase-client.js",
  () => ({
    supabase: {
      auth: {
        getUser: mocks.getUser,
        onAuthStateChange:
          mocks.onAuthStateChange
      }
    }
  })
);

vi.mock(
  "../../assets/js/xsus-ai/adapters/xsus-chat-history-adapter.js",
  () => ({
    loadMyConversations:
      mocks.loadMyConversations,

    loadMyMessages:
      mocks.loadMyMessages
  })
);

vi.mock(
  "../../assets/js/xsus-ai/chat.js",
  () => ({
    createChatController:
      mocks.createChatController
  })
);

vi.mock(
  "../../assets/js/xsus-ai/navigation.js",
  () => ({
    createNavigation:
      mocks.createNavigation
  })
);

vi.mock(
  "../../assets/js/xsus-ai/plus-menu.js",
  () => ({
    createPlusMenu:
      mocks.createPlusMenu
  })
);

vi.mock(
  "../../assets/js/xsus-ai/language.js",
  () => ({
    createLanguageController:
      mocks.createLanguageController
  })
);

vi.mock(
  "../../assets/js/xsus-ai/adapters/xsus-ai-core-adapter.js",
  () => ({
    createXSUSCoreAdapter:
      vi.fn(() => async () => ({
        answer: "Mock AI response"
      }))
  })
);

import {
  createXSUSAIApp,
  XSUS_APP_VERSION
} from "../../assets/js/xsus-ai/app.js";

/* ============================================
   FIXTURES
============================================ */

const USER_A =
  "11111111-1111-4111-8111-111111111111";

const USER_B =
  "22222222-2222-4222-8222-222222222222";

const CONVERSATION_ID =
  "33333333-3333-4333-8333-333333333333";

const MESSAGE_ID =
  "44444444-4444-4444-8444-444444444444";

const TIMESTAMP =
  "2026-11-09T12:00:00.000Z";

function makeConversation() {
  return {
    id: CONVERSATION_ID,
    title: "Private XSUS Chat",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function makeMessage() {
  return {
    id: MESSAGE_ID,
    conversationId: CONVERSATION_ID,
    role: "user",
    content: "Private message",
    createdAt: TIMESTAMP
  };
}

/* ============================================
   UTILITIES
============================================ */

async function flushAsync() {
  for (let i = 0; i < 40; i++) {
    await Promise.resolve();
  }
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

let currentUserId;
let instance;
let root;

function setUser(id) {
  currentUserId = id;
}

function emitAuth(event, id) {
  if (!mocks.authCallback) {
    throw new Error(
      "Auth callback is not registered."
    );
  }

  mocks.authCallback(
    event,
    id
      ? { user: { id } }
      : null
  );
}

/* ============================================
   DOM FIXTURE
============================================ */

function createDOM() {
  document.body.innerHTML = `
    <main class="xsus-ai-app">
      <aside class="xsus-ai-sidebar">
        <div class="xsus-sidebar-history"></div>
      </aside>

      <button data-sidebar-toggle></button>
      <button data-sidebar-close></button>
      <button data-sidebar-collapse></button>

      <div class="xsus-sidebar-backdrop"></div>

      <nav class="xsus-ai-header-nav"></nav>
      <button class="xsus-ai-menu-toggle"></button>

      <section class="xsus-ai-workspace">
        <div class="xsus-ai-welcome"></div>

        <div class="xsus-conversation">
          <div class="xsus-conversation-messages"></div>
        </div>

        <textarea class="xsus-chat-input"></textarea>
        <button class="xsus-send-button"></button>
      </section>

      <button class="xsus-plus-button"></button>
      <div class="xsus-plus-menu"></div>

      <div class="xsus-chat-attachments"></div>

      <button data-action="new-chat"></button>

      <button data-suggestion="Hello"></button>

      <div data-xsus-error hidden></div>
    </main>
  `;

  return document;
}

/* ============================================
   CHAT CONTROLLER MOCK
============================================ */

function createMockChat() {
  let conversations = [];
  let activeMessages = [];

  const chat = {
    clearHistory: vi.fn(() => {
      conversations = [];
      activeMessages = [];
      return true;
    }),

    hydrateHistory: vi.fn(payload => {
      conversations =
        payload.conversations;

      const first =
        conversations[0];

      activeMessages = first
        ? payload.messagesByConversation[
            first.id
          ] || []
        : [];

      return true;
    }),

    getConversations: vi.fn(
      () => conversations
    ),

    getMessages: vi.fn(
      () => activeMessages
    ),

    newConversation: vi.fn(
      () => true
    ),

    sendMessage: vi.fn(
      async () => true
    ),

    destroy: vi.fn(),

    refresh: vi.fn()
  };

  return chat;
}

/* ============================================
   SETUP
============================================ */

beforeEach(() => {
  vi.clearAllMocks();

  currentUserId = USER_A;
  instance = null;

  mocks.authCallback = null;

  root = createDOM();

  mocks.getUser.mockImplementation(
    async () => ({
      data: {
        user: currentUserId
          ? { id: currentUserId }
          : null
      },
      error: null
    })
  );

  mocks.onAuthStateChange.mockImplementation(
    callback => {
      mocks.authCallback = callback;

      return {
        data: {
          subscription: {
            unsubscribe:
              mocks.unsubscribe
          }
        }
      };
    }
  );

  mocks.loadMyConversations
    .mockResolvedValue([
      makeConversation()
    ]);

  mocks.loadMyMessages
    .mockResolvedValue([
      makeMessage()
    ]);

  mocks.createChatController
    .mockImplementation(() => {
      mocks.chat = createMockChat();
      return mocks.chat;
    });

  mocks.createNavigation
    .mockImplementation(() => ({
      navigate: vi.fn(() => true),
      destroy: vi.fn()
    }));

  mocks.createPlusMenu
    .mockImplementation(() => ({
      getFiles: vi.fn(() => []),
      clearFiles: vi.fn(),
      destroy: vi.fn()
    }));

  mocks.createLanguageController
    .mockImplementation(() => ({
      getLanguage: vi.fn(() => "sq"),
      setLanguage: vi.fn(() => true),
      destroy: vi.fn()
    }));
});

afterEach(() => {
  instance?.destroy();
  instance = null;

  document.body.innerHTML = "";
});

/* ============================================
   APPLICATION FACTORY
============================================ */

function createApp(options = {}) {
  instance = createXSUSAIApp({
    root,
    aiAdapter: async () => ({
      answer: "XSUS AI response"
    }),
    ...options
  });

  return instance;
}

/* ============================================
   INTEGRATION TESTS
============================================ */

describe(
  "XSUS AI V3 — Private History Integration",
  () => {

    test(
      "1. exposes application version 3.1.0",
      () => {
        expect(
          XSUS_APP_VERSION
        ).toBe("3.1.0");
      }
    );

    test(
      "2. initializes private history session",
      async () => {
        const app = createApp();

        expect(
          app.isPrivateHistoryEnabled()
        ).toBe(true);

        expect(
          mocks.onAuthStateChange
        ).toHaveBeenCalledTimes(1);

        await flushAsync();

        expect(
          app.getAuthenticatedUserId()
        ).toBe(USER_A);
      }
    );

    test(
      "3. loads authenticated private history into chat",
      async () => {
        const app = createApp();

        await flushAsync();

        expect(
          mocks.loadMyConversations
        ).toHaveBeenCalled();

        expect(
          mocks.loadMyMessages
        ).toHaveBeenCalledWith(
          CONVERSATION_ID
        );

        expect(
          mocks.chat.hydrateHistory
        ).toHaveBeenCalledWith({
          conversations: [
            makeConversation()
          ],
          messagesByConversation: {
            [CONVERSATION_ID]: [
              makeMessage()
            ]
          }
        });

        expect(
          app.getPrivateHistoryStatus()
        ).toBe("ready");
      }
    );

    test(
      "4. signed-out event clears private chat",
      async () => {
        const app = createApp();

        await flushAsync();

        setUser(null);

        emitAuth(
          "SIGNED_OUT",
          null
        );

        await flushAsync();

        expect(
          mocks.chat.clearHistory
        ).toHaveBeenCalled();

        expect(
          app.getAuthenticatedUserId()
        ).toBeNull();

        expect(
          app.getPrivateHistoryStatus()
        ).toBe("signed-out");

        expect(
          mocks.chat.getConversations()
        ).toEqual([]);
      }
    );

    test(
      "5. switching accounts invalidates previous history",
      async () => {
        const app = createApp();

        await flushAsync();

        const clearsBefore =
          mocks.chat.clearHistory.mock.calls.length;

        setUser(USER_B);

        emitAuth(
          "SIGNED_IN",
          USER_B
        );

        await flushAsync();

        expect(
          mocks.chat.clearHistory.mock.calls.length
        ).toBeGreaterThan(
          clearsBefore
        );

        expect(
          app.getAuthenticatedUserId()
        ).toBe(USER_B);

        expect(
          app.getPrivateHistoryStatus()
        ).toBe("ready");
      }
    );

    test(
      "6. manual refresh uses private history session",
      async () => {
        const app = createApp();

        await flushAsync();

        const before =
          mocks.loadMyConversations.mock.calls.length;

        const result =
          await app.refreshPrivateHistory({
            force: true
          });

        expect(result).toBe(true);

        expect(
          mocks.loadMyConversations.mock.calls.length
        ).toBeGreaterThan(
          before
        );
      }
    );

    test(
      "7. private history can be disabled",
      async () => {
        const app = createApp({
          enablePrivateHistory: false
        });

        await flushAsync();

        expect(
          app.isPrivateHistoryEnabled()
        ).toBe(false);

        expect(
          app.getPrivateHistoryStatus()
        ).toBe("disabled");

        expect(
          mocks.onAuthStateChange
        ).not.toHaveBeenCalled();

        expect(
          await app.refreshPrivateHistory()
        ).toBe(false);
      }
    );

    test(
      "8. destroy unsubscribes from auth",
      async () => {
        const app = createApp();

        await flushAsync();

        app.destroy();

        expect(
          mocks.unsubscribe
        ).toHaveBeenCalledTimes(1);

        expect(
          mocks.chat.destroy
        ).toHaveBeenCalledTimes(1);

        expect(
          root.querySelector(
            ".xsus-ai-app"
          ).dataset.xsusInitialized
        ).toBeUndefined();
      }
    );

    test(
      "9. delayed history cannot hydrate after destroy",
      async () => {
        const wait = createDeferred();

        mocks.loadMyConversations
          .mockReturnValue(
            wait.promise
          );

        const app = createApp();

        await flushAsync();

        app.destroy();

        wait.resolve([
          makeConversation()
        ]);

        await flushAsync();

        expect(
          mocks.chat.hydrateHistory
        ).not.toHaveBeenCalled();

        expect(
          mocks.unsubscribe
        ).toHaveBeenCalledTimes(1);
      }
    );

    test(
      "10. repeated auth event does not reload ready history",
      async () => {
        createApp();

        await flushAsync();

        mocks.loadMyConversations
          .mockClear();

        emitAuth(
          "SIGNED_IN",
          USER_A
        );

        await flushAsync();

        expect(
          mocks.loadMyConversations
        ).not.toHaveBeenCalled();
      }
    );

  }
);
