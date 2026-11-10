import { describe, it, expect, vi } from "vitest";
import { createPrivateReplyBoundary } from "../../assets/js/xsus-ai/adapters/xsus-private-reply-boundary.js";
import { createPrivateChatPersistence } from "../../assets/js/xsus-ai/adapters/xsus-private-chat-persistence.js";

const C = "33333333-3333-4333-8333-333333333333";
const O = "44444444-4444-4444-8444-444444444444";
const U = "55555555-5555-4555-8555-555555555555";
const A = "66666666-6666-4666-8666-666666666666";
const request = { conversationId: "local", messageId: "local-message", message: "Hello XSUS" };

function fixture() {
  const rows = [];
  let identity = "account-a";
  const supabase = { auth: { getSession: async () => ({
    data: { session: identity ? { user: { id: identity }, access_token: "jwt-" + identity } : null },
    error: null
  }) } };
  const createConversation = vi.fn(async () => ({ id: C }));
  const saveUserMessage = vi.fn(async ({ conversationId, operationId, content }) => {
    const found = rows.find(row => row.owner === identity && row.operationId === operationId && row.role === "user");
    if (found) return { id: found.id, conversationId, role: "user", content };
    rows.push({ owner: identity, id: U, conversationId, operationId, role: "user", content });
    return { id: U, conversationId, role: "user", content };
  });
  const persistence = createPrivateChatPersistence({
    createConversation, saveUserMessage, createOperationId: () => O
  });
  const fetchImpl = vi.fn(async (_url, options) => {
    const { conversationId, operationId, query } = JSON.parse(options.body);
    const owner = options.headers.Authorization.slice(7).replace("jwt-", "");
    if (owner !== identity) return { ok: false };
    if (!rows.some(row => row.owner === owner && row.conversationId === conversationId &&
      row.operationId === operationId && row.role === "user" && row.content === query)) {
      return { ok: false };
    }
    if (!rows.some(row => row.owner === owner && row.operationId === operationId && row.role === "assistant")) {
      rows.push({ owner, id: A, conversationId, operationId, role: "assistant", content: "Hello back" });
    }
    return { ok: true, json: async () => ({
      persisted: true, conversationId, operationId, answer: "Hello back"
    }) };
  });
  const boundary = createPrivateReplyBoundary({
    supabase, persistence, endpoint: "https://example.org/api/private-chat", fetchImpl
  });
  return {
    rows, boundary, persistence, createConversation, fetchImpl,
    setIdentity: value => { identity = value; },
    reload: () => rows.filter(row => row.owner === identity).map(row => ({
      id: row.id, conversationId: row.conversationId, role: row.role, content: row.content
    }))
  };
}

describe("XSUS private round trip and refresh simulation (opt-in, no production network)", () => {
  it("persists both roles and restores them from a fresh history read", async () => {
    const x = fixture();
    expect(await x.boundary.send(request)).toEqual({ answer: "Hello back", persisted: true });
    expect(x.reload().map(row => row.role)).toEqual(["user", "assistant"]);
    expect(x.reload().map(row => row.content)).toEqual(["Hello XSUS", "Hello back"]);
  });
  it("retry keeps a single persisted user and assistant message", async () => {
    const x = fixture();
    await x.boundary.send(request);
    await x.boundary.send(request);
    expect(x.rows).toHaveLength(2);
    expect(x.createConversation).toHaveBeenCalledTimes(1);
  });
  it("sign-out hides private history and rejects new sends", async () => {
    const x = fixture();
    await x.boundary.send(request);
    x.setIdentity(null);
    x.boundary.invalidate();
    expect(x.reload()).toEqual([]);
    await expect(x.boundary.send(request)).rejects.toThrow("Authentication required");
  });
  it("another account cannot see the first account's history", async () => {
    const x = fixture();
    await x.boundary.send(request);
    x.setIdentity("account-b");
    x.boundary.invalidate();
    expect(x.reload()).toEqual([]);
  });
  it("rejects a fabricated user receipt without contacting private server", async () => {
    const x = fixture();
    // Frozen persistence cannot be replaced; simulate malformed result with an isolated boundary.
    const bad = createPrivateReplyBoundary({
      supabase: { auth: { getSession: async () => ({
        data: { session: { user: { id: "a" }, access_token: "jwt-a" } }, error: null
      }) } },
      persistence: { saveWithReceipt: async () => ({
        conversationId: C, operationId: O, role: "assistant", content: request.message
      }), invalidate() {} },
      endpoint: "https://example.org/api/private-chat",
      fetchImpl: x.fetchImpl
    });
    await expect(bad.send(request)).rejects.toThrow("Invalid persisted user receipt");
    expect(x.fetchImpl).not.toHaveBeenCalled();
  });
});
