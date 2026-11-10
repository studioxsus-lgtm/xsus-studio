/**
 * XSUS AI V3 — retry and failure safety with real handler/writer and mock REST.
 * No live Supabase or credentials.
 */
import { describe, expect, test, vi } from "vitest";
import { createPrivateChatHandler } from "../../src/server/private-chat-handler.js";
import { createAssistantMessageWriter, assistantOperationId } from "../../src/server/assistant-message-writer.js";

const userId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";
const body = { conversationId, operationId, query: "Retry question" };
const result = (status, payload) => ({ status, ok: status >= 200 && status < 300, json: async () => payload });

function fixture({ conflictLookup = null, secondWriteFailure = false, rejectRecheck = false } = {}) {
  const rows = new Map();
  let writeCount = 0;
  const fetchImpl = vi.fn(async (_url, req) => {
    if (req.method === "POST") {
      writeCount++;
      if (secondWriteFailure && writeCount === 2) return result(503, { error: "unavailable" });
      const data = JSON.parse(req.body);
      if (rows.has(data.operation_id)) return result(409, { code: "23505" });
      const row = { id: "44444444-4444-4444-8444-444444444444", ...data };
      rows.set(data.operation_id, row);
      return result(201, [row]);
    }
    if (req.method === "GET") {
      if (conflictLookup === "unavailable") return result(503, { error: "unavailable" });
      if (conflictLookup === "missing") return result(200, []);
      const row = rows.get(assistantOperationId(operationId));
      return result(200, row ? [row] : []);
    }
    throw new Error("Unexpected method");
  });
  const verifyConversation = vi.fn(async () => {
    if (rejectRecheck && verifyConversation.mock.calls.length === 2) throw new Error("Ownership changed");
  });
  const verifyUserMessage = vi.fn(async () => true);
  const generate = vi.fn()
    .mockResolvedValueOnce({ answer: "Original saved answer" })
    .mockResolvedValue({ answer: "Different regenerated answer" });
  const writer = createAssistantMessageWriter({
    supabaseUrl: "https://mock.supabase.co", serviceRoleKey: "mock-only-key", fetchImpl
  });
  const handler = createPrivateChatHandler({
    authorize: {
      verifyUser: async () => ({ userId, token: "verified-token" }),
      verifyConversation, verifyUserMessage
    },
    generate, writer
  });
  const run = (requestBody = body) => handler({ authorization: "Bearer verified-token", body: requestBody });
  return { run, rows, fetchImpl, generate, verifyConversation, verifyUserMessage };
}

describe("Private assistant reply retries fail closed", () => {
  test("retry returns original persisted content even if regenerated answer differs", async () => {
    const f = fixture();
    const first = await f.run();
    const second = await f.run();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.data.answer).toBe("Original saved answer");
    expect(second.data.persisted).toBe(true);
    expect(f.rows.size).toBe(1);
    expect(f.generate).toHaveBeenCalledTimes(2);
  });

  test("unverifiable conflict never returns a generated answer", async () => {
    const f = fixture({ conflictLookup: "unavailable" });
    expect((await f.run()).status).toBe(200);
    const retry = await f.run();
    expect(retry.status).toBe(503);
    expect(retry.data).not.toHaveProperty("answer");
    expect(f.rows.size).toBe(1);
  });

  test("missing conflict row fails closed without reporting persisted", async () => {
    const f = fixture({ conflictLookup: "missing" });
    expect((await f.run()).status).toBe(200);
    const retry = await f.run();
    expect(retry.status).toBe(503);
    expect(retry.data.persisted).not.toBe(true);
  });

  test("temporary write failure on retry never reports an unsaved new answer", async () => {
    const f = fixture({ secondWriteFailure: true });
    expect((await f.run()).status).toBe(200);
    const retry = await f.run();
    expect(retry.status).toBe(503);
    expect(retry.data).not.toHaveProperty("answer");
    expect(f.rows.size).toBe(1);
  });

  test("revoked ownership prevents write and any persistence claim", async () => {
    const f = fixture({ rejectRecheck: true });
    const response = await f.run();
    expect(response.status).toBe(503);
    expect(response.data).not.toHaveProperty("answer");
    expect(f.fetchImpl).not.toHaveBeenCalled();
    expect(f.rows.size).toBe(0);
  });

  test("malformed request is rejected before generation and storage", async () => {
    const f = fixture();
    const response = await f.run({ ...body, operationId: "not-uuid" });
    expect(response.status).toBe(400);
    expect(f.generate).not.toHaveBeenCalled();
    expect(f.fetchImpl).not.toHaveBeenCalled();
  });
});
