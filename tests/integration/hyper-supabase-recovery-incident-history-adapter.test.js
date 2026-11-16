import { describe, expect, it } from "vitest";
import { createSupabaseRecoveryIncidentHistoryAdapter } from "../../src/hyper-xsus-core/knowledge-graph/supabase-recovery-incident-history-adapter.js";
function fixture() {
  const rows = new Map();
  let rpcCalls = 0;
  const client = {
    from(table) {
      if (table !== "xsus_recovery_incident_histories") throw Error("Unexpected table");
      return { select(column) {
        if (column !== "snapshot") throw Error("Unexpected column");
        return { eq(key, scope) {
          if (key !== "scope") throw Error("Unexpected key");
          return { async maybeSingle() {
            const snapshot = rows.get(scope);
            return { data: snapshot ? { snapshot: structuredClone(snapshot) } : null, error: null };
          } };
        } };
      } };
    },
    async rpc(name, params) {
      rpcCalls++;
      if (name !== "xsus_recovery_incident_history_cas") throw Error("Unexpected RPC");
      const { p_scope, p_expected_revision, p_snapshot } = params;
      const current = rows.get(p_scope)?.revision ?? 0;
      if (current !== p_expected_revision) return { data: false, error: null };
      rows.set(p_scope, structuredClone(p_snapshot));
      return { data: true, error: null };
    }
  };
  return { adapter: createSupabaseRecoveryIncidentHistoryAdapter({ client }),
    rows, calls: () => rpcCalls };
}
describe("Hyper XSUS Core — Supabase recovery incident history adapter", () => {
  it("returns an empty initial history and persists a CAS snapshot", async () => {
    const f = fixture();
    expect(await f.adapter.read("graph")).toEqual({ revision: 0, entries: [] });
    expect(await f.adapter.compareAndSwap("graph", 0, { revision: 1, entries: [{}] })).toBe(true);
    expect(await f.adapter.read("graph")).toEqual({ revision: 1, entries: [{}] });
  });
  it("rejects stale writes without overwriting stored data", async () => {
    const f = fixture();
    await f.adapter.compareAndSwap("graph", 0, { revision: 1, entries: [{}] });
    expect(await f.adapter.compareAndSwap("graph", 0, { revision: 1, entries: [{}] })).toBe(false);
    expect((await f.adapter.read("graph")).revision).toBe(1);
  });
  it("rejects invalid scopes and revisions before RPC", async () => {
    const f = fixture();
    await expect(f.adapter.compareAndSwap("../graph", 0, { revision: 1, entries: [] }))
      .rejects.toThrow("scope");
    await expect(f.adapter.compareAndSwap("graph", 0, { revision: 4, entries: [] }))
      .rejects.toThrow("CAS");
    expect(f.calls()).toBe(0);
  });
  it("does not expose internal database error details", async () => {
    const adapter = createSupabaseRecoveryIncidentHistoryAdapter({
      client: {
        from: () => ({ select: () => ({ eq: () => ({
          maybeSingle: async () => ({ data: null, error: { message: "private database detail" } })
        }) }) }),
        rpc: async () => ({ data: null, error: { message: "private database detail" } })
      }
    });
    await expect(adapter.read("graph")).rejects.toThrow("read failed");
    await expect(adapter.compareAndSwap("graph", 0, { revision: 1, entries: [] }))
      .rejects.toThrow("compare-and-swap failed");
  });
  it("rejects invalid stored snapshots", async () => {
    const f = fixture();
    f.rows.set("graph", { revision: "corrupted", entries: [] });
    await expect(f.adapter.read("graph")).rejects.toThrow("integrity");
  });
});
