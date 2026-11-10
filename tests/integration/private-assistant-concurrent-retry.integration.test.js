import { describe, it, expect, vi } from "vitest";
import { createAssistantMessageWriter, assistantOperationId } from "../../src/server/assistant-message-writer.js";

const USER = "550e8400-e29b-41d4-a716-446655440000";
const CONV = "550e8400-e29b-41d4-a716-446655440001";
const OP = "550e8400-e29b-41d4-a716-446655440002";
const input = { userId: USER, conversationId: CONV, operationId: OP, answer: "Generated answer" };
const response = (status, payload) => ({ status, ok: status >= 200 && status < 300, json: async () => payload });

function fixture() {
  const records = new Map();
  let inserts = 0;
  let failRead = false;
  const fetchImpl = vi.fn(async (_url, options) => {
    // Force an asynchronous interleaving, including concurrent requests.
    await Promise.resolve();
    if (options.method === "GET") {
      if (failRead) return response(503, { code: "OUTAGE" });
      const record = records.get(assistantOperationId(OP));
      return response(200, record ? [record] : []);
    }
    const data = JSON.parse(options.body);
    if (records.has(data.operation_id)) return response(409, { code: "23505" });
    const row = { id: "550e8400-e29b-41d4-a716-446655440003", ...data };
    records.set(data.operation_id, row);
    inserts++;
    return response(201, [row]);
  });
  const writer = createAssistantMessageWriter({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "mock-only-secret",
    fetchImpl
  });
  return { writer, fetchImpl, records, inserts: () => inserts, failRead: () => { failRead = true; } };
}

describe("Privileged assistant concurrent retry safety (mock database)", () => {
  it("handles concurrent identical writes with one persisted record", async () => {
    const x = fixture();
    const results = await Promise.all(Array.from({ length: 8 }, () => x.writer.save(input)));
    expect(results.every(r => r.content === input.answer)).toBe(true);
    expect(x.inserts()).toBe(1);
    expect(x.records.size).toBe(1);
  });
  it("returns original persisted answer on a conflicting retry", async () => {
    const x = fixture();
    const first = await x.writer.save(input);
    const second = await x.writer.save({ ...input, answer: "Different regeneration" });
    expect(second.content).toBe(first.content);
    expect(x.inserts()).toBe(1);
  });
  it("fails closed if a conflict cannot be verified due to database outage", async () => {
    const x = fixture();
    await x.writer.save(input);
    x.failRead();
    await expect(x.writer.save(input)).rejects.toThrow("Assistant persistence conflict could not be verified.");
    expect(x.inserts()).toBe(1);
  });
});
