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
