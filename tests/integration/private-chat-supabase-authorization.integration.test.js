/**
 * XSUS AI V3 — private authorization against mocked Supabase endpoints.
 * No live Supabase, secrets, or production writes.
 */
import { describe, expect, test, vi } from "vitest";
import { createPrivateChatAuthorization } from "../../src/server/private-chat-authorization.js";

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "99999999-9999-4999-8999-999999999999";
const conversationId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";
const content = "Private user question";
const token = "valid.mock.token";
const reply = (payload, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
const make = (fetchImpl) => createPrivateChatAuthorization({
  supabaseUrl: "https://example.supabase.co", supabaseKey: "public-test-key", fetchImpl
});
const verifyMessage = (auth) => auth.verifyUserMessage({ token, userId, conversationId, operationId, content });
const verifyConversation = (auth) => auth.verifyConversation({ token, userId, conversationId });

describe("Private Supabase authorization boundary (mocked)", () => {
  test("verifies JWT via auth endpoint rather than trusting a decoded token", async () => {
    const fetchImpl = vi.fn(async () => reply({ id: userId }));
    const auth = make(fetchImpl);
    await expect(auth.verifyUser("Bearer " + token)).resolves.toEqual({ userId, token });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][0]).toBe("https://example.supabase.co/auth/v1/user");
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer " + token);
  });

  test("rejects malformed bearer tokens without making requests", async () => {
    const fetchImpl = vi.fn();
    const auth = make(fetchImpl);
    await expect(auth.verifyUser("Bearer invalid token")).rejects.toThrow();
    await expect(auth.verifyUser("Basic credentials")).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("rejects failed auth and malformed authenticated identity", async () => {
    await expect(make(async () => reply({ error: "denied" }, 401)).verifyUser("Bearer " + token)).rejects.toThrow();
    await expect(make(async () => reply({ id: "not-a-uuid" })).verifyUser("Bearer " + token)).rejects.toThrow();
  });

  test("accepts exactly one RLS-visible conversation belonging to authenticated user", async () => {
    const fetchImpl = vi.fn(async () => reply([{ id: conversationId, user_id: userId }]));
    await expect(verifyConversation(make(fetchImpl))).resolves.toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toContain("/rest/v1/ai_conversations?");
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer " + token);
  });

  test.each([
    ["no visible conversation", []],
    ["different owner", [{ id: conversationId, user_id: otherId }]],
    ["different conversation", [{ id: otherId, user_id: userId }]],
    ["ambiguous rows", [{ id: conversationId, user_id: userId }, { id: conversationId, user_id: userId }]],
  ])("denies %s", async (_name, rows) => {
    await expect(verifyConversation(make(async () => reply(rows)))).rejects.toThrow();
  });

  test("accepts matching user message and operation under authenticated RLS", async () => {
    const row = { user_id: userId, conversation_id: conversationId, operation_id: operationId, role: "user", content };
    const fetchImpl = vi.fn(async () => reply([row]));
    await expect(verifyMessage(make(fetchImpl))).resolves.toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toContain("operation_id=eq." + operationId);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer " + token);
  });

  test.each([
    ["assistant role", { role: "assistant" }],
    ["wrong user", { user_id: otherId }],
    ["wrong conversation", { conversation_id: otherId }],
    ["wrong operation", { operation_id: otherId }],
    ["changed message content", { content: "Tampered question" }],
  ])("denies message with %s", async (_name, override) => {
    const row = { user_id: userId, conversation_id: conversationId, operation_id: operationId, role: "user", content, ...override };
    await expect(verifyMessage(make(async () => reply([row])))).rejects.toThrow();
  });

  test("denies missing or ambiguous user message", async () => {
    const row = { user_id: userId, conversation_id: conversationId, operation_id: operationId, role: "user", content };
    await expect(verifyMessage(make(async () => reply([])))).rejects.toThrow();
    await expect(verifyMessage(make(async () => reply([row, row])))).rejects.toThrow();
  });

  test("fails closed on Supabase request failure", async () => {
    await expect(verifyMessage(make(async () => reply({ error: "unavailable" }, 503)))).rejects.toThrow();
    await expect(verifyConversation(make(async () => { throw new Error("network failure"); }))).rejects.toThrow();
  });
});
