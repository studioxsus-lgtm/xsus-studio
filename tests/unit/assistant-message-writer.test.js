import { describe, it, expect, vi } from "vitest";
import { assistantOperationId, createAssistantMessageWriter } from "../../src/server/assistant-message-writer.js";
const USER = "550e8400-e29b-41d4-a716-446655440000";
const CONV = "550e8400-e29b-41d4-a716-446655440001";
const OP = "550e8400-e29b-41d4-a716-446655440002";
const row = { id: "550e8400-e29b-41d4-a716-446655440003", user_id: USER, conversation_id: CONV, operation_id: assistantOperationId(OP), role: "assistant", content: "Answer" };
const response = (status, payload) => ({ ok: status >= 200 && status < 300, status, json: async () => payload });
const make = (...responses) => {
  const fetchImpl = vi.fn().mockImplementation(async () => responses.shift());
  return { writer: createAssistantMessageWriter({ supabaseUrl: "https://example.supabase.co", serviceRoleKey: "test-server-secret", fetchImpl }), fetchImpl };
};
const input = { userId: USER, conversationId: CONV, operationId: OP, answer: "Answer" };
describe("Assistant server-only persistence adapter", () => {
  it("derives stable distinct assistant operation ID", () => {
    expect(assistantOperationId(OP)).toBe(assistantOperationId(OP));
    expect(assistantOperationId(OP)).not.toBe(OP);
  });
  it("rejects invalid operation ID", () => expect(() => assistantOperationId("bad")).toThrow());
  it("requires server configuration", () => expect(() => createAssistantMessageWriter()).toThrow());
  it("persists only assistant role and server-provided answer", async () => {
    const { writer, fetchImpl } = make(response(201, [row]));
    expect((await writer.save(input)).content).toBe("Answer");
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body.role).toBe("assistant");
    expect(body.content).toBe("Answer");
    expect(body.operation_id).toBe(assistantOperationId(OP));
  });
  it("resolves unique operation retry from verified existing record", async () => {
    const { writer } = make(response(409, { code: "23505" }), response(200, [row]));
    expect((await writer.save({ ...input, answer: "Regenerated answer" })).content).toBe("Answer");
  });
  it("rejects unrelated conflict", async () => {
    const { writer } = make(response(409, { code: "23503" }));
    await expect(writer.save(input)).rejects.toThrow();
  });
  it("rejects ownership mismatch in returned record", async () => {
    const { writer } = make(response(201, [{ ...row, user_id: CONV }]));
    await expect(writer.save(input)).rejects.toThrow();
  });
  it("rejects role mismatch in returned record", async () => {
    const { writer } = make(response(201, [{ ...row, role: "user" }]));
    await expect(writer.save(input)).rejects.toThrow();
  });
  it("rejects invalid assistant response", async () => {
    const { writer, fetchImpl } = make();
    await expect(writer.save({ ...input, answer: " " })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects database errors without leaking credentials", async () => {
    const { writer } = make(response(500, { message: "secret" }));
    await expect(writer.save(input)).rejects.toThrow("Assistant persistence failed.");
  });
});
