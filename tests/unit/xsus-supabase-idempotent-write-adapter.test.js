import { describe, test, expect, vi } from "vitest";
import {
  createSupabaseIdempotentWriteAdapter, SUPABASE_IDEMPOTENT_WRITE_VERSION
} from "../../assets/js/xsus-ai/adapters/xsus-supabase-idempotent-write-adapter.js";

const U = "11111111-1111-4111-8111-111111111111";
const C = "33333333-3333-4333-8333-333333333333";
const O = "44444444-4444-4444-8444-444444444444";
const M = "55555555-5555-4555-8555-555555555555";
const T = "2026-11-09T12:00:00.000Z";
const request = { operationId: O, conversationId: C, content: "Hello XSUS" };
const record = { id: M, user_id: U, conversation_id: C, operation_id: O, role: "user", content: "Hello XSUS", created_at: T };
function harness({ existing = null, insertError = null, session = true } = {}) {
  const calls = { select: [], insert: [], eq: [] };
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: session ? {} : null }, error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: U } }, error: null }))
    },
    from: vi.fn((table) => {
      const query = {
        select(fields) { calls.select.push(fields); return this; },
        eq(field, value) { calls.eq.push([field, value]); return this; },
        async maybeSingle() { return { data: existing, error: null }; },
        insert(payload) { calls.insert.push(payload); return this; },
        async single() { return { data: insertError ? null : record, error: insertError }; }
      };
      expect(table).toBe("ai_messages");
      return query;
    })
  };
  return { client, calls, adapter: createSupabaseIdempotentWriteAdapter({ supabase: client }) };
}
describe("XSUS Supabase idempotent write bridge", () => {
  test("01. exposes frozen opt-in v1.0.0 API", () => {
    const { adapter } = harness();
    expect(SUPABASE_IDEMPOTENT_WRITE_VERSION).toBe("1.0.0");
    expect(Object.keys(adapter)).toEqual(["save"]);
    expect(Object.isFrozen(adapter)).toBe(true);
  });
  test("02. inserts authenticated user message with stable operation ID", async () => {
    const h = harness();
    const result = await h.adapter.save(request);
    expect(result.id).toBe(M);
    expect(result.conversationId).toBe(C);
    expect(h.calls.insert).toEqual([{
      user_id: U, conversation_id: C, operation_id: O, role: "user", content: "Hello XSUS"
    }]);
  });
  test("03. returns existing operation without duplicate insert", async () => {
    const h = harness({ existing: record });
    expect((await h.adapter.save(request)).id).toBe(M);
    expect(h.calls.insert).toHaveLength(0);
  });
  test("04. scopes lookup by authenticated user, conversation, operation", async () => {
    const h = harness();
    await h.adapter.save(request);
    expect(h.calls.eq).toEqual([
      ["user_id", U], ["conversation_id", C], ["operation_id", O]
    ]);
  });
  test("05. rejects unauthenticated sessions before database access", async () => {
    const h = harness({ session: false });
    await expect(h.adapter.save(request)).rejects.toThrow("Authentication required.");
    expect(h.client.from).not.toHaveBeenCalled();
  });
  test("06. propagates database failures other than unique conflict", async () => {
    const error = Object.assign(new Error("DB unavailable"), { code: "08006" });
    const h = harness({ insertError: error });
    await expect(h.adapter.save(request)).rejects.toBe(error);
  });
  test("07. rejects invalid operation ID without database access", async () => {
    const h = harness();
    await expect(h.adapter.save({ ...request, operationId: "bad" }))
      .rejects.toThrow("Invalid operation ID.");
    expect(h.client.from).not.toHaveBeenCalled();
  });
  test("08. rejects conflicting existing payload", async () => {
    const h = harness({ existing: { ...record, content: "Changed" } });
    await expect(h.adapter.save(request)).rejects.toThrow("Stored operation does not match request.");
    expect(h.calls.insert).toHaveLength(0);
  });
  test("09. requires an authenticated Supabase client dependency", () => {
    expect(() => createSupabaseIdempotentWriteAdapter()).toThrow(TypeError);
  });
});
