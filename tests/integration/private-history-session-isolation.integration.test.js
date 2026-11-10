/**
 * XSUS AI V3 — read-only private history session isolation.
 * Mocked Supabase/auth and history adapter; no database writes.
 */
import { describe, expect, test, vi, beforeEach } from "vitest";

const mock = vi.hoisted(() => ({
  userId: "11111111-1111-4111-8111-111111111111",
  authListener: null,
  conversations: [],
  messages: new Map(),
  deferred: null,
  deferredMessages: null
}));

vi.mock("../../services/supabase-client.js", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mock.userId ? { id: mock.userId } : null },
        error: null
      })),
      onAuthStateChange: vi.fn(listener => {
        mock.authListener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      })
    }
  }
}));

vi.mock("../../assets/js/xsus-ai/adapters/xsus-chat-history-adapter.js", () => ({
  loadMyConversations: vi.fn(async () => {
    if (mock.deferred) return mock.deferred.promise;
    return mock.conversations;
  }),
  loadMyMessages: vi.fn(async id => {
    if (mock.deferredMessages?.id === id) return mock.deferredMessages.promise;
    return mock.messages.get(id) ?? [];
  })
}));

import { createPrivateHistorySession } from "../../assets/js/xsus-ai/adapters/xsus-private-history-session.js";

const a = "22222222-2222-4222-8222-222222222222";
const b = "33333333-3333-4333-8333-333333333333";
const record = id => ({
  id, title: "Test", createdAt: "2026-11-10T10:45:00Z",
  updatedAt: "2026-11-10T10:45:00Z"
});
const assistant = id => ({
  id: "44444444-4444-4444-8444-444444444444",
  conversationId: id, role: "assistant", content: "Persisted answer",
  createdAt: "2026-11-10T10:45:01Z"
});
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const chat = () => {
  const state = { conversations: [], messagesByConversation: {} };
  return {
    state,
    clearHistory: vi.fn(() => {
      state.conversations = [];
      state.messagesByConversation = {};
    }),
    hydrateHistory: vi.fn(({ conversations, messagesByConversation }) => {
      state.conversations = conversations;
      state.messagesByConversation = messagesByConversation;
      return true;
    }),
    getConversations: () => state.conversations,
    getMessages: () => []
  };
};

beforeEach(() => {
  mock.userId = "11111111-1111-4111-8111-111111111111";
  mock.authListener = null;
  mock.conversations = [record(a)];
  mock.messages = new Map([[a, [assistant(a)]]]);
  mock.deferred = null;
  mock.deferredMessages = null;
});

describe("Private history session account and refresh isolation (mocked)", () => {
  test("loads saved assistant message on a new read-only session", async () => {
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a][0].role).toBe("assistant");
    expect(controller.state.messagesByConversation[a][0].content).toBe("Persisted answer");
    session.destroy();
  });

  test("reloading the same account does not duplicate saved assistant messages", async () => {
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(await session.refresh({ force: true })).toBe(true);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Persisted answer");
    session.destroy();
  });

  test("refresh preserves messages in their own conversations", async () => {
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, []]]);
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b]).toEqual([]);
    expect(controller.state.messagesByConversation[a][0].conversationId).toBe(a);
    session.destroy();
  });

  test("a fresh session preserves chronological user/assistant message order", async () => {
    const first = {
      id: "55555555-5555-4555-8555-555555555555",
      conversationId: a, role: "user", content: "Question",
      createdAt: "2026-11-10T10:45:00Z"
    };
    const second = assistant(a);
    mock.messages = new Map([[a, [first, second]]]);
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a].map(m => m.role)).toEqual([
      "user", "assistant"
    ]);
    expect(controller.state.messagesByConversation[a].map(m => m.content)).toEqual([
      "Question", "Persisted answer"
    ]);
    session.destroy();
  });

  test("repeated normal refresh does not rehydrate already loaded messages", async () => {
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    expect(await session.refresh()).toBe(true);
    const calls = controller.hydrateHistory.mock.calls.length;
    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(calls);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    session.destroy();
  });

  test("sign out clears messages without deleting database history", async () => {
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await session.refresh();
    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(mock.messages.get(a)).toHaveLength(1);
    session.destroy();
  });

  test("a stale pending read cannot restore messages after sign out", async () => {
    let resolve;
    mock.deferred = { promise: new Promise(r => { resolve = r; }) };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await tick();
    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    resolve([record(a)]);
    await tick();
    expect(controller.hydrateHistory).not.toHaveBeenCalled();
    expect(controller.state.conversations).toEqual([]);
    session.destroy();
  });

  test("late account A history cannot overwrite already hydrated account B", async () => {
    let resolveOld;
    mock.deferred = { promise: new Promise(resolve => { resolveOld = resolve; }) };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await tick();

    const accountB = "99999999-9999-4999-8999-999999999999";
    mock.userId = accountB;
    mock.deferred = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    mock.authListener("SIGNED_IN", { user: { id: accountB } });
    await tick();
    expect(await session.refresh()).toBe(true);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;

    resolveOld([record(a)]);
    await tick();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("late account A failure cannot erase hydrated account B history", async () => {
    let rejectOld;
    mock.deferred = { promise: new Promise((_resolve, reject) => { rejectOld = reject; }) };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    session.start();
    await tick();

    const accountB = "99999999-9999-4999-8999-999999999999";
    mock.userId = accountB;
    mock.deferred = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    mock.authListener("SIGNED_IN", { user: { id: accountB } });
    await tick();
    expect(await session.refresh()).toBe(true);
    const clearsAfterB = controller.clearHistory.mock.calls.length;
    const hydrationsAfterB = controller.hydrateHistory.mock.calls.length;

    rejectOld(new Error("Account A history request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearsAfterB);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationsAfterB);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("forced refresh wins over a slower previous refresh for the same account", async () => {
    let resolveOld;
    mock.deferred = { promise: new Promise(resolve => { resolveOld = resolve; }) };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await tick();

    mock.deferred = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    const latest = session.refresh({ force: true });
    expect(await latest).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);

    resolveOld([record(a)]);
    await tick();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    session.destroy();
  });

  test("stopping a session prevents a late history response from restoring messages", async () => {
    let resolveOld;
    mock.deferred = { promise: new Promise(resolve => { resolveOld = resolve; }) };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await tick();

    expect(session.stop()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    resolveOld([record(a)]);
    await tick();

    expect(session.isStarted()).toBe(false);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    session.destroy();
  });

  test("destroying a session prevents a late history response from restoring messages", async () => {
    let resolveOld;
    mock.deferred = { promise: new Promise(resolve => { resolveOld = resolve; }) };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await tick();

    session.destroy();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    resolveOld([record(a)]);
    await tick();

    expect(session.isStarted()).toBe(false);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.start()).toBe(false);
  });

  test("restart loads the current account without restoring a pre-stop response", async () => {
    let resolveOld;
    mock.deferred = { promise: new Promise(resolve => { resolveOld = resolve; }) };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    expect(session.start()).toBe(true);
    await tick();

    expect(session.stop()).toBe(true);
    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferred = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);

    resolveOld([record(a)]);
    await tick();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("token refresh keeps hydrated history without another database read", async () => {
    const controller = chat();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    session.start();
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const historyBefore = JSON.stringify(controller.state);

    mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    await tick();

    expect(statuses).toContain("token-refreshed");
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(JSON.stringify(controller.state)).toBe(historyBefore);
    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    session.destroy();
  });

  test("token refresh with a new identity clears old messages before loading the new account", async () => {
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);

    const accountB = "99999999-9999-4999-8999-999999999999";
    mock.userId = accountB;
    let resolveNew;
    mock.deferred = { promise: new Promise(resolve => { resolveNew = resolve; }) };
    mock.messages = new Map([[b, [assistant(b)]]]);
    mock.authListener("TOKEN_REFRESHED", { user: { id: accountB } });

    expect(session.getCurrentUserId()).toBe(accountB);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();

    await tick();
    resolveNew([record(b)]);
    await tick();
    expect(await session.refresh()).toBe(true);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("late account A message response cannot overwrite hydrated account B", async () => {
    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await tick();

    const accountB = "99999999-9999-4999-8999-999999999999";
    mock.userId = accountB;
    mock.deferredMessages = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    mock.authListener("SIGNED_IN", { user: { id: accountB } });
    await tick();
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);

    resolveOldMessages([assistant(a)]);
    await tick();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("late account A message failure cannot clear hydrated account B", async () => {
    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    session.start();
    await tick();

    const accountB = "99999999-9999-4999-8999-999999999999";
    mock.userId = accountB;
    mock.deferredMessages = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    mock.authListener("SIGNED_IN", { user: { id: accountB } });
    await tick();
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;

    rejectOldMessages(new Error("Old account message fetch failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("late message rejection from a superseded forced refresh cannot erase current history", async () => {
    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    session.start();
    await tick();

    mock.deferredMessages = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    expect(await session.refresh({ force: true })).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);

    rejectOldMessages(new Error("Superseded message request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("late message response after sign-out cannot restore private history", async () => {
    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await tick();

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    resolveOldMessages([assistant(a)]);
    await tick();

    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.getCurrentUserId()).toBe(null);
    session.destroy();
  });

  test("late message rejection after sign-out cannot affect the closed private session", async () => {
    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    session.start();
    await tick();

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    rejectOldMessages(new Error("Signed-out account message request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.getCurrentUserId()).toBe(null);
    session.destroy();
  });

  test("late message response after stop cannot restore private history", async () => {
    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await tick();

    expect(session.stop()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    resolveOldMessages([assistant(a)]);
    await tick();

    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.isStarted()).toBe(false);
    session.destroy();
  });

  test("late message rejection after stop cannot affect the inactive private session", async () => {
    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    session.start();
    await tick();

    expect(session.stop()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    rejectOldMessages(new Error("Stopped session message request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.isStarted()).toBe(false);
    session.destroy();
  });

  test("restart ignores a pre-stop message response after a different account loads", async () => {
    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    expect(session.start()).toBe(true);
    await tick();

    expect(session.stop()).toBe(true);
    const accountB = "99999999-9999-4999-8999-999999999999";
    mock.userId = accountB;
    mock.deferredMessages = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);

    resolveOldMessages([assistant(a)]);
    await tick();

    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    expect(session.getCurrentUserId()).toBe(accountB);
    session.destroy();
  });

  test("restart ignores a pre-stop message rejection after another account loads", async () => {
    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    expect(session.stop()).toBe(true);
    const accountB = "99999999-9999-4999-8999-999999999999";
    mock.userId = accountB;
    mock.deferredMessages = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);

    rejectOldMessages(new Error("Previous session message fetch failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    expect(session.getCurrentUserId()).toBe(accountB);
    session.destroy();
  });

  test("late message response after destroy cannot restore private history", async () => {
    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    expect(session.start()).toBe(true);
    await tick();

    session.destroy();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    resolveOldMessages([assistant(a)]);
    await tick();

    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.isStarted()).toBe(false);
    expect(session.start()).toBe(false);
  });

  test("late message rejection after destroy cannot affect the destroyed private session", async () => {
    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    session.destroy();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    rejectOldMessages(new Error("Destroyed session message request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.isStarted()).toBe(false);
    expect(session.start()).toBe(false);
  });

  test("late conversation rejection after forced refresh cannot clear current history", async () => {
    let rejectOldConversations;
    mock.deferred = {
      promise: new Promise((_resolve, reject) => { rejectOldConversations = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    session.start();
    await tick();

    mock.deferred = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    expect(await session.refresh({ force: true })).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);

    rejectOldConversations(new Error("Superseded conversation request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("concurrent normal refresh calls share one pending history load", async () => {
    let resolveConversations;
    mock.deferred = {
      promise: new Promise(resolve => { resolveConversations = resolve; })
    };
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    expect(session.start()).toBe(true);
    await tick();

    const first = session.refresh();
    const second = session.refresh();
    expect(first).toBe(second);
    expect(controller.hydrateHistory).not.toHaveBeenCalled();

    resolveConversations([record(a)]);
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    session.destroy();
  });

  test("failed history load can retry successfully without duplicate conversations", async () => {
    let rejectFirst;
    mock.deferred = {
      promise: new Promise((_resolve, reject) => { rejectFirst = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    const first = session.refresh();
    rejectFirst(new Error("Temporary history outage"));
    expect(await first).toBe(false);
    await tick();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations).toEqual([]);

    mock.deferred = null;
    expect(await session.refresh()).toBe(true);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);

    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    session.destroy();
  });

  test("failed message load can retry and hydrate complete history only once", async () => {
    let rejectFirstMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectFirstMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    const first = session.refresh();
    rejectFirstMessages(new Error("Temporary message outage"));
    expect(await first).toBe(false);
    await tick();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.hydrateHistory).not.toHaveBeenCalled();
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.deferredMessages = null;
    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].role).toBe("assistant");

    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    session.destroy();
  });

  test("late message rejection after forced refresh cannot erase newly hydrated history", async () => {
    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    mock.deferredMessages = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    expect(await session.refresh({ force: true })).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);

    rejectOldMessages(new Error("Superseded message request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);
    session.destroy();
  });

  test("second conversation message failure retries without partial history hydration", async () => {
    let rejectSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    const first = session.refresh();
    rejectSecondMessages(new Error("Second conversation message load failed"));
    expect(await first).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.hydrateHistory).not.toHaveBeenCalled();
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.deferredMessages = null;
    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a, b]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].conversationId).toBe(a);
    expect(controller.state.messagesByConversation[b][0].conversationId).toBe(b);

    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    session.destroy();
  });

  test("late second-conversation message response cannot replace recovered history", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    mock.deferredMessages = null;
    expect(await session.refresh({ force: true })).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a, b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Persisted answer");

    resolveOldSecondMessages([{ ...assistant(b), content: "Outdated answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a, b]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Persisted answer");
    session.destroy();
  });

  test("late second-conversation message rejection cannot clear recovered history", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    mock.deferredMessages = null;
    expect(await session.refresh({ force: true })).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a, b]);

    rejectOldSecondMessages(new Error("Superseded second-conversation message load failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a, b]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Persisted answer");
    expect(controller.state.messagesByConversation[b][0].content).toBe("Persisted answer");
    session.destroy();
  });

  test("late second-conversation response from previous account cannot hydrate new account", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Account B answer" }]]]);
    mock.authListener("SIGNED_IN", { user: { id: mock.userId } });
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Account B answer");

    resolveOldSecondMessages([{ ...assistant(b), content: "Account A late answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Account B answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("late second-conversation rejection from previous account cannot clear new account", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Account B answer" }]]]);
    mock.authListener("SIGNED_IN", { user: { id: mock.userId } });
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Account B answer");

    rejectOldSecondMessages(new Error("Previous account second-conversation request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Account B answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("late second-conversation response after sign-out cannot restore private history", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    resolveOldSecondMessages([{ ...assistant(b), content: "Late signed-out answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    session.destroy();
  });

  test("late second-conversation rejection after sign-out cannot affect private history", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    rejectOldSecondMessages(new Error("Signed-out second-conversation request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    session.destroy();
  });

  test("late second-conversation response after stop cannot restore private history", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    session.stop();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    resolveOldSecondMessages([{ ...assistant(b), content: "Late stopped-session answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.isStarted()).toBe(false);
    session.destroy();
  });

  test("late second-conversation rejection after stop cannot affect private history", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    session.stop();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    rejectOldSecondMessages(new Error("Stopped session second-conversation request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.isStarted()).toBe(false);
    session.destroy();
  });

  test("late second-conversation response after destroy cannot restore private history", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    session.destroy();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    resolveOldSecondMessages([{ ...assistant(b), content: "Late destroyed-session answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.isStarted()).toBe(false);
    expect(session.start()).toBe(false);
  });

  test("late second-conversation rejection after destroy cannot affect private history", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    session.destroy();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    rejectOldSecondMessages(new Error("Destroyed session second-conversation request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.isStarted()).toBe(false);
    expect(session.start()).toBe(false);
  });

  test("late second-conversation response from stopped session cannot overwrite restarted account", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    session.stop();
    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Restarted account answer" }]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Restarted account answer");

    resolveOldSecondMessages([{ ...assistant(b), content: "Stopped account late answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Restarted account answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    expect(session.isStarted()).toBe(true);
    session.destroy();
  });

  test("late second-conversation rejection from stopped session cannot affect restarted account", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    session.stop();
    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Restarted account answer" }]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Restarted account answer");

    rejectOldSecondMessages(new Error("Stopped account second-conversation request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Restarted account answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    expect(session.isStarted()).toBe(true);
    session.destroy();
  });

  test("late second-conversation response after token identity rotation cannot overwrite new account", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Rotated account answer" }]]]);
    mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(statuses).toContain("token-refreshed");
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Rotated account answer");

    resolveOldSecondMessages([{ ...assistant(b), content: "Previous token account answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Rotated account answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("late second-conversation rejection after token identity rotation cannot clear new account", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Rotated account answer" }]]]);
    mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(statuses).toContain("token-refreshed");
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Rotated account answer");

    rejectOldSecondMessages(new Error("Previous token account message request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Rotated account answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("same-account token refresh preserves pending multi-conversation hydration", async () => {
    let resolveSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveSecondMessages = resolve; })
    };
    const controller = chat();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    const pending = session.refresh();
    const clearCount = controller.clearHistory.mock.calls.length;
    mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    expect(statuses).toContain("token-refreshed");
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).not.toHaveBeenCalled();

    const concurrent = session.refresh();
    expect(concurrent).toBe(pending);
    resolveSecondMessages([assistant(b)]);
    expect(await pending).toBe(true);
    expect(await concurrent).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a, b]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    session.destroy();
  });

  test("repeated same-account token refreshes preserve one pending history hydration", async () => {
    let resolveSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    const pending = session.refresh();
    const clearCount = controller.clearHistory.mock.calls.length;
    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    expect(statuses.filter(status => status === "token-refreshed")).toHaveLength(3);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).not.toHaveBeenCalled();

    const concurrent = session.refresh();
    expect(concurrent).toBe(pending);
    resolveSecondMessages([assistant(b)]);
    expect(await pending).toBe(true);
    expect(await concurrent).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a, b]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    session.destroy();
  });

  test("sign-out after repeated token refreshes blocks late multi-conversation hydration", async () => {
    let resolveSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    expect(statuses.filter(status => status === "token-refreshed")).toHaveLength(3);

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    resolveSecondMessages([{ ...assistant(b), content: "Late answer after sign-out" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    session.destroy();
  });

  test("sign-out after repeated token refreshes ignores late multi-conversation rejection", async () => {
    let rejectSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    expect(statuses.filter(status => status === "token-refreshed")).toHaveLength(3);

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    rejectSecondMessages(new Error("Late message request failed after sign-out"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    session.destroy();
  });

  test("late prior-account message response after token refresh sign-out and new sign-in cannot overwrite history", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const session = createPrivateHistorySession({ chatController: controller, onError });
    expect(session.start()).toBe(true);
    await tick();

    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    expect(controller.state.conversations).toEqual([]);

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "New account answer" }]]]);
    mock.authListener("SIGNED_IN", { user: { id: mock.userId } });
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("New account answer");

    resolveOldSecondMessages([{ ...assistant(b), content: "Old account late answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("New account answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("late prior-account message rejection after token refresh sign-out and new sign-in cannot clear history", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    expect(controller.state.conversations).toEqual([]);

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "New account answer" }]]]);
    mock.authListener("SIGNED_IN", { user: { id: mock.userId } });
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("New account answer");

    rejectOldSecondMessages(new Error("Old account message request failed after new sign-in"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("New account answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("late pre-stop messages after repeated token refreshes cannot overwrite restarted account", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    expect(statuses.filter(status => status === "token-refreshed")).toHaveLength(3);
    session.stop();

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Restarted account answer" }]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Restarted account answer");

    resolveOldSecondMessages([{ ...assistant(b), content: "Old session late answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Restarted account answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("late pre-stop message rejection after repeated token refreshes cannot clear restarted account", async () => {
    let rejectOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    expect(statuses.filter(status => status === "token-refreshed")).toHaveLength(3);
    session.stop();

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.deferredMessages = null;
    mock.conversations = [record(a)];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Restarted account answer" }]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Restarted account answer");

    rejectOldSecondMessages(new Error("Old session message request failed after restart"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Restarted account answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("late multi-conversation response after repeated token refreshes and destroy cannot restore history", async () => {
    let resolveSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    expect(statuses.filter(status => status === "token-refreshed")).toHaveLength(3);
    session.destroy();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    resolveSecondMessages([{ ...assistant(b), content: "Late answer after destroy" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.start()).toBe(false);
  });

  test("late multi-conversation rejection after repeated token refreshes and destroy cannot restore history", async () => {
    let rejectSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectSecondMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    for (let i = 0; i < 3; i++) {
      mock.authListener("TOKEN_REFRESHED", { user: { id: mock.userId } });
    }
    expect(statuses.filter(status => status === "token-refreshed")).toHaveLength(3);
    session.destroy();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    rejectSecondMessages(new Error("Late message request failed after destroy"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.start()).toBe(false);
  });

  test("late authentication events after destroy cannot restart private history", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const oldAuthListener = mock.authListener;
    expect(typeof oldAuthListener).toBe("function");

    session.destroy();
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(session.isStarted()).toBe(false);
    expect(session.getCurrentUserId()).toBeNull();
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.userId = "99999999-9999-4999-8999-999999999999";
    for (const event of ["TOKEN_REFRESHED", "SIGNED_IN", "INITIAL_SESSION", "USER_UPDATED", "SIGNED_OUT"]) {
      oldAuthListener(event, { user: { id: mock.userId } });
    }
    await tick();

    expect(await session.refresh()).toBe(false);
    expect(session.start()).toBe(false);
    expect(session.isStarted()).toBe(false);
    expect(session.getCurrentUserId()).toBeNull();
    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
  });

  test("late authentication events after stop cannot restore history before a clean restart", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const oldAuthListener = mock.authListener;
    expect(typeof oldAuthListener).toBe("function");

    expect(session.stop()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(session.isStarted()).toBe(false);
    expect(session.getCurrentUserId()).toBeNull();
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.userId = "99999999-9999-4999-8999-999999999999";
    for (const event of ["TOKEN_REFRESHED", "SIGNED_IN", "INITIAL_SESSION", "USER_UPDATED", "SIGNED_OUT"]) {
      oldAuthListener(event, { user: { id: mock.userId } });
    }
    await tick();

    expect(await session.refresh()).toBe(false);
    expect(session.isStarted()).toBe(false);
    expect(session.getCurrentUserId()).toBeNull();
    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [{ ...assistant(b), content: "Restarted session answer" }]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    expect(session.isStarted()).toBe(true);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Restarted session answer");
    session.destroy();
  });

  test("old auth subscription events after restart cannot affect the new private account", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const oldAuthListener = mock.authListener;
    expect(typeof oldAuthListener).toBe("function");
    expect(session.stop()).toBe(true);

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [{ ...assistant(b), content: "New session answer" }]]]);
    expect(session.start()).toBe(true);
    expect(mock.authListener).not.toBe(oldAuthListener);
    expect(await session.refresh()).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("New session answer");

    for (const event of ["SIGNED_OUT", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"]) {
      oldAuthListener(event, { user: { id: "11111111-1111-4111-8111-111111111111" } });
    }
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(session.isStarted()).toBe(true);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("New session answer");
    session.destroy();
  });

  test("old auth subscription events cannot interrupt pending hydration after restart", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const oldAuthListener = mock.authListener;
    expect(typeof oldAuthListener).toBe("function");
    expect(session.stop()).toBe(true);

    let resolveNewMessages;
    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveNewMessages = resolve; })
    };
    expect(session.start()).toBe(true);
    expect(mock.authListener).not.toBe(oldAuthListener);
    await tick();
    const pending = session.refresh();
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);

    for (const event of ["SIGNED_OUT", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"]) {
      oldAuthListener(event, { user: { id: "11111111-1111-4111-8111-111111111111" } });
    }
    await tick();

    expect(statuses).toHaveLength(statusCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(session.refresh()).toBe(pending);

    resolveNewMessages([{ ...assistant(b), content: "New session pending answer" }]);
    expect(await pending).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(2);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("New session pending answer");
    session.destroy();
  });

  test("stale auth events cannot mask a current history load failure after restart", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const oldAuthListener = mock.authListener;
    expect(session.stop()).toBe(true);

    let rejectNewMessages;
    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectNewMessages = reject; })
    };
    expect(session.start()).toBe(true);
    await tick();
    const pending = session.refresh();
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;

    for (const event of ["SIGNED_OUT", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"]) {
      oldAuthListener(event, { user: { id: "11111111-1111-4111-8111-111111111111" } });
    }
    await tick();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(session.refresh()).toBe(pending);

    rejectNewMessages(new Error("Current account message load failed"));
    expect(await pending).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("Current account message load failed");
    expect(statuses.at(-1)).toBe("error");
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(1);
    session.destroy();
  });

  test("retry after restarted account message failure hydrates only recovered account history", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    const oldAuthListener = mock.authListener;
    expect(session.stop()).toBe(true);

    let rejectNewMessages;
    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectNewMessages = reject; })
    };
    expect(session.start()).toBe(true);
    await tick();
    const failedLoad = session.refresh();
    for (const event of ["SIGNED_OUT", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "INITIAL_SESSION"]) {
      oldAuthListener(event, { user: { id: "11111111-1111-4111-8111-111111111111" } });
    }
    rejectNewMessages(new Error("Temporary current account failure"));
    expect(await failedLoad).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.deferredMessages = null;
    mock.messages = new Map([[b, [{ ...assistant(b), content: "Recovered account answer" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toBe("ready");
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Recovered account answer");
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    session.destroy();
  });

  test("late superseded message response cannot overwrite successfully recovered private history", async () => {
    let resolveOldMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    mock.deferredMessages = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [{ ...assistant(b), content: "Recovered answer" }]]]);
    expect(await session.refresh({ force: true })).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Recovered answer");

    resolveOldMessages([{ ...assistant(b), content: "Superseded answer" }]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Recovered answer");
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    session.destroy();
  });

  test("late superseded message rejection cannot clear successfully recovered private history", async () => {
    let rejectOldMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    mock.deferredMessages = null;
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [{ ...assistant(b), content: "Recovered answer" }]]]);
    expect(await session.refresh({ force: true })).toBe(true);
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Recovered answer");

    rejectOldMessages(new Error("Superseded message request failed"));
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Recovered answer");
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    session.destroy();
  });

  test("local conversation edits during pending multi-conversation load cannot be overwritten", async () => {
    let resolveSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    const localConversation = { ...record(a), title: "Locally edited conversation" };
    controller.state.conversations = [localConversation];
    controller.state.messagesByConversation = {
      [a]: [{ ...assistant(a), content: "Local unsaved answer" }]
    };
    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;

    resolveSecondMessages([assistant(b)]);
    await tick();

    expect(onError).not.toHaveBeenCalled();
    expect(statuses).toContain("local-changes");
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([localConversation]);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Local unsaved answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("forced refresh after local changes loads updated private history without duplicates", async () => {
    let resolveOldSecondMessages;
    mock.conversations = [record(a), record(b)];
    mock.messages = new Map([[a, [assistant(a)]], [b, [assistant(b)]]]);
    mock.deferredMessages = {
      id: b,
      promise: new Promise(resolve => { resolveOldSecondMessages = resolve; })
    };
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    await tick();

    controller.state.conversations = [{ ...record(a), title: "Local edit" }];
    controller.state.messagesByConversation = {
      [a]: [{ ...assistant(a), content: "Local draft" }]
    };
    resolveOldSecondMessages([assistant(b)]);
    await tick();

    expect(statuses).toContain("local-changes");
    expect(controller.state.messagesByConversation[a][0].content).toBe("Local draft");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();

    mock.deferredMessages = null;
    mock.conversations = [{ ...record(a), title: "Updated saved conversation" }];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Updated saved answer" }]]]);
    expect(await session.refresh({ force: true })).toBe(true);
    expect(onError).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toBe("ready");
    expect(controller.state.conversations).toHaveLength(1);
    expect(controller.state.conversations[0].id).toBe(a);
    expect(controller.state.conversations[0].title).toBe("Updated saved conversation");
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Updated saved answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();
    session.destroy();
  });

  test("failed forced refresh preserves edits made locally while request was pending", async () => {
    let rejectMessages;
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
    };
    const pending = session.refresh({ force: true });
    await tick();

    controller.state.conversations = [{ ...record(a), title: "Local draft title" }];
    controller.state.messagesByConversation = {
      [a]: [{ ...assistant(a), content: "Local draft answer" }]
    };
    const clearCount = controller.clearHistory.mock.calls.length;
    const hydrateCount = controller.hydrateHistory.mock.calls.length;

    rejectMessages(new Error("Temporary refresh failure"));
    expect(await pending).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("Temporary refresh failure");
    expect(statuses.at(-1)).toBe("local-changes");
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.state.conversations[0].title).toBe("Local draft title");
    expect(controller.state.messagesByConversation[a][0].content).toBe("Local draft answer");
    session.destroy();
  });

  test("retry after failed forced refresh recovers saved history without duplicating local edits", async () => {
    let rejectMessages;
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
    };
    const failedRefresh = session.refresh({ force: true });
    await tick();

    controller.state.conversations = [{ ...record(a), title: "Locally edited" }];
    controller.state.messagesByConversation = {
      [a]: [{ ...assistant(a), content: "Local pending draft" }]
    };
    rejectMessages(new Error("Temporary network failure"));
    expect(await failedRefresh).toBe(false);
    expect(statuses.at(-1)).toBe("local-changes");
    expect(controller.state.messagesByConversation[a][0].content).toBe("Local pending draft");
    expect(onError).toHaveBeenCalledTimes(1);

    mock.deferredMessages = null;
    mock.conversations = [{ ...record(a), title: "Saved after recovery" }];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Saved recovered answer" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(statuses.at(-1)).toBe("ready");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations).toHaveLength(1);
    expect(controller.state.conversations[0].title).toBe("Saved after recovery");
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Saved recovered answer");
    expect(controller.state.messagesByConversation[b]).toBeUndefined();

    const hydrationCount = controller.hydrateHistory.mock.calls.length;
    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrationCount);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    session.destroy();
  });

  test("retry after failed refresh with local edits hydrates saved history once", async () => {
    let rejectMessages;
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
    };
    const failed = session.refresh({ force: true });
    await tick();

    controller.state.conversations = [{ ...record(a), title: "Local unsaved title" }];
    controller.state.messagesByConversation = {
      [a]: [{ ...assistant(a), content: "Local unsaved answer" }]
    };
    rejectMessages(new Error("Temporary refresh failure"));
    expect(await failed).toBe(false);
    expect(statuses.at(-1)).toBe("local-changes");
    expect(controller.state.messagesByConversation[a][0].content).toBe("Local unsaved answer");
    expect(onError).toHaveBeenCalledTimes(1);

    mock.deferredMessages = null;
    mock.conversations = [{ ...record(a), title: "Saved updated title" }];
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Saved updated answer" }]]]);
    const hydratedBeforeRetry = controller.hydrateHistory.mock.calls.length;
    expect(await session.refresh({ force: true })).toBe(true);
    expect(statuses.at(-1)).toBe("ready");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydratedBeforeRetry + 1);
    expect(controller.state.conversations).toHaveLength(1);
    expect(controller.state.conversations[0].title).toBe("Saved updated title");
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Saved updated answer");

    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydratedBeforeRetry + 1);
    session.destroy();
  });

  test("failed forced refresh without local edits still clears stale private history", async () => {
    let rejectMessages;
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);

    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
    };
    const pending = session.refresh({ force: true });
    await tick();
    const clearCount = controller.clearHistory.mock.calls.length;

    rejectMessages(new Error("Private history unavailable"));
    expect(await pending).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("Private history unavailable");
    expect(statuses.at(-1)).toBe("error");
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount + 1);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered private answer" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(statuses.at(-1)).toBe("ready");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered private answer");
    session.destroy();
  });

  test("two consecutive private history failures recover with one successful hydration", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    for (const failureMessage of ["First temporary failure", "Second temporary failure"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const pending = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(failureMessage));
      expect(await pending).toBe(false);
      expect(statuses.at(-1)).toBe("error");
      expect(controller.state.conversations).toEqual([]);
      expect(controller.state.messagesByConversation).toEqual({});
    }
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls.map(([error]) => error.message)).toEqual([
      "First temporary failure",
      "Second temporary failure"
    ]);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered after two failures" }]]]);
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    expect(await session.refresh()).toBe(true);
    expect(statuses.at(-1)).toBe("ready");
    expect(onError).toHaveBeenCalledTimes(2);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount + 1);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered after two failures");

    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount + 1);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    session.destroy();
  });

  test("late superseded response after two failed refreshes cannot overwrite recovered history", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const staleLoad = session.refresh({ force: true });
    await tick();

    for (const message of ["First failed refresh", "Second failed refresh"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const failedLoad = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(message));
      expect(await failedLoad).toBe(false);
      expect(statuses.at(-1)).toBe("error");
    }
    expect(onError).toHaveBeenCalledTimes(2);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered answer after failures" }]]]);
    expect(await session.refresh()).toBe(true);
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered answer after failures");

    resolveOldMessages([{ ...assistant(a), content: "Obsolete response" }]);
    expect(await staleLoad).toBe(false);
    await tick();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered answer after failures");
    session.destroy();
  });

  test("late superseded rejection after two failed refreshes cannot clear recovered history", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const staleLoad = session.refresh({ force: true });
    await tick();

    for (const message of ["First failed refresh", "Second failed refresh"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const failedLoad = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(message));
      expect(await failedLoad).toBe(false);
      expect(statuses.at(-1)).toBe("error");
    }
    expect(onError).toHaveBeenCalledTimes(2);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered answer after failures" }]]]);
    expect(await session.refresh()).toBe(true);
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered answer after failures");

    rejectOldMessages(new Error("Obsolete request failure"));
    expect(await staleLoad).toBe(false);
    await tick();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations.map(item => item.id)).toEqual([a]);
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered answer after failures");
    expect(await session.refresh()).toBe(true);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    session.destroy();
  });

  test("sign-out after repeated failure recovery blocks late stale private messages", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const staleLoad = session.refresh({ force: true });
    await tick();

    for (const message of ["First failed refresh", "Second failed refresh"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const failedLoad = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(message));
      expect(await failedLoad).toBe(false);
    }
    expect(onError).toHaveBeenCalledTimes(2);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered answer" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered answer");

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    await tick();
    expect(statuses.at(-1)).toBe("signed-out");
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;

    resolveOldMessages([{ ...assistant(a), content: "Late obsolete answer" }]);
    expect(await staleLoad).toBe(false);
    await tick();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.getCurrentUserId()).toBeNull();
    session.destroy();
  });

  test("sign-out after repeated failure recovery ignores late stale private message rejection", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const staleLoad = session.refresh({ force: true });
    await tick();

    for (const message of ["First failed refresh", "Second failed refresh"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const failedLoad = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(message));
      expect(await failedLoad).toBe(false);
    }
    expect(onError).toHaveBeenCalledTimes(2);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered answer" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered answer");

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    await tick();
    expect(statuses.at(-1)).toBe("signed-out");
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;

    rejectOldMessages(new Error("Obsolete request rejected after sign-out"));
    expect(await staleLoad).toBe(false);
    await tick();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});
    expect(session.getCurrentUserId()).toBeNull();
    session.destroy();
  });

  test("late account A response after repeated failure recovery and account B sign-in stays isolated", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const staleLoad = session.refresh({ force: true });
    await tick();

    for (const message of ["First failed refresh", "Second failed refresh"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const failedLoad = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(message));
      expect(await failedLoad).toBe(false);
    }
    expect(onError).toHaveBeenCalledTimes(2);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered account A" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered account A");

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    await tick();
    expect(controller.state.conversations).toEqual([]);

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [{ ...assistant(b), content: "Account B answer" }]]]);
    mock.authListener("SIGNED_IN", { user: { id: mock.userId } });
    expect(await session.refresh()).toBe(true);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Account B answer");
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;

    resolveOldMessages([{ ...assistant(a), content: "Late account A answer" }]);
    expect(await staleLoad).toBe(false);
    await tick();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Account B answer");
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    session.destroy();
  });

  test("late account A rejection after repeated failure recovery and account B sign-in stays isolated", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const staleLoad = session.refresh({ force: true });
    await tick();

    for (const message of ["First failed refresh", "Second failed refresh"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const failedLoad = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(message));
      expect(await failedLoad).toBe(false);
    }
    expect(onError).toHaveBeenCalledTimes(2);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered account A" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered account A");

    mock.userId = null;
    mock.authListener("SIGNED_OUT", null);
    await tick();
    expect(controller.state.conversations).toEqual([]);

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [{ ...assistant(b), content: "Account B answer" }]]]);
    mock.authListener("SIGNED_IN", { user: { id: mock.userId } });
    expect(await session.refresh()).toBe(true);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Account B answer");
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;

    rejectOldMessages(new Error("Late account A request rejected"));
    expect(await staleLoad).toBe(false);
    await tick();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Account B answer");
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    session.destroy();
  });

  test("late account A response after repeated failures and stop restart cannot overwrite account B", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    let resolveOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise(resolve => { resolveOldMessages = resolve; })
    };
    const staleLoad = session.refresh({ force: true });
    await tick();

    for (const message of ["First failed refresh", "Second failed refresh"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const failedLoad = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(message));
      expect(await failedLoad).toBe(false);
    }
    expect(onError).toHaveBeenCalledTimes(2);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered account A" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered account A");

    session.stop();
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [{ ...assistant(b), content: "Account B after restart" }]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Account B after restart");
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;

    resolveOldMessages([{ ...assistant(a), content: "Late account A after stop" }]);
    expect(await staleLoad).toBe(false);
    await tick();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Account B after restart");
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    session.destroy();
  });

  test("late account A rejection after repeated failures and stop restart cannot clear account B", async () => {
    const controller = chat();
    const onError = vi.fn();
    const statuses = [];
    const session = createPrivateHistorySession({
      chatController: controller,
      onError,
      onStatusChange: ({ status }) => statuses.push(status)
    });
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);

    let rejectOldMessages;
    mock.deferredMessages = {
      id: a,
      promise: new Promise((_resolve, reject) => { rejectOldMessages = reject; })
    };
    const staleLoad = session.refresh({ force: true });
    await tick();

    for (const message of ["First failed refresh", "Second failed refresh"]) {
      let rejectMessages;
      mock.deferredMessages = {
        id: a,
        promise: new Promise((_resolve, reject) => { rejectMessages = reject; })
      };
      const failedLoad = session.refresh({ force: true });
      await tick();
      rejectMessages(new Error(message));
      expect(await failedLoad).toBe(false);
    }
    expect(onError).toHaveBeenCalledTimes(2);

    mock.deferredMessages = null;
    mock.messages = new Map([[a, [{ ...assistant(a), content: "Recovered account A" }]]]);
    expect(await session.refresh()).toBe(true);
    expect(controller.state.messagesByConversation[a][0].content).toBe("Recovered account A");

    session.stop();
    expect(controller.state.conversations).toEqual([]);
    expect(controller.state.messagesByConversation).toEqual({});

    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, [{ ...assistant(b), content: "Account B after restart" }]]]);
    expect(session.start()).toBe(true);
    expect(await session.refresh()).toBe(true);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Account B after restart");
    const hydrateCount = controller.hydrateHistory.mock.calls.length;
    const clearCount = controller.clearHistory.mock.calls.length;
    const statusCount = statuses.length;

    rejectOldMessages(new Error("Late account A rejected after stop"));
    expect(await staleLoad).toBe(false);
    await tick();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(statuses).toHaveLength(statusCount);
    expect(controller.hydrateHistory).toHaveBeenCalledTimes(hydrateCount);
    expect(controller.clearHistory).toHaveBeenCalledTimes(clearCount);
    expect(session.getCurrentUserId()).toBe(mock.userId);
    expect(controller.state.conversations.map(item => item.id)).toEqual([b]);
    expect(controller.state.messagesByConversation[b]).toHaveLength(1);
    expect(controller.state.messagesByConversation[b][0].content).toBe("Account B after restart");
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    session.destroy();
  });

  test("an identity switch clears previous account messages before new hydration", async () => {
    const controller = chat();
    const session = createPrivateHistorySession({ chatController: controller });
    session.start();
    await session.refresh();
    expect(controller.state.messagesByConversation[a]).toHaveLength(1);
    mock.userId = "99999999-9999-4999-8999-999999999999";
    mock.conversations = [record(b)];
    mock.messages = new Map([[b, []]]);
    mock.authListener("SIGNED_IN", { user: { id: mock.userId } });
    await tick();
    await session.refresh();
    expect(controller.state.messagesByConversation[a]).toBeUndefined();
    expect(controller.state.conversations.map(c => c.id)).toEqual([b]);
    session.destroy();
  });
});
