import { describe, expect, it } from "vitest";
import { createRecoveryIncidentBackendRuntime } from "../../src/hyper-xsus-core/knowledge-graph/recovery-incident-backend-runtime.js";
function report(revision, assessment) {
  return { revision, total: 1, readOnly: true, automaticRecovery: false,
    counts: { [assessment]: 1 },
    records: [{ id: "r1", assessment, persistedStatus: "executing", safeToRetry: false }] };
}
function fixture({ deny = false, invalidToken = false } = {}) {
  const rows = new Map();
  let reads = 0, writes = 0, verifies = 0;
  const client = {
    from() {
      reads++;
      return { select() { return { eq(_, scope) { return { async maybeSingle() {
        return { data: rows.has(scope) ? { snapshot: structuredClone(rows.get(scope)) } : null, error: null };
      } }; } }; } };
    },
    async rpc(_, { p_scope, p_expected_revision, p_snapshot }) {
      writes++;
      const current = rows.get(p_scope)?.revision ?? 0;
      if (current !== p_expected_revision) return { data: false, error: null };
      rows.set(p_scope, structuredClone(p_snapshot));
      return { data: true, error: null };
    }
  };
  const runtime = createRecoveryIncidentBackendRuntime({
    client,
    verifyIdentity: async ({ token }) => {
      verifies++;
      return token === "valid" && !invalidToken ? { actorId: "auditor" } : null;
    },
    authorizeScope: async ({ actorId, scope }) =>
      !deny && actorId === "auditor" && scope === "graph"
  });
  return { runtime, metrics: () => ({ reads, writes, verifies }) };
}
describe("Hyper XSUS Core — authenticated recovery incident backend runtime", () => {
  it("analyzes, persists and recovers trends across runtime calls", async () => {
    const f = fixture();
    const input = { token: "valid", scope: "graph" };
    const analysis = await f.runtime.analyze({
      ...input, previousReport: report(1, "reconcile"),
      currentReport: report(2, "inconsistent")
    });
    expect(analysis.trend.escalated).toEqual(["r1"]);
    expect(analysis.automaticRecoveryAllowed).toBe(false);
    const saved = await f.runtime.append({ ...input,
      previous: analysis.previous, current: analysis.current });
    expect(saved.persisted).toBe(true);
    const history = await f.runtime.read(input);
    expect(history.entries[0].escalated).toEqual(["r1"]);
  });
  it("rejects invalid tokens before reading the database", async () => {
    const f = fixture({ invalidToken: true });
    await expect(f.runtime.read({ token: "invalid", scope: "graph" }))
      .rejects.toThrow("authentication failed");
    expect(f.metrics().reads).toBe(0);
  });
  it("rejects unauthorized scope before reading or writing", async () => {
    const f = fixture({ deny: true });
    await expect(f.runtime.read({ token: "valid", scope: "graph" }))
      .rejects.toThrow("access denied");
    await expect(f.runtime.analyze({ token: "valid", scope: "graph",
      previousReport: report(1, "reconcile"), currentReport: report(2, "inconsistent") }))
      .rejects.toThrow("access denied");
    expect(f.metrics().reads).toBe(0);
    expect(f.metrics().writes).toBe(0);
  });
  it("rejects invalid configuration", () => {
    expect(() => createRecoveryIncidentBackendRuntime()).toThrow("identity verification");
  });
  it("rejects missing credentials before any database operation", async () => {
    const f = fixture();
    await expect(f.runtime.read({ scope: "graph" })).rejects.toThrow("authentication required");
    expect(f.metrics().reads).toBe(0);
  });
});
