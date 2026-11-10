import { describe, test, expect, vi } from "vitest";
import {
  createIdempotentMessageWriteAdapter, IDEMPOTENT_MESSAGE_WRITE_VERSION
} from "../../assets/js/xsus-ai/adapters/xsus-idempotent-message-write-adapter.js";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const CONVERSATION = "33333333-3333-4333-8333-333333333333";
const OPERATION = "44444444-4444-4444-8444-444444444444";
const MESSAGE = "55555555-5555-4555-8555-555555555555";
const input = { operationId: OPERATION, conversationId: CONVERSATION, content: "Hello XSUS" };
const row = (overrides = {}) => ({
  id: MESSAGE, user_id: USER, conversation_id: CONVERSATION,
  operation_id: OPERATION, role: "user", content: "Hello XSUS", ...overrides
});
function harness(overrides = {}) {
  const getUserId = vi.fn(async () => USER);
  const insertMessage = vi.fn(async () => row());
  const findMessage = vi.fn(async () => null);
  const deps = { getUserId, insertMessage, findMessage, ...overrides };
  return { ...deps, adapter: createIdempotentMessageWriteAdapter(deps) };
}
describe("XSUS idempotent message write adapter", () => {
  test("01. preserves isolated frozen API v1.0.0", () => {
    const { adapter } = harness();
    expect(IDEMPOTENT_MESSAGE_WRITE_VERSION).toBe("1.0.0");
    expect(Object.keys(adapter)).toEqual(["save"]);
    expect(Object.isFrozen(adapter)).toBe(true);
  });
  test("02. inserts once with authenticated owner and stable operation ID", async () => {
    const h = harness();
    expect(await h.adapter.save(input)).toEqual(row());
    expect(h.insertMessage).toHaveBeenCalledExactlyOnceWith({
      operationId: OPERATION, conversationId: CONVERSATION,
      content: "Hello XSUS", userId: USER
    });
  });
  test("03. returns matching existing row without inserting", async () => {
    const h = harness({ findMessage: vi.fn(async () => row()) });
    expect(await h.adapter.save(input)).toEqual(row());
    expect(h.insertMessage).not.toHaveBeenCalled();
  });
  test("04. resolves UNIQUE conflict by verifying persisted row", async () => {
    const h = harness({
      insertMessage: vi.fn(async () => { throw { code: "23505" }; }),
      findMessage: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(row())
    });
    expect(await h.adapter.save(input)).toEqual(row());
    expect(h.findMessage).toHaveBeenCalledTimes(2);
  });
  test("05. rejects conflicting content on operation reuse", async () => {
    const h = harness({ findMessage: vi.fn(async () => row({ content: "Different" })) });
    await expect(h.adapter.save(input)).rejects.toThrow("Stored operation does not match request.");
    expect(h.insertMessage).not.toHaveBeenCalled();
  });
  test("06. rejects a record belonging to another user", async () => {
    const h = harness({ findMessage: vi.fn(async () => row({ user_id: OTHER })) });
    await expect(h.adapter.save(input)).rejects.toThrow("Stored operation does not match request.");
  });
  test("07. rejects a record belonging to another conversation", async () => {
    const h = harness({ insertMessage: vi.fn(async () => row({ conversation_id: OTHER })) });
    await expect(h.adapter.save(input)).rejects.toThrow("Stored operation does not match request.");
  });
  test("08. rejects an assistant role returned by persistence", async () => {
    const h = harness({ insertMessage: vi.fn(async () => row({ role: "assistant" })) });
    await expect(h.adapter.save(input)).rejects.toThrow("Stored operation does not match request.");
  });
  test("09. propagates non-uniqueness database errors", async () => {
    const error = Object.assign(new Error("Unavailable"), { code: "08006" });
    const h = harness({ insertMessage: vi.fn(async () => { throw error; }) });
    await expect(h.adapter.save(input)).rejects.toBe(error);
  });
  test("10. rejects UNIQUE conflict without a verified row", async () => {
    const h = harness({ insertMessage: vi.fn(async () => { throw { code: "23505" }; }) });
    await expect(h.adapter.save(input)).rejects.toThrow("Duplicate operation could not be verified.");
  });
  test("11. validates input before accessing authentication or storage", async () => {
    const h = harness();
    await expect(h.adapter.save({ ...input, operationId: "invalid" })).rejects.toThrow("Invalid operation ID.");
    await expect(h.adapter.save({ ...input, content: "  " })).rejects.toThrow("Invalid message content.");
    expect(h.getUserId).not.toHaveBeenCalled();
    expect(h.insertMessage).not.toHaveBeenCalled();
  });
  test("12. rejects authentication changes after lookup", async () => {
    const getUserId = vi.fn().mockResolvedValueOnce(USER).mockResolvedValueOnce(OTHER);
    const h = harness({ getUserId });
    await expect(h.adapter.save(input)).rejects.toThrow("Authentication changed during message write.");
    expect(h.insertMessage).not.toHaveBeenCalled();
  });
  test("13. rejects authentication changes after insertion", async () => {
    const getUserId = vi.fn().mockResolvedValueOnce(USER).mockResolvedValueOnce(USER).mockResolvedValueOnce(OTHER);
    const h = harness({ getUserId });
    await expect(h.adapter.save(input)).rejects.toThrow("Authentication changed during message write.");
  });
  test("14. rejects malformed persisted message IDs", async () => {
    const h = harness({ insertMessage: vi.fn(async () => row({ id: "bad" })) });
    await expect(h.adapter.save(input)).rejects.toThrow("Invalid stored message ID.");
  });
  test("15. requires all three injected dependencies", () => {
    expect(() => createIdempotentMessageWriteAdapter()).toThrow(TypeError);
  });
});
