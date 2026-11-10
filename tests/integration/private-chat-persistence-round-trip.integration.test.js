import { describe, it, expect, vi } from "vitest";
import { createPrivateChatPersistenceBridge } from "../../src/server/private-chat-persistence-bridge.js";

const conversationId = "550e8400-e29b-41d4-a716-446655440001";
const operationId = "550e8400-e29b-41d4-a716-446655440002";
const request = { conversationId, operationId, query: "Hello XSUS" };

function environment() {
  let active = "account-a";
  const stored = new Map();
  const events = [];
  const supabase = { auth: { getSession: vi.fn(async () => ({
    data: { session: active ? { user: { id: active }, access_token: "token-" + active } : null },
    error: null
  })) } };
  const writeService = {
    save: vi.fn(async ({ conversationId, operationId, content }) => {
      if (!active) throw new Error("Authentication required.");
      events.push("user");
      const key = active + ":" + conversationId + ":" + operationId;
      const existing = stored.get(key);
      if (existing) {
        if (existing.content !== content) throw new Error("Conflicting operation.");
        return existing;
      }
      const saved = { id: operationId, conversationId, operationId, role: "user", content };
      stored.set(key, saved);
      return saved;
    }),
    invalidate: vi.fn()
  };
  const fetchImpl = vi.fn(async (_url, options) => {
    events.push("assistant");
    const { conversationId, operationId, query } = JSON.parse(options.body);
    const account = options.headers.Authorization.replace("Bearer token-", "");
    const user = stored.get(account + ":" + conversationId + ":" + operationId);
    if (!user || user.content !== query) return { ok: false, status: 403 };
    const key = account + ":" + conversationId + ":" + operationId + ":assistant";
    if (!stored.has(key)) stored.set(key, { role: "assistant", content: "XSUS answer for " + account });
    return { ok: true, json: async () => ({
      persisted: true, answer: stored.get(key).content, conversationId, operationId
    }) };
  });
  const bridge = createPrivateChatPersistenceBridge({
    supabase, writeService, endpoint: "https://example.org/api/private-chat", fetchImpl
  });
  return { bridge, writeService, fetchImpl, events, stored,
    switchAccount: value => { active = value; bridge.invalidate(); },
    hydrate: () => [...stored.values()].filter(v => v.role === "user" || v.role === "assistant")
  };
}

describe("Private chat full round trip integration (simulated Supabase + server)", () => {
  it("persists user then assistant, and data remains available to a fresh history read", async () => {
    const x = environment();
    await x.bridge.send(request);
    expect(x.events).toEqual(["user", "assistant"]);
    expect(x.hydrate().map(m => m.role)).toEqual(["user", "assistant"]);
  });
  it("does not duplicate either message on repeated sends", async () => {
    const x = environment();
    await Promise.all([x.bridge.send(request), x.bridge.send(request)]);
    await x.bridge.send(request);
    expect(x.hydrate()).toHaveLength(2);
    expect(x.fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("isolates the same operation identifiers across accounts", async () => {
    const x = environment();
    expect((await x.bridge.send(request)).answer).toBe("XSUS answer for account-a");
    x.switchAccount("account-b");
    expect((await x.bridge.send(request)).answer).toBe("XSUS answer for account-b");
    expect(x.hydrate()).toHaveLength(4);
  });
  it("never requests an assistant reply if user persistence is rejected", async () => {
    const x = environment();
    x.writeService.save.mockRejectedValueOnce(new Error("RLS denied"));
    await expect(x.bridge.send(request)).rejects.toThrow("RLS denied");
    expect(x.fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects mismatched persisted user content before contacting server", async () => {
    const x = environment();
    x.writeService.save.mockResolvedValueOnce({
      id: operationId, conversationId, role: "user", content: "Other"
    });
    await expect(x.bridge.send(request)).rejects.toThrow("User message persistence verification failed.");
    expect(x.fetchImpl).not.toHaveBeenCalled();
  });
  it("does not display a response after account switches mid-request", async () => {
    const x = environment();
    x.fetchImpl.mockImplementationOnce(async () => {
      x.switchAccount("account-b");
      return { ok: true, json: async () => ({
        persisted: true, answer: "Old account answer", conversationId, operationId
      }) };
    });
    await expect(x.bridge.send(request)).rejects.toThrow(/session changed/i);
  });
});
