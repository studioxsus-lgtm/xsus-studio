import { describe, it, expect } from "vitest";
import { validatePrivateChatRequest, requireVerifiedConversationOwner } from "../../src/server/private-chat-persistence-contract.js";
const A = "550e8400-e29b-41d4-a716-446655440000";
const B = "550e8400-e29b-41d4-a716-446655440001";
const C = "550e8400-e29b-41d4-a716-446655440002";
const valid = { conversationId: A, operationId: B, query: "Hello" };
describe("Private chat persistence boundary", () => {
  it("accepts valid request and normalizes query", () => {
    expect(validatePrivateChatRequest({ ...valid, query: " Hi " }).query).toBe("Hi");
  });
  it("rejects missing conversation ID", () => {
    expect(() => validatePrivateChatRequest({ ...valid, conversationId: null })).toThrow();
  });
  it("rejects missing operation ID", () => {
    expect(() => validatePrivateChatRequest({ ...valid, operationId: "" })).toThrow();
  });
  it("rejects empty query", () => {
    expect(() => validatePrivateChatRequest({ ...valid, query: " " })).toThrow();
  });
  it("rejects oversized query", () => {
    expect(() => validatePrivateChatRequest({ ...valid, query: "a".repeat(8001) })).toThrow();
  });
  it("rejects malformed body", () => {
    expect(() => validatePrivateChatRequest(null)).toThrow();
  });
  it("allows matching verified owner", () => {
    expect(requireVerifiedConversationOwner({ authenticatedUserId: A, conversationOwnerId: A })).toBe(true);
  });
  it("rejects another account's conversation", () => {
    expect(() => requireVerifiedConversationOwner({ authenticatedUserId: A, conversationOwnerId: C })).toThrow("Conversation access denied.");
  });
  it("rejects missing authenticated identity", () => {
    expect(() => requireVerifiedConversationOwner({ authenticatedUserId: null, conversationOwnerId: A })).toThrow();
  });
  it("does not trust client-supplied role or user ID", () => {
    const parsed = validatePrivateChatRequest({ ...valid, role: "assistant", userId: C, answer: "forged" });
    expect(parsed).not.toHaveProperty("role");
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("answer");
  });
});
