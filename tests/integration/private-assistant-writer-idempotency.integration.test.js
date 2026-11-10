/**
 * XSUS AI V3 — assistant writer idempotency and integrity.
 * Fully mocked Supabase REST transport; no credentials or live writes.
 */
import { describe, expect, test, vi } from "vitest";
import {
  assistantOperationId,
  createAssistantMessageWriter,
} from "../../src/server/assistant-message-writer.js";

const userId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";
const assistantId = assistantOperationId(operationId);
const answer = "Verified assistant response";
const input = { userId, conversationId, operationId, answer };
const row = {
  id: "44444444-4444-4444-8444-444444444444",
  user_id: userId,
  conversation_id: conversationId,
  operation_id: assistantId,
  role: "assistant",
  content: answer,
};
const response = (status, payload) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => payload,
});
const makeWriter = (fetchImpl) => createAssistantMessageWriter({
  supabaseUrl: "https://test.supabase.co",
  serviceRoleKey: "mock-service-key-not-real",
  fetchImpl,
});

describe("Private assistant writer idempotency and integrity", () => {
  test("derives a stable distinct assistant operation ID", () => {
    expect(assistantOperationId(operationId)).toBe(assistantId);
    expect(assistantId).not.toBe(operationId);
    expect(assistantOperationId(operationId.toUpperCase())).toBe(assistantId);
  });

  test("saves a verified assistant row using server-only credentials", async () => {
    const transport = vi.fn(async () => response(201, [row]));
    const result = await makeWriter(transport).save(input);
    expect(result).toEqual({ id: row.id, content: answer, operationId: assistantId });
    const [url, request] = transport.mock.calls[0];
    expect(url).toContain("/rest/v1/ai_messages");
    expect(request.method).toBe("POST");
    expect(JSON.parse(request.body)).toMatchObject({
      user_id: userId, conversation_id: conversationId,
      operation_id: assistantId, role: "assistant", content: answer,
    });
  });

  test("resolves unique-operation conflict by reading the same persisted row", async () => {
    const transport = vi.fn()
      .mockResolvedValueOnce(response(409, { code: "23505" }))
      .mockResolvedValueOnce(response(200, [row]));
    const result = await makeWriter(transport).save(input);
    expect(result.content).toBe(answer);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[1][1].method).toBe("GET");
    const url = transport.mock.calls[1][0];
    expect(url).toContain("user_id=eq." + userId);
    expect(url).toContain("conversation_id=eq." + conversationId);
    expect(url).toContain("operation_id=eq." + assistantId);
  });

  test("rejects a conflicting row owned by a different user", async () => {
    const transport = vi.fn()
      .mockResolvedValueOnce(response(409, { code: "23505" }))
      .mockResolvedValueOnce(response(200, [{ ...row, user_id: "55555555-5555-4555-8555-555555555555" }]));
    await expect(makeWriter(transport).save(input)).rejects.toThrow("Assistant persistence verification failed.");
  });

  test("rejects conflicting rows in a different conversation or role", async () => {
    for (const changed of [
      { conversation_id: "66666666-6666-4666-8666-666666666666" },
      { role: "user" },
      { operation_id: operationId },
      { content: "" },
    ]) {
      const transport = vi.fn()
        .mockResolvedValueOnce(response(409, { code: "23505" }))
        .mockResolvedValueOnce(response(200, [{ ...row, ...changed }]));
      await expect(makeWriter(transport).save(input)).rejects.toThrow("Assistant persistence verification failed.");
    }
  });

  test("does not treat unrelated database conflicts as idempotent retries", async () => {
    const transport = vi.fn(async () => response(409, { code: "23503" }));
    await expect(makeWriter(transport).save(input)).rejects.toThrow("Assistant persistence failed.");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  test("rejects missing or ambiguous conflict lookup results", async () => {
    for (const rows of [[], [row, row]]) {
      const transport = vi.fn()
        .mockResolvedValueOnce(response(409, { code: "23505" }))
        .mockResolvedValueOnce(response(200, rows));
      await expect(makeWriter(transport).save(input)).rejects.toThrow("Assistant persistence conflict could not be verified.");
    }
  });

  test("rejects a mismatched successful insert response", async () => {
    const transport = vi.fn(async () => response(201, [{ ...row, role: "user" }]));
    await expect(makeWriter(transport).save(input)).rejects.toThrow("Assistant persistence verification failed.");
  });

  test("validates input before making a database request", async () => {
    const transport = vi.fn();
    await expect(makeWriter(transport).save({ ...input, operationId: "invalid" }))
      .rejects.toThrow("Invalid assistant persistence request.");
    await expect(makeWriter(transport).save({ ...input, answer: " " }))
      .rejects.toThrow("Invalid assistant persistence request.");
    expect(transport).not.toHaveBeenCalled();
  });
});
