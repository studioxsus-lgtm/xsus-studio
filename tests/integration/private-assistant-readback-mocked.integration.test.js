/**
 * XSUS AI V3 — simulated persistence readback across fresh handler instances.
 * This verifies server-side persisted assistant records, NOT browser refresh UI.
 * All transport and authentication are mocked; no production writes.
 */
import { describe, expect, test, vi } from "vitest";
import { createPrivateChatHandler } from "../../src/server/private-chat-handler.js";
import { createAssistantMessageWriter, assistantOperationId } from "../../src/server/assistant-message-writer.js";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "99999999-9999-4999-8999-999999999999";
const conversationId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";
const body = { conversationId, operationId, query: "History readback test" };
const response = (status, payload) => ({ status, ok: status >= 200 && status < 300, json: async () => payload });

function environment() {
  const rows = [];
  const fetchImpl = vi.fn(async (url, options) => {
    if (url.endsWith("/auth/v1/user")) {
      return response(200, { id: options.headers.Authorization.endsWith("owner-token") ? owner : other });
    }
    if (url.includes("/rest/v1/ai_conversations?")) {
      return response(200, options.headers.Authorization.endsWith("owner-token")
        ? [{ id: conversationId, user_id: owner }] : []);
    }
    if (url.includes("/rest/v1/ai_messages?") && options.method === "GET") {
      const token = options.headers.Authorization;
      if (token === "Bearer mock-service-key") {
        return response(200, rows.filter(row => row.operation_id === assistantOperationId(operationId)));
      }
      return response(200, token.endsWith("owner-token")
        ? [{ id: "44444444-4444-4444-8444-444444444444", user_id: owner,
          conversation_id: conversationId, operation_id: operationId,
          role: "user", content: body.query }] : []);
    }
    if (url.includes("/rest/v1/ai_messages?") && options.method === "POST") {
      const data = JSON.parse(options.body);
      if (rows.some(row => row.operation_id === data.operation_id)) return response(409, { code: "23505" });
      const row = { id: "55555555-5555-4555-8555-555555555555", ...data };
      rows.push(row);
      return response(201, [row]);
    }
    throw new Error("Unexpected mock request");
  });
  const create = (answer = "Original persisted assistant answer") => createPrivateChatHandler({
    supabaseUrl: "https://mock.supabase.co",
    supabaseKey: "mock-public-key",
    fetchImpl,
    generate: vi.fn(async () => ({ answer })),
    writer: createAssistantMessageWriter({
      supabaseUrl: "https://mock.supabase.co",
      serviceRoleKey: "mock-service-key",
      fetchImpl
    })
  });
  return { rows, fetchImpl, create };
}

describe("Private assistant persistence and fresh-instance readback (mocked)", () => {
  test("a new handler instance returns the original persisted answer on retry", async () => {
    const env = environment();
    const first = await env.create()({ authorization: "Bearer owner-token", body });
    const second = await env.create("Different regenerated answer")({
      authorization: "Bearer owner-token", body
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.data.answer).toBe("Original persisted assistant answer");
    expect(env.rows).toHaveLength(1);
    expect(env.rows[0]).toMatchObject({
      user_id: owner, conversation_id: conversationId,
      operation_id: assistantOperationId(operationId),
      role: "assistant", content: "Original persisted assistant answer"
    });
  });

  test("different account cannot trigger a private reply or access the owner's operation", async () => {
    const env = environment();
    expect((await env.create()({ authorization: "Bearer owner-token", body })).status).toBe(200);
    const denied = await env.create()({ authorization: "Bearer other-token", body });
    expect(denied.status).toBe(403);
    expect(denied.data).not.toHaveProperty("answer");
    expect(env.rows).toHaveLength(1);
  });

  test("persisted assistant is visible in a fresh RLS-style history read for its owner", async () => {
    const env = environment();
    const saved = await env.create()({ authorization: "Bearer owner-token", body });
    expect(saved.status).toBe(200);

    // Simulate a new page load: no in-memory chat state is carried over.
    const historyRead = async ({ userId, requestedConversationId }) =>
      env.rows.filter(row => row.user_id === userId &&
        row.conversation_id === requestedConversationId)
        .map(({ id, conversation_id, role, content }) =>
          ({ id, conversationId: conversation_id, role, content }));

    const ownHistory = await historyRead({ userId: owner, requestedConversationId: conversationId });
    expect(ownHistory).toHaveLength(1);
    expect(ownHistory[0]).toMatchObject({
      conversationId, role: "assistant", content: saved.data.answer
    });
    expect(await historyRead({ userId: other, requestedConversationId: conversationId })).toEqual([]);
    expect(await historyRead({
      userId: owner, requestedConversationId: "66666666-6666-4666-8666-666666666666"
    })).toEqual([]);
  });

  test("failed persistence cannot be reported as a stored assistant reply", async () => {
    const env = environment();
    const handler = createPrivateChatHandler({
      supabaseUrl: "https://mock.supabase.co",
      supabaseKey: "mock-public-key",
      fetchImpl: env.fetchImpl,
      generate: async () => ({ answer: "Unsaved response" }),
      writer: { save: async () => { throw new Error("Database unavailable"); } }
    });
    const result = await handler({ authorization: "Bearer owner-token", body });
    expect(result.status).toBe(503);
    expect(result.data).not.toHaveProperty("persisted", true);
    expect(env.rows).toHaveLength(0);
  });

  test("assistant row remains associated with its original conversation and owner", async () => {
    const env = environment();
    expect((await env.create()({ authorization: "Bearer owner-token", body })).status).toBe(200);
    const persisted = env.rows[0];
    expect(persisted.user_id).toBe(owner);
    expect(persisted.conversation_id).toBe(conversationId);
    expect(persisted.role).toBe("assistant");
    expect(persisted.content).toBe("Original persisted assistant answer");
  });
});
