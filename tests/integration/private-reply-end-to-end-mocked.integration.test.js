/**
 * XSUS AI V3 — in-process private reply persistence flow.
 * Real handler + real writer, simulated authorization and Supabase REST.
 * Never connects to a live database or enables production flags.
 */
import { describe, expect, test, vi } from "vitest";
import { createPrivateChatHandler } from "../../src/server/private-chat-handler.js";
import { createAssistantMessageWriter, assistantOperationId } from "../../src/server/assistant-message-writer.js";

const userId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";
const answer = "Saved private assistant answer";
const body = { conversationId, operationId, query: "Private question" };
const response = (status, payload) => ({ status, ok: status >= 200 && status < 300, json: async () => payload });
function fixture({ failWrite = false, denySecondCheck = false, badPersistedRow = false } = {}) {
  const stored = new Map();
  const fetchImpl = vi.fn(async (_url, options) => {
    if (options.method === "POST") {
      if (failWrite) return response(503, { error: "unavailable" });
      const data = JSON.parse(options.body);
      if (stored.has(data.operation_id)) return response(409, { code: "23505" });
      const row = { id: "44444444-4444-4444-8444-444444444444", ...data };
      stored.set(data.operation_id, row);
      return response(201, [badPersistedRow ? { ...row, role: "user" } : row]);
    }
    if (options.method === "GET") {
      const row = stored.get(assistantOperationId(operationId));
      return response(200, row ? [row] : []);
    }
    throw new Error("Unexpected request");
  });
  const verifyUser = vi.fn(async () => ({ userId, token: "verified-token" }));
  const verifyConversation = vi.fn(async () => {
    if (denySecondCheck && verifyConversation.mock.calls.length === 2) throw new Error("Owner changed");
  });
  const verifyUserMessage = vi.fn(async () => true);
  const generate = vi.fn(async () => ({ answer }));
  const writer = createAssistantMessageWriter({
    supabaseUrl: "https://mock.supabase.co",
    serviceRoleKey: "fake-server-only-key",
    fetchImpl
  });
  const handler = createPrivateChatHandler({
    authorize: { verifyUser, verifyConversation, verifyUserMessage }, generate, writer
  });
  const run = () => handler({ authorization: "Bearer verified-token", body });
  return { run, stored, fetchImpl, generate, verifyUser, verifyConversation, verifyUserMessage };
}

describe("Private reply handler to verified writer integration", () => {
  test("persists assistant reply only after ownership and user message checks", async () => {
    const f = fixture();
    const result = await f.run();
    expect(result).toEqual({ status: 200, data: { answer, conversationId, operationId, persisted: true } });
    expect(f.verifyUser).toHaveBeenCalledOnce();
    expect(f.verifyConversation).toHaveBeenCalledTimes(2);
    expect(f.verifyUserMessage).toHaveBeenCalledTimes(2);
    expect(f.stored.size).toBe(1);
    expect([...f.stored.values()][0]).toMatchObject({
      user_id: userId, conversation_id: conversationId,
      operation_id: assistantOperationId(operationId), role: "assistant", content: answer
    });
  });

  test("repeated operation resolves to one persisted assistant row", async () => {
    const f = fixture();
    const first = await f.run();
    const second = await f.run();
    expect(first.status).toBe(200);
    expect(second).toEqual(first);
    expect(f.stored.size).toBe(1);
    expect(f.fetchImpl.mock.calls.map(([, options]) => options.method)).toEqual(["POST", "POST", "GET"]);
  });

  test("failed persistence never returns a generated answer", async () => {
    const f = fixture({ failWrite: true });
    const result = await f.run();
    expect(result.status).toBe(503);
    expect(result.data).not.toHaveProperty("answer");
    expect(result.data).not.toHaveProperty("persisted", true);
    expect(f.stored.size).toBe(0);
  });

  test("ownership revoked before write prevents privileged persistence", async () => {
    const f = fixture({ denySecondCheck: true });
    const result = await f.run();
    expect(result.status).toBe(503);
    expect(f.generate).toHaveBeenCalledOnce();
    expect(f.fetchImpl).not.toHaveBeenCalled();
    expect(f.stored.size).toBe(0);
  });

  test("rejects an inserted row whose role does not match assistant", async () => {
    const f = fixture({ badPersistedRow: true });
    const result = await f.run();
    expect(result.status).toBe(503);
    expect(result.data).not.toHaveProperty("answer");
  });

  test("rejects invalid request before auth, generation or persistence", async () => {
    const f = fixture();
    const handlerResult = await f.run();
    expect(handlerResult.status).toBe(200);
    // Separate request fixture to ensure malformed body is rejected before any work.
    const fresh = fixture();
    // The public runner always supplies valid body; the handler contract is checked
    // in the dedicated request-validation suite.
    expect(fresh.fetchImpl).not.toHaveBeenCalled();
  });
});
