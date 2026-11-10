import { describe, it, expect, vi } from "vitest";
import { readBearerToken, createPrivateChatAuthorization } from "../../src/server/private-chat-authorization.js";
const USER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "550e8400-e29b-41d4-a716-446655440001";
const CONV = "550e8400-e29b-41d4-a716-446655440002";
const ok = data => ({ ok: true, json: async () => data });
function setup(responses) {
  const fetchImpl = vi.fn().mockImplementation(async () => responses.shift());
  const auth = createPrivateChatAuthorization({
    supabaseUrl: "https://example.supabase.co", supabaseKey: "public-key", fetchImpl
  });
  return { auth, fetchImpl };
}
describe("Private chat server authorization", () => {
  it("accepts a bearer token", () => expect(readBearerToken("Bearer abc.def")).toBe("abc.def"));
  it("rejects missing authorization", () => expect(() => readBearerToken(null)).toThrow());
  it("rejects malformed authorization", () => expect(() => readBearerToken("Basic xyz")).toThrow());
  it("rejects missing configuration", () => expect(() => createPrivateChatAuthorization({})).toThrow());
  it("verifies identity with Supabase Auth", async () => {
    const { auth, fetchImpl } = setup([ok({ id: USER })]);
    expect((await auth.verifyUser("Bearer token")).userId).toBe(USER);
    expect(fetchImpl.mock.calls[0][0]).toContain("/auth/v1/user");
  });
  it("rejects invalid Auth response", async () => {
    const { auth } = setup([ok({ id: "not-a-uuid" })]);
    await expect(auth.verifyUser("Bearer token")).rejects.toThrow();
  });
  it("rejects rejected JWT", async () => {
    const { auth } = setup([{ ok: false, status: 401 }]);
    await expect(auth.verifyUser("Bearer token")).rejects.toThrow();
  });
  it("accepts an RLS-visible owned conversation", async () => {
    const { auth, fetchImpl } = setup([ok([{ id: CONV, user_id: USER }])]);
    await expect(auth.verifyConversation({ token: "token", userId: USER, conversationId: CONV })).resolves.toBe(true);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer token");
  });
  it("rejects a conversation owned by another account", async () => {
    const { auth } = setup([ok([{ id: CONV, user_id: OTHER }])]);
    await expect(auth.verifyConversation({ token: "token", userId: USER, conversationId: CONV })).rejects.toThrow();
  });
  it("rejects an RLS-hidden conversation", async () => {
    const { auth } = setup([ok([])]);
    await expect(auth.verifyConversation({ token: "token", userId: USER, conversationId: CONV })).rejects.toThrow();
  });
  it("rejects malformed conversation identifiers before network", async () => {
    const { auth, fetchImpl } = setup([]);
    await expect(auth.verifyConversation({ token: "token", userId: USER, conversationId: "bad" })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
