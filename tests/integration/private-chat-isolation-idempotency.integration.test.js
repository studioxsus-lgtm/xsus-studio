import { describe, it, expect, vi } from "vitest";
import { createPrivateChatHandler } from "../../src/server/private-chat-handler.js";
import { createAssistantMessageWriter, assistantOperationId } from "../../src/server/assistant-message-writer.js";

const A = "550e8400-e29b-41d4-a716-446655440000";
const B = "550e8400-e29b-41d4-a716-446655440001";
const CA = "550e8400-e29b-41d4-a716-446655440002";
const CB = "550e8400-e29b-41d4-a716-446655440003";
const OP = "550e8400-e29b-41d4-a716-446655440004";
const MSG = "Hello";
const ok = (status, payload) => ({ status, ok: status >= 200 && status < 300, json: async () => payload });
const body = conversationId => ({ conversationId, operationId: OP, query: MSG });

function fixture() {
  const owners = new Map([[CA, A], [CB, B]]);
  const records = new Map();
  let writes = 0;
  let online = true;
  const fetchImpl = vi.fn(async (url, options) => {
    if (!online) return ok(503, { code: "OUTAGE" });
    const params = new URL(url).searchParams;
    const key = [params.get("user_id")?.slice(3), params.get("conversation_id")?.slice(3),
      params.get("operation_id")?.slice(3)].join(":");
    if (options.method === "GET") {
      const record = records.get(key);
      return ok(200, record ? [record] : []);
    }
    const payload = JSON.parse(options.body);
    if (owners.get(payload.conversation_id) !== payload.user_id) {
      return ok(409, { code: "23503" });
    }
    const rowKey = [payload.user_id, payload.conversation_id, payload.operation_id].join(":");
    if (records.has(rowKey)) return ok(409, { code: "23505" });
    const record = { id: "550e8400-e29b-41d4-a716-446655440005", ...payload };
    records.set(rowKey, record);
    writes++;
    return ok(201, [record]);
  });
  const writer = createAssistantMessageWriter({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "test-only-secret",
    fetchImpl
  });
  const authorize = {
    verifyUser: vi.fn(async header => {
      if (header === "Bearer token-a") return { userId: A, token: "token-a" };
      if (header === "Bearer token-b") return { userId: B, token: "token-b" };
      throw new Error("Invalid JWT");
    }),
    verifyConversation: vi.fn(async ({ userId, conversationId }) => {
      if (owners.get(conversationId) !== userId) throw new Error("Forbidden");
      return true;
    }),
    verifyUserMessage: vi.fn(async ({ userId, conversationId, operationId, content }) => {
      if (owners.get(conversationId) !== userId || operationId !== OP || content !== MSG) {
        throw new Error("Missing user message");
      }
      return true;
    })
  };
  const generate = vi.fn(async () => ({ answer: "AI answer" }));
  const handler = createPrivateChatHandler({ authorize, generate, writer });
  return { handler, authorize, generate, fetchImpl, records, getWrites: () => writes,
    setOnline: value => { online = value; } };
}

describe("Private reply isolation and idempotency (mocked Supabase)", () => {
  it("allows account A to save only to its own conversation", async () => {
    const x = fixture();
    const result = await x.handler({ authorization: "Bearer token-a", body: body(CA) });
    expect(result.status).toBe(200);
    expect(result.data.persisted).toBe(true);
    expect(x.getWrites()).toBe(1);
  });
  it("rejects account B writing into account A's conversation", async () => {
    const x = fixture();
    const result = await x.handler({ authorization: "Bearer token-b", body: body(CA) });
    expect(result.status).toBe(403);
    expect(x.generate).not.toHaveBeenCalled();
    expect(x.getWrites()).toBe(0);
  });
  it("rejects account A writing into account B's conversation", async () => {
    const x = fixture();
    expect((await x.handler({ authorization: "Bearer token-a", body: body(CB) })).status).toBe(403);
    expect(x.getWrites()).toBe(0);
  });
  it("retries the same operation without creating a duplicate", async () => {
    const x = fixture();
    const request = { authorization: "Bearer token-a", body: body(CA) };
    const first = await x.handler(request);
    const second = await x.handler(request);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.data.answer).toBe(first.data.answer);
    expect(x.getWrites()).toBe(1);
    expect(x.records.size).toBe(1);
    expect([...x.records.values()][0].operation_id).toBe(assistantOperationId(OP));
  });
  it("fails closed during database outage", async () => {
    const x = fixture();
    x.setOnline(false);
    const result = await x.handler({ authorization: "Bearer token-a", body: body(CA) });
    expect(result.status).toBe(503);
    expect(result.data.persisted).toBeUndefined();
    expect(x.getWrites()).toBe(0);
  });
  it("rejects an invalid authentication token", async () => {
    const x = fixture();
    expect((await x.handler({ authorization: "Bearer invalid", body: body(CA) })).status).toBe(403);
    expect(x.generate).not.toHaveBeenCalled();
  });
});
