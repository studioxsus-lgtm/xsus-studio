
/**
 * XSUS AI V3 — Private History Session Tests
 * Version: 1.0.0
 * Phase: 22.16.5.4.1
 *
 * Categories:
 * 1. Public API
 * 2. Authentication
 * 3. Private history loading
 * 4. Identity isolation
 * 5. Asynchronous race protection
 * 6. Lifecycle cleanup
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
   HOISTED MOCKS
============================================ */

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  loadMyConversations: vi.fn(),
  loadMyMessages: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
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

import {
  PRIVATE_HISTORY_SESSION_VERSION,
  createPrivateHistorySession
} from "../../assets/js/xsus-ai/adapters/xsus-private-history-session.js";

/* ============================================
   FIXTURES
============================================ */

const USER_A =
  "11111111-1111-4111-8111-111111111111";

const USER_B =
  "22222222-2222-4222-8222-222222222222";

const CONVERSATION_ID =
  "29fa4033-8f78-4123-8379-112cf1ed250e";

const MESSAGE_ID =
  "123e4567-e89b-42d3-a456-426614174000";

const TIMESTAMP =
  "2026-11-09T12:00:00.000Z";

function makeConversation() {
  return {
    id: CONVERSATION_ID,
    title: "Private XSUS Conversation",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP
  };
}

function makeMessage() {
  return {
    id: MESSAGE_ID,
    conversationId: CONVERSATION_ID,
    role: "user",
    content: "Private XSUS message",
    createdAt: TIMESTAMP
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

function setAuthenticatedUser(userId) {
  mocks.getUser.mockResolvedValue({
    data: {
      user: userId
        ? { id: userId }
        : null
    },
    error: null
  });
}

function emitAuth(event, userId = null) {
  if (typeof mocks.authCallback !== "function") {
    throw new Error(
      "Auth callback was not registered."
    );
  }

  mocks.authCallback(
    event,
    userId
      ? { user: { id: userId } }
      : null
  );
}

async function flushAsync() {
  for (let i = 0; i < 12; i += 1) {
    await Promise.resolve();
  }
}

/* ============================================
   TEST HARNESS
============================================ */

let session;
let chatController;
let onError;
let onStatusChange;

function setupSession() {
  chatController = {
    clearHistory: vi.fn(
      () => true
    ),

    hydrateHistory: vi.fn(
      () => true
    )
  };

  onError = vi.fn();
  onStatusChange = vi.fn();

  session = createPrivateHistorySession({
    chatController,
    onError,
    onStatusChange
  });

  return session;
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.authCallback = null;

  mocks.onAuthStateChange.mockImplementation(
    callback => {
      mocks.authCallback = callback;

      return {
        data: {
          subscription: {
            unsubscribe: mocks.unsubscribe
          }
        }
      };
    }
  );

  setAuthenticatedUser(USER_A);

  mocks.loadMyConversations.mockResolvedValue(
    [makeConversation()]
  );

  mocks.loadMyMessages.mockResolvedValue(
    [makeMessage()]
  );
});

afterEach(() => {
  session?.destroy();
  session = null;
});

/* ============================================
   1. PUBLIC API
============================================ */

describe(
  "XSUS Private History — Public API",
  () => {

    test("exposes version 1.2.0", () => {
      expect(
        PRIVATE_HISTORY_SESSION_VERSION
      ).toBe("1.2.0");
    });

    test("rejects missing Chat Controller", () => {
      expect(() =>
        createPrivateHistorySession()
      ).toThrow(TypeError);
    });

    test("exposes lifecycle methods", () => {
      setupSession();

      for (const method of [
        "start",
        "stop",
        "refresh",
        "destroy",
        "getCurrentUserId",
        "isStarted"
      ]) {
        expect(
          typeof session[method]
        ).toBe("function");
      }
    });

  }
);

/* ============================================
   2. AUTHENTICATION
============================================ */

describe(
  "XSUS Private History — Authentication",
  () => {

    test("starts and subscribes to auth changes", () => {
      setupSession();

      expect(session.start()).toBe(true);

      expect(
        mocks.onAuthStateChange
      ).toHaveBeenCalledTimes(1);

      expect(
        session.isStarted()
      ).toBe(true);
    });

    test("does not start twice", () => {
      setupSession();

      expect(session.start()).toBe(true);
      expect(session.start()).toBe(false);

      expect(
        mocks.onAuthStateChange
      ).toHaveBeenCalledTimes(1);
    });

    test("does not load private data when signed out", async () => {
      setAuthenticatedUser(null);

      setupSession();
      session.start();

      await flushAsync();

      expect(
        mocks.loadMyConversations
      ).not.toHaveBeenCalled();

      expect(
        chatController.hydrateHistory
      ).not.toHaveBeenCalled();

      expect(
        session.getCurrentUserId()
      ).toBeNull();
    });

  }
);

/* ============================================
   3. PRIVATE HISTORY LOADING
============================================ */

describe(
  "XSUS Private History — Loading",
  () => {

    test("loads conversations and messages", async () => {
      setupSession();
      session.start();

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
        chatController.hydrateHistory
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
    });

    test("rechecks identity before hydration", async () => {
      setupSession();
      session.start();

      await flushAsync();

      expect(
        mocks.getUser.mock.calls.length
      ).toBeGreaterThanOrEqual(2);

      expect(
        session.getCurrentUserId()
      ).toBe(USER_A);
    });

    test("handles database loading errors", async () => {
      mocks.loadMyConversations
        .mockRejectedValue(
          new Error("Database unavailable")
        );

      setupSession();
      session.start();

      await flushAsync();

      expect(
        onError
      ).toHaveBeenCalled();

      expect(
        chatController.hydrateHistory
      ).not.toHaveBeenCalled();

      expect(
        session.getCurrentUserId()
      ).toBe(USER_A);
    });

  }
);

/* ============================================
   4. IDENTITY ISOLATION
============================================ */

describe(
  "XSUS Private History — Identity Isolation",
  () => {

    test("clears history on sign out", async () => {
      setupSession();
      session.start();

      await flushAsync();

      chatController.clearHistory
        .mockClear();

      emitAuth("SIGNED_OUT");

      expect(
        chatController.clearHistory
      ).toHaveBeenCalled();

      expect(
        session.getCurrentUserId()
      ).toBeNull();
    });

    test("clears old history when account changes", async () => {
      setupSession();
      session.start();

      await flushAsync();

      chatController.clearHistory
        .mockClear();

      setAuthenticatedUser(USER_B);

      emitAuth("SIGNED_IN", USER_B);

      await flushAsync();

      expect(
        chatController.clearHistory
      ).toHaveBeenCalled();

      expect(
        session.getCurrentUserId()
      ).toBe(USER_B);
    });

    test("does not reload for a normal token refresh", async () => {
      setupSession();
      session.start();

      await flushAsync();

      mocks.loadMyConversations
        .mockClear();

      emitAuth(
        "TOKEN_REFRESHED",
        USER_A
      );

      await flushAsync();

      expect(
        mocks.loadMyConversations
      ).not.toHaveBeenCalled();
    });

  }
);

/* ============================================
   5. ASYNCHRONOUS RACE PROTECTION
============================================ */

describe(
  "XSUS Private History — Race Protection",
  () => {

    test("ignores delayed history after sign out", async () => {
      const deferred = createDeferred();

      mocks.loadMyConversations
        .mockReturnValue(deferred.promise);

      setupSession();
      session.start();

      await flushAsync();

      emitAuth("SIGNED_OUT");

      deferred.resolve([
        makeConversation()
      ]);

      await flushAsync();

      expect(
        chatController.hydrateHistory
      ).not.toHaveBeenCalled();

      expect(
        session.getCurrentUserId()
      ).toBeNull();
    });

    test("ignores delayed history after stop", async () => {
      const deferred = createDeferred();

      mocks.loadMyConversations
        .mockReturnValue(deferred.promise);

      setupSession();
      session.start();

      await flushAsync();

      session.stop();

      deferred.resolve([
        makeConversation()
      ]);

      await flushAsync();

      expect(
        chatController.hydrateHistory
      ).not.toHaveBeenCalled();
    });

    test("rejects identity change during loading", async () => {
      const deferred = createDeferred();

      mocks.loadMyMessages
        .mockReturnValue(deferred.promise);

      setupSession();
      session.start();

      await flushAsync();

      setAuthenticatedUser(USER_B);

      deferred.resolve([
        makeMessage()
      ]);

      await flushAsync();

      expect(
        chatController.hydrateHistory
      ).not.toHaveBeenCalled();

      expect(
        session.getCurrentUserId()
      ).toBeNull();
    });

  }
);

/* ============================================
   6. LIFECYCLE CLEANUP
============================================ */

describe(
  "XSUS Private History — Lifecycle",
  () => {

    test("unsubscribes on stop", () => {
      setupSession();
      session.start();

      expect(session.stop()).toBe(true);

      expect(
        mocks.unsubscribe
      ).toHaveBeenCalledTimes(1);

      expect(
        session.isStarted()
      ).toBe(false);
    });

    test("prevents restarting after destruction", () => {
      setupSession();
      session.start();

      session.destroy();

      expect(
        session.start()
      ).toBe(false);

      expect(
        session.isStarted()
      ).toBe(false);
    });

    test("does not hydrate after destruction", async () => {
      const deferred = createDeferred();

      mocks.loadMyConversations
        .mockReturnValue(deferred.promise);

      setupSession();
      session.start();

      await flushAsync();

      session.destroy();

      deferred.resolve([
        makeConversation()
      ]);

      await flushAsync();

      expect(
        chatController.hydrateHistory
      ).not.toHaveBeenCalled();
    });

  }
);
