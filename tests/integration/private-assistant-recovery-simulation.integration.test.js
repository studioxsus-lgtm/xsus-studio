/**
 * XSUS AI V3 — simulated persisted assistant recovery and account isolation.
 * Backend-only test. The UI history adapter belongs to the separate main branch.
 * No live Supabase, credentials, or production writes.
 */
import { describe, expect, test, vi } from "vitest";
import { assistantOperationId, createAssistantMessageWriter } from "../../src/server/assistant-message-writer.js";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const conversationA = "33333333-3333-4333-8333-333333333333";
const operation = "44444444-4444-4444-8444-444444444444";
const answer = "Assistant reply persisted in the mock store";
const input = { userId: userA, conversationId: conversationA, operationId: operation, answer };

function simulatedSupabase() {
  const rows = [];
  const fetchImpl = vi.fn(async (url, request) => {
    const parsed = new URL(url);
    if (request.method === "POST") {
      const row = JSON.parse(request.body);
      if (rows.some((existing) => existing.operation_id === row.operation_id)) {
        return { ok: false, status: 409, json: async () => ({ code: "23505" }) };
      }
      const saved = { ...row, id: "55555555-5555-4555-8555-555555555555" };
      rows.push(saved);
      return { ok: true, status: 201, json: async () => [saved] };
    }
    if (request.method === "GET") {
      const selected = rows.filter((row) =>
        ["user_id", "conversation_id", "operation_id"].every((key) =>
          row[key] === parsed.searchParams.get(key)?.replace(/^eq\./, "")
        )
      );
      return { ok: true, status: 200, json: async () => selected };
    }
    throw new Error("Unexpected mock request");
  });
  const writer = () => createAssistantMessageWriter({
    supabaseUrl: "https://mock.supabase.co",
    serviceRoleKey: "fake-key-for-local-test-only",
    fetchImpl,
  });
  return { rows, fetchImpl, writer };
}

describe("Private assistant persistence recovery simulation", () => {
  test("recreated writer resolves a repeated operation to one stored assistant message", async () => {
    const mock = simulatedSupabase();
    const first = await mock.writer().save(input);
    const recovered = await mock.writer().save(input);
    expect(recovered).toEqual(first);
    expect(mock.rows).toHaveLength(1);
    expect(mock.rows[0]).toMatchObject({
      user_id: userA,
      conversation_id: conversationA,
      operation_id: assistantOperationId(operation),
      role: "assistant",
      content: answer,
    });
    expect(mock.fetchImpl.mock.calls.map((call) => call[1].method)).toEqual(["POST", "POST", "GET"]);
  });

  test("different user cannot recover another user's assistant operation", async () => {
    const mock = simulatedSupabase();
    await mock.writer().save(input);
    await expect(mock.writer().save({ ...input, userId: userB }))
      .rejects.toThrow("Assistant persistence conflict could not be verified.");
    expect(mock.rows).toHaveLength(1);
    expect(mock.rows[0].user_id).toBe(userA);
  });

  test("different conversation cannot recover an existing assistant operation", async () => {
    const mock = simulatedSupabase();
    await mock.writer().save(input);
    await expect(mock.writer().save({
      ...input,
      conversationId: "66666666-6666-4666-8666-666666666666",
    })).rejects.toThrow("Assistant persistence conflict could not be verified.");
    expect(mock.rows).toHaveLength(1);
  });
});
