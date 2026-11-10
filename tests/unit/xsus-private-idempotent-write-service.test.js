import { describe, test, expect, vi } from "vitest";
import { createPrivateIdempotentWriteService, PRIVATE_IDEMPOTENT_WRITE_SERVICE_VERSION } from "../../assets/js/xsus-ai/adapters/xsus-private-idempotent-write-service.js";
const U = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const O = "44444444-4444-4444-8444-444444444444";
const M = "55555555-5555-4555-8555-555555555555";
const input = { operationId: O, conversationId: C, content: "XSUS test" };
function setup() {
  let owner = U, signedIn = true;
  const rows = new Map();
  const calls = { inserts: [], lookups: [] };
  const key = (u, c, o) => [u, c, o].join(":");
  const supabase = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: signedIn ? {} : null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: signedIn ? { id: owner } : null }, error: null }))
    },
    from(table) {
      if (table !== "ai_messages") throw Error("Unexpected table");
      let filters = {}, payload;
      const chain = {
        select() { return this; },
        eq(k, v) { filters[k] = v; return this; },
        insert(data) { payload = data; calls.inserts.push(data); return this; },
        async maybeSingle() {
          calls.lookups.push({ ...filters });
          return { data: rows.get(key(filters.user_id, filters.conversation_id, filters.operation_id)) ?? null, error: null };
        },
        async single() {
          const k = key(payload.user_id, payload.conversation_id, payload.operation_id);
          if (rows.has(k)) return { data: null, error: { code: "23505" } };
          const row = { id: M, user_id: payload.user_id, conversation_id: payload.conversation_id,
            operation_id: payload.operation_id, role: "user", content: payload.content,
            created_at: "2026-11-10T00:00:00.000Z" };
          rows.set(k, row);
          return { data: row, error: null };
        }
      };
      return chain;
    }
  };
  return { rows, calls, supabase, service: createPrivateIdempotentWriteService({ supabase }),
    switchUser(id) { owner = id; }, signOut() { signedIn = false; } };
}
describe("XSUS private idempotent write service integration", () => {
  test("01. version and immutable opt-in surface", () => {
    const h = setup();
    expect(PRIVATE_IDEMPOTENT_WRITE_SERVICE_VERSION).toBe("1.0.0");
    expect(Object.isFrozen(h.service)).toBe(true);
    expect(typeof h.service.save).toBe("function");
  });
  test("02. authenticated write persists operation ID exactly once", async () => {
    const h = setup();
    const saved = await h.service.save(input);
    expect(saved.conversationId).toBe(C);
    expect(h.calls.inserts).toHaveLength(1);
    expect(h.calls.inserts[0]).toMatchObject({ user_id: U, operation_id: O, role: "user" });
  });
  test("03. repeat request reuses result without another write", async () => {
    const h = setup();
    const first = await h.service.save(input);
    expect(await h.service.save(input)).toBe(first);
    expect(h.calls.inserts).toHaveLength(1);
  });
  test("04. same operation with different content is rejected", async () => {
    const h = setup();
    await h.service.save(input);
    await expect(h.service.save({ ...input, content: "Changed" }))
      .rejects.toThrow("Operation ID reused with different content.");
    expect(h.calls.inserts).toHaveLength(1);
  });
  test("05. invalid operation ID never reaches database", async () => {
    const h = setup();
    await expect(h.service.save({ ...input, operationId: "bad" }))
      .rejects.toThrow("Invalid operation ID.");
    expect(h.calls.inserts).toHaveLength(0);
  });
  test("06. sign out prevents writes", async () => {
    const h = setup();
    h.signOut();
    await expect(h.service.save(input)).rejects.toThrow("Authentication required.");
    expect(h.calls.inserts).toHaveLength(0);
  });
  test("07. switching users isolates completed operations", async () => {
    const h = setup();
    await h.service.save(input);
    h.switchUser(B);
    await h.service.save(input);
    expect(h.rows.size).toBe(2);
    expect(h.calls.inserts[1].user_id).toBe(B);
  });
  test("08. invalidate clears local cache but recovers database row", async () => {
    const h = setup();
    const first = await h.service.save(input);
    h.service.invalidate();
    const second = await h.service.save(input);
    expect(second).toEqual(first);
    expect(h.calls.inserts).toHaveLength(1);
  });
  test("09. restart recovers existing database record", async () => {
    const h = setup();
    await h.service.save(input);
    const restarted = createPrivateIdempotentWriteService({ supabase: h.supabase });
    expect(await restarted.save(input)).toMatchObject({ conversationId: C, content: input.content });
    expect(h.calls.inserts).toHaveLength(1);
  });
  test("10. destroyed service rejects future writes", async () => {
    const h = setup();
    h.service.destroy();
    expect(h.service.isDestroyed()).toBe(true);
    await expect(h.service.save(input)).rejects.toThrow("Write coordinator is destroyed.");
  });
  test("11. refuses missing Supabase dependency", () => {
    expect(() => createPrivateIdempotentWriteService()).toThrow(TypeError);
  });
  test("12. operation IDs are generated securely", () => {
    const h = setup();
    expect(h.service.createOperationId()).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i);
  });
});
