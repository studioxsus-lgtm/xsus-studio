
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
  callback: null
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
  createPrivateHistorySession,
  PRIVATE_HISTORY_SESSION_VERSION
} from "../../assets/js/xsus-ai/adapters/xsus-private-history-session.js";

/* ============================================
   TEST DATA
============================================ */

const A =
  "11111111-1111-4111-8111-111111111111";

const B =
  "22222222-2222-4222-8222-222222222222";

const C =
  "33333333-3333-4333-8333-333333333333";

const conv = id => ({
  id,
  title: "Private conversation",
  createdAt: "2026-11-09T12:00:00.000Z",
  updatedAt: "2026-11-09T12:00:00.000Z"
});

const message = id => ({
  id: "123e4567-e89b-42d3-a456-426614174000",
  conversationId: id,
  role: "user",
  content: "Private",
  createdAt: "2026-11-09T12:00:00.000Z"
});

/* ============================================
   ASYNC UTILITIES
============================================ */

const deferred = () => {
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
};

const tick = async () => {
  for (let i = 0; i < 25; i++) {
    await Promise.resolve();
  }
};

/* ============================================
   TEST SETUP
============================================ */

let userId;
let session;
let chat;
let statuses;
let errors;

function auth(event, id = userId) {
  mocks.callback(
    event,
    id
      ? { user: { id } }
      : null
  );
}

function setup() {
  chat = {
    clearHistory: vi.fn(),

    hydrateHistory: vi.fn(
      () => true
    ),

    getConversations: vi.fn(
      () => []
    ),

    getMessages: vi.fn(
      () => []
    )
  };

  statuses = [];
  errors = [];

  session = createPrivateHistorySession({
    chatController: chat,

    onStatusChange: value => {
      statuses.push(value.status);
    },

    onError: error => {
      errors.push(error);
    }
  });

  return session;
}

beforeEach(() => {
  vi.clearAllMocks();

  userId = A;
  mocks.callback = null;

  mocks.getUser.mockImplementation(
    async () => ({
      data: {
        user: userId
          ? { id: userId }
          : null
      },
      error: null
    })
  );

  mocks.onAuthStateChange.mockImplementation(
    callback => {
      mocks.callback = callback;

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
      conv(C)
    ]);

  mocks.loadMyMessages
    .mockResolvedValue([
      message(C)
    ]);
});

afterEach(() => {
  session?.destroy();
  session = null;
});

/* ============================================
   REGRESSION TESTS
============================================ */

describe(
  "XSUS private history v1.2.0 — regression",
  () => {

    /* TEST 1 */

    test(
      "version and public lifecycle API",
      () => {
        setup();

        expect(
          PRIVATE_HISTORY_SESSION_VERSION
        ).toBe("1.2.0");

        for (const key of [
          "start",
          "stop",
          "refresh",
          "destroy",
          "getCurrentUserId",
          "isStarted"
        ]) {
          expect(
            typeof session[key]
          ).toBe("function");
        }
      }
    );

    /* TEST 2 */

    test(
      "loads authenticated conversations and messages",
      async () => {
        setup();
        session.start();

        await tick();

        expect(
          chat.hydrateHistory
        ).toHaveBeenCalledWith({
          conversations: [
            conv(C)
          ],
          messagesByConversation: {
            [C]: [
              message(C)
            ]
          }
        });

        expect(
          session.getCurrentUserId()
        ).toBe(A);
      }
    );

    /* TEST 3 */

    test(
      "concurrent refresh calls share the same promise",
      async () => {
        const wait = deferred();

        mocks.loadMyConversations
          .mockReturnValue(
            wait.promise
          );

        setup();
        session.start();

        await tick();

        const first =
          session.refresh();

        const second =
          session.refresh();

        expect(first).toBe(second);

        wait.resolve([
          conv(C)
        ]);

        await tick();

        expect(
          await first
        ).toBe(true);

        expect(
          mocks.loadMyConversations
        ).toHaveBeenCalledTimes(1);
      }
    );

    /* TEST 4 */

    test(
      "repeated SIGNED_IN does not overwrite already loaded history",
      async () => {
        setup();
        session.start();

        await tick();

        chat.hydrateHistory.mockClear();
        mocks.loadMyConversations.mockClear();

        auth("SIGNED_IN", A);

        await tick();

        expect(
          chat.hydrateHistory
        ).not.toHaveBeenCalled();

        expect(
          mocks.loadMyConversations
        ).not.toHaveBeenCalled();
      }
    );

    /* TEST 5 */

    test(
      "TOKEN_REFRESHED for same user does not reload history",
      async () => {
        setup();
        session.start();

        await tick();

        mocks.loadMyConversations.mockClear();

        auth(
          "TOKEN_REFRESHED",
          A
        );

        await tick();

        expect(
          mocks.loadMyConversations
        ).not.toHaveBeenCalled();
      }
    );

    /* TEST 6 */

    test(
      "SIGNED_OUT clears memory and prevents late hydration",
      async () => {
        const wait = deferred();

        mocks.loadMyConversations
          .mockReturnValue(
            wait.promise
          );

        setup();
        session.start();

        await tick();

        auth(
          "SIGNED_OUT",
          null
        );

        wait.resolve([
          conv(C)
        ]);

        await tick();

        expect(
          chat.clearHistory
        ).toHaveBeenCalled();

        expect(
          chat.hydrateHistory
        ).not.toHaveBeenCalled();

        expect(
          session.getCurrentUserId()
        ).toBeNull();
      }
    );

    /* TEST 7 */

    test(
      "stale rejected request cannot clear new account",
      async () => {
        const old = deferred();

        mocks.loadMyConversations
          .mockReturnValueOnce(
            old.promise
          )
          .mockResolvedValue([
            conv(C)
          ]);

        setup();
        session.start();

        await tick();

        userId = B;

        auth(
          "SIGNED_IN",
          B
        );

        await tick();

        expect(
          session.getCurrentUserId()
        ).toBe(B);

        const clearsBefore =
          chat.clearHistory.mock.calls.length;

        old.reject(
          new Error(
            "Old account failed"
          )
        );

        await tick();

        expect(
          chat.clearHistory
        ).toHaveBeenCalledTimes(
          clearsBefore
        );

        expect(
          session.getCurrentUserId()
        ).toBe(B);

        expect(errors).toHaveLength(0);
      }
    );

    /* TEST 8 */

    test(
      "force refresh supersedes pending request",
      async () => {
        const old = deferred();

        mocks.loadMyConversations
          .mockReturnValueOnce(
            old.promise
          )
          .mockResolvedValue([
            conv(C)
          ]);

        setup();
        session.start();

        await tick();

        const newer =
          session.refresh({
            force: true
          });

        await tick();

        old.resolve([
          conv(C)
        ]);

        await tick();

        expect(
          await newer
        ).toBe(true);

        expect(
          chat.hydrateHistory
        ).toHaveBeenCalledTimes(1);
      }
    );

    /* TEST 9 */

    test(
      "local conversation changes during load block hydration",
      async () => {
        const wait = deferred();

        mocks.loadMyConversations
          .mockReturnValue(
            wait.promise
          );

        setup();
        session.start();

        await tick();

        chat.getConversations
          .mockReturnValue([
            {
              id: C,
              title:
                "Local unsaved chat"
            }
          ]);

        wait.resolve([
          conv(C)
        ]);

        await tick();

        expect(
          chat.hydrateHistory
        ).not.toHaveBeenCalled();

        expect(
          statuses
        ).toContain(
          "local-changes"
        );
      }
    );

    /* TEST 10 */

    test(
      "busy chat controller does not mark history loaded",
      async () => {
        setup();

        chat.hydrateHistory
          .mockReturnValueOnce(false)
          .mockReturnValue(true);

        session.start();

        await tick();

        expect(
          statuses
        ).toContain("busy");

        expect(
          await session.refresh()
        ).toBe(true);

        expect(
          chat.hydrateHistory
        ).toHaveBeenCalledTimes(2);
      }
    );

    /* TEST 11 */

    test(
      "stop unsubscribes and prevents delayed hydration",
      async () => {
        const wait = deferred();

        mocks.loadMyConversations
          .mockReturnValue(
            wait.promise
          );

        setup();
        session.start();

        await tick();

        session.stop();

        wait.resolve([
          conv(C)
        ]);

        await tick();

        expect(
          mocks.unsubscribe
        ).toHaveBeenCalledTimes(1);

        expect(
          chat.hydrateHistory
        ).not.toHaveBeenCalled();

        expect(
          session.isStarted()
        ).toBe(false);
      }
    );

    /* TEST 12 */

    test(
      "destroy prevents restart",
      () => {
        setup();
        session.start();

        session.destroy();

        expect(
          session.start()
        ).toBe(false);

        expect(
          session.isStarted()
        ).toBe(false);
      }
    );

    /* TEST 13 */

    test(
      "signed-out session does not query private history",
      async () => {
        userId = null;

        setup();
        session.start();

        await tick();

        expect(
          mocks.loadMyConversations
        ).not.toHaveBeenCalled();

        expect(
          chat.hydrateHistory
        ).not.toHaveBeenCalled();
      }
    );

    /* TEST 14 */

    test(
      "unexpected database failure reports error and blocks hydration",
      async () => {
        mocks.loadMyConversations
          .mockRejectedValue(
            new Error(
              "Database unavailable"
            )
          );

        setup();
        session.start();

        await tick();

        expect(errors).toHaveLength(1);

        expect(
          chat.hydrateHistory
        ).not.toHaveBeenCalled();
      }
    );

  }
);
