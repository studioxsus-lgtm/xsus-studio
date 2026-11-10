/**
 * XSUS AI V3 — pre-live Supabase authorization readiness.
 * Simulated HTTP responses only: no network, secrets, or production mutations.
 */
import { describe, expect, test, vi } from "vitest";
import { createPrivateChatAuthorization } from "../../src/server/private-chat-authorization.js";
import { createAssistantMessageWriter } from "../../src/server/assistant-message-writer.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherUser = "22222222-2222-4222-8222-222222222222";
const conversationId = "33333333-3333-4333-8333-333333333333";
const operationId = "44444444-4444-4444-8444-444444444444";
const query = "Persisted user question";
const json = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

function authFixture({ owner = userId, messageOwner = userId, role = "user", content = query } = {}) {
  const fetchImpl = vi.fn(async (url, request) => {
    const path = new URL(url).pathname;
    if (path === "/auth/v1/user") return json(200, { id: userId });
    if (path === "/rest/v1/ai_conversations") {
      return json(200, [{ id: conversationId, user_id: owner }]);
    }
    if (path === "/rest/v1/ai_messages") {
      return json(200, [{
        id: "55555555-5555-4555-8555-555555555555",
        user_id: messageOwner, conversation_id: conversationId,
        operation_id: operationId, role, content,
      }]);
    }
    throw new Error("Unexpected mock endpoint: " + path);
  });
  const auth = createPrivateChatAuthorization({
    supabaseUrl: "https://mock.supabase.co",
    supabaseKey: "fake-public-key",
    fetchImpl,
  });
  return { auth, fetchImpl };
}

describe("Supabase private chat pre-live authorization readiness", () => {
  test("validates token through Supabase auth and uses user JWT for RLS reads", async () => {
    const { auth, fetchImpl } = authFixture();
    const identity = await auth.verifyUser("Bearer simulated.jwt.token");
    expect(identity).toEqual({ userId, token: "simulated.jwt.token" });
    await expect(auth.verifyConversation({ ...identity, conversationId })).resolves.toBe(true);
    await expect(auth.verifyUserMessage({
      ...identity, conversationId, operationId, content: query,
    })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const [, request] of fetchImpl.mock.calls) {
      expect(request.method).toBe("GET");
      expect(request.headers.Authorization).toBe("Bearer simulated.jwt.token");
      expect(request.headers.apikey).toBe("fake-public-key");
    }
  });

  test("denies a conversation with a different owner", async () => {
    const { auth } = authFixture({ owner: otherUser });
    await expect(auth.verifyConversation({
      userId, token: "simulated.jwt.token", conversationId,
    })).rejects.toThrow("Conversation access denied.");
  });

  test("denies a user message owned by another account", async () => {
    const { auth } = authFixture({ messageOwner: otherUser });
    await expect(auth.verifyUserMessage({
      userId, token: "simulated.jwt.token", conversationId, operationId, content: query,
    })).rejects.toThrow("User message verification denied.");
  });

  test("denies assistant-role substitution and modified user content", async () => {
    for (const options of [{ role: "assistant" }, { content: "Different question" }]) {
      const { auth } = authFixture(options);
      await expect(auth.verifyUserMessage({
        userId, token: "simulated.jwt.token", conversationId, operationId, content: query,
      })).rejects.toThrow("User message verification denied.");
    }
  });

  test("rejects malformed bearer tokens before network access", async () => {
    const { auth, fetchImpl } = authFixture();
    await expect(auth.verifyUser("not-a-bearer-token"))
      .rejects.toThrow("Authentication required.");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("refuses to configure a privileged writer without server credentials", () => {
    expect(() => createAssistantMessageWriter({
      supabaseUrl: "https://mock.supabase.co", serviceRoleKey: "",
    })).toThrow("Assistant message writer is not configured.");
  });
});
