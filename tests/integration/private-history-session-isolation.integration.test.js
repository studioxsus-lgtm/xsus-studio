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
  deferred: null
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
  loadMyMessages: vi.fn(async id => mock.messages.get(id) ?? [])
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
