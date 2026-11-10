/**
 * XSUS AI V3 — cross-account private chat authorization boundary.
 * Uses real authorization and handler, mocked Supabase responses only.
 */
import { describe, expect, test, vi } from "vitest";
import { createPrivateChatAuthorization } from "../../src/server/private-chat-authorization.js";
import { createPrivateChatHandler } from "../../src/server/private-chat-handler.js";

const owner = "11111111-1111-4111-8111-111111111111";
const other = "99999999-9999-4999-8999-999999999999";
const conversationId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";
const body = { conversationId, operationId, query: "Private question" };
const reply = (status, payload) => ({
  ok: status >= 200 && status < 300, status, json: async () => payload
});

function setup({ account = owner, conversationOwner = owner, messageOwner = owner,
  messageConversation = conversationId, messageRole = "user", messageContent = body.query,
  hiddenConversation = false, hiddenMessage = false, failAuth = false } = {}) {
  const fetchImpl = vi.fn(async (url, request) => {
    if (url.endsWith("/auth/v1/user")) {
      return failAuth ? reply(401, { error: "invalid token" }) : reply(200, { id: account });
    }
    if (url.includes("/rest/v1/ai_conversations?")) {
      return reply(200, hiddenConversation ? [] : [{ id: conversationId, user_id: conversationOwner }]);
    }
    if (url.includes("/rest/v1/ai_messages?")) {
      return reply(200, hiddenMessage ? [] : [{
        id: "44444444-4444-4444-8444-444444444444",
        user_id: messageOwner, conversation_id: messageConversation,
        operation_id: operationId, role: messageRole, content: messageContent
      }]);
    }
    throw new Error("Unexpected URL");
  });
  const authorize = createPrivateChatAuthorization({
    supabaseUrl: "https://mock.supabase.co", supabaseKey: "mock-public-key", fetchImpl
  });
  const generate = vi.fn(async () => ({ answer: "AI response" }));
  const writer = { save: vi.fn(async () => ({ content: "AI response" })) };
  const handler = createPrivateChatHandler({ authorize, generate, writer });
  const run = () => handler({ authorization: "Bearer mock-token", body });
  return { run, fetchImpl, generate, writer };
}

describe("Private chat account isolation (mocked Supabase)", () => {
  test("rejects a different account accessing the owner's conversation", async () => {
    const f = setup({ account: other });
    expect((await f.run()).status).toBe(403);
    expect(f.generate).not.toHaveBeenCalled();
    expect(f.writer.save).not.toHaveBeenCalled();
  });

  test("rejects a conversation hidden by RLS", async () => {
    const f = setup({ hiddenConversation: true });
    expect((await f.run()).status).toBe(403);
    expect(f.writer.save).not.toHaveBeenCalled();
  });

  test("rejects a message belonging to another user", async () => {
    const f = setup({ messageOwner: other });
    expect((await f.run()).status).toBe(403);
    expect(f.generate).not.toHaveBeenCalled();
  });

  test("rejects a user message linked to a different conversation", async () => {
    const f = setup({ messageConversation: "55555555-5555-4555-8555-555555555555" });
    expect((await f.run()).status).toBe(403);
    expect(f.writer.save).not.toHaveBeenCalled();
  });

  test("rejects assistant-role message as proof of user operation", async () => {
    const f = setup({ messageRole: "assistant" });
    expect((await f.run()).status).toBe(403);
    expect(f.generate).not.toHaveBeenCalled();
  });

  test("rejects a persisted user message with different content", async () => {
    const f = setup({ messageContent: "Different question" });
    expect((await f.run()).status).toBe(403);
    expect(f.writer.save).not.toHaveBeenCalled();
  });

  test("rejects an operation not visible to the authenticated user", async () => {
    const f = setup({ hiddenMessage: true });
    expect((await f.run()).status).toBe(403);
    expect(f.writer.save).not.toHaveBeenCalled();
  });

  test("rejects invalid session token before generation or write", async () => {
    const f = setup({ failAuth: true });
    expect((await f.run()).status).toBe(403);
    expect(f.generate).not.toHaveBeenCalled();
    expect(f.writer.save).not.toHaveBeenCalled();
  });

  test("matching owner and user message permit a verified assistant write", async () => {
    const f = setup();
    const result = await f.run();
    expect(result.status).toBe(200);
    expect(result.data.persisted).toBe(true);
    expect(f.generate).toHaveBeenCalledOnce();
    expect(f.writer.save).toHaveBeenCalledWith({
      userId: owner, conversationId, operationId, answer: "AI response"
    });
    expect(f.fetchImpl).toHaveBeenCalledTimes(5);
  });
});
