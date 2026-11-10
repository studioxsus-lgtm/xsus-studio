/**
 * XSUS AI V3 — read-only private history contract integration.
 * Tests the same normalization boundary used by the main UI history loader.
 * No network, database writes, service-role keys, or production feature flags.
 */
import { describe, expect, test } from "vitest";
import {
  normalizeConversations,
  normalizeMessages
} from "../../assets/js/xsus-ai/contracts/xsus-chat-history-contract.js";

const conversationId = "22222222-2222-4222-8222-222222222222";
const otherConversationId = "33333333-3333-4333-8333-333333333333";
const createdAt = "2026-11-10T10:45:00.000+00:00";
const userMessage = {
  id: "44444444-4444-4444-8444-444444444444",
  conversation_id: conversationId,
  role: "user",
  content: "XSUS RLS message security test",
  created_at: createdAt
};
const assistantMessage = {
  id: "55555555-5555-4555-8555-555555555555",
  conversation_id: conversationId,
  role: "assistant",
  content: "Saved XSUS AI response",
  created_at: "2026-11-10T10:45:01.000+00:00"
};

describe("XSUS AI V3 private assistant history readback contract", () => {
  test("accepts persisted user and assistant messages in the same conversation", () => {
    const conversations = normalizeConversations([{
      id: conversationId,
      title: "XSUS RLS Security Test",
      created_at: createdAt,
      updated_at: createdAt
    }]);
    const messages = normalizeMessages([userMessage, assistantMessage], conversations[0].id);
    expect(messages.map(message => message.role)).toEqual(["user", "assistant"]);
    expect(messages.map(message => message.content)).toEqual([
      "XSUS RLS message security test", "Saved XSUS AI response"
    ]);
    expect(messages.every(message => message.conversationId === conversationId)).toBe(true);
  });

  test("keeps empty conversations empty rather than inventing assistant replies", () => {
    expect(normalizeMessages([], conversationId)).toEqual([]);
  });

  test("rejects an assistant message from a different conversation", () => {
    expect(() => normalizeMessages([
      userMessage, { ...assistantMessage, conversation_id: otherConversationId }
    ], conversationId)).toThrow("Message conversation mismatch.");
  });

  test("rejects malformed assistant content rather than rendering an unsafe record", () => {
    expect(() => normalizeMessages([
      { ...assistantMessage, content: "" }
    ], conversationId)).toThrow("Invalid message content.");
  });

  test("preserves validated assistant reply text and immutable records", () => {
    const messages = normalizeMessages([assistantMessage], conversationId);
    expect(messages[0].content).toBe(assistantMessage.content);
    expect(Object.isFrozen(messages)).toBe(true);
    expect(Object.isFrozen(messages[0])).toBe(true);
  });
});
