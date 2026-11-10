import { describe, test, expect, vi } from "vitest";
import { createIdempotentMessageWriteAdapter } from "../../assets/js/xsus-ai/adapters/xsus-idempotent-message-write-adapter.js";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const CONVERSATION = "33333333-3333-4333-8333-333333333333";
const OPERATION = "44444444-4444-4444-8444-444444444444";
const MESSAGE = "55555555-5555-4555-8555-555555555555";
const request = { conversationId: CONVERSATION, operationId: OPERATION, content: "Recovery message" };
const record = (overrides = {}) => ({
  id: MESSAGE, user_id: USER, conversation_id: CONVERSATION,
  operation_id: OPERATION, role: "user", content: request.content, ...overrides
});
function createStore() {
  const rows = new Map();
  const key = ({ userId, conversationId, operationId }) =>
    [userId, conversationId, operationId].join(":");
  return { rows, key };
}
function adapter(store, options = {}) {
  const getUserId = options.getUserId ?? vi.fn(async () => USER);
  const findMessage = vi.fn(async (input) => store.rows.get(store.key(input)) ?? null);
  const insertMessage = vi.fn(async (input) => {
    const k = store.key(input);
    if (store.rows.has(k)) throw Object.assign(new Error("duplicate"), { code: "23505" });
    const saved = record({ user_id: input.userId, conversation_id: input.conversationId,
      operation_id: input.operationId, content: input.content });
    store.rows.set(k, saved);
    if (options.lostResponse) throw Object.assign(new Error("connection lost"), { code: "08006" });
    return saved;
  });
  return { api: createIdempotentMessageWriteAdapter({ getUserId, findMessage, insertMessage }),
    getUserId, findMessage, insertMessage };
}
describe("XSUS idempotent persistence recovery", () => {
  test("01. lost response propagates, but committed message remains recoverable", async () => {
    const store = createStore();
    const first = adapter(store, { lostResponse: true });
    await expect(first.api.save(request)).rejects.toMatchObject({ code: "08006" });
    expect(store.rows.size).toBe(1);
    const retry = adapter(store);
    expect(await retry.api.save(request)).toEqual(record());
    expect(retry.insertMessage).not.toHaveBeenCalled();
  });
  test("02. repeated retry does not add another message", async () => {
    const store = createStore();
    const a = adapter(store);
    for (let i = 0; i < 5; i++) expect(await a.api.save(request)).toEqual(record());
    expect(store.rows.size).toBe(1);
    expect(a.insertMessage).toHaveBeenCalledTimes(1);
  });
  test("03. new adapter instance recovers persisted operation", async () => {
    const store = createStore();
    await adapter(store).api.save(request);
    const restarted = adapter(store);
    expect(await restarted.api.save(request)).toEqual(record());
    expect(restarted.insertMessage).not.toHaveBeenCalled();
  });
  test("04. conflicting retry content is rejected without mutation", async () => {
    const store = createStore();
    await adapter(store).api.save(request);
    await expect(adapter(store).api.save({ ...request, content: "Different" }))
      .rejects.toThrow("Stored operation does not match request.");
    expect(store.rows.size).toBe(1);
    expect([...store.rows.values()][0].content).toBe(request.content);
  });
  test("05. same operation ID in different conversations is distinct", async () => {
    const store = createStore();
    await adapter(store).api.save(request);
    const next = { ...request, conversationId: "66666666-6666-4666-8666-666666666666" };
    await adapter(store).api.save(next);
    expect(store.rows.size).toBe(2);
  });
  test("06. authenticated users are isolated by operation scope", async () => {
    const store = createStore();
    await adapter(store).api.save(request);
    const second = adapter(store, { getUserId: vi.fn(async () => OTHER) });
    const saved = await second.api.save(request);
    expect(saved.user_id).toBe(OTHER);
    expect(store.rows.size).toBe(2);
  });
  test("07. concurrent identical writes resolve to one persisted row", async () => {
    const store = createStore();
    const a = adapter(store);
    const b = adapter(store);
    const results = await Promise.all([a.api.save(request), b.api.save(request)]);
    expect(results).toEqual([record(), record()]);
    expect(store.rows.size).toBe(1);
  });
  test("08. recovery rejects mismatched stored ownership", async () => {
    const store = createStore();
    store.rows.set(store.key({ userId: USER, ...request }), record({ user_id: OTHER }));
    await expect(adapter(store).api.save(request))
      .rejects.toThrow("Stored operation does not match request.");
  });
  test("09. auth switch before insert prevents any persisted write", async () => {
    const store = createStore();
    const getUserId = vi.fn().mockResolvedValueOnce(USER).mockResolvedValueOnce(OTHER);
    await expect(adapter(store, { getUserId }).api.save(request))
      .rejects.toThrow("Authentication changed during message write.");
    expect(store.rows.size).toBe(0);
  });
  test("10. different operation IDs allow separate messages", async () => {
    const store = createStore();
    await adapter(store).api.save(request);
    await adapter(store).api.save({ ...request, operationId: "77777777-7777-4777-8777-777777777777" });
    expect(store.rows.size).toBe(2);
  });
});
