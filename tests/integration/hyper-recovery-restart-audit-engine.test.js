import { describe, expect, it } from "vitest";
import { createRecoveryRestartAuditEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-restart-audit-engine.js";
function setup({ denied = false, fail = null, count = 4 } = {}) {
  const requests = {};
  for (let i = 1; i <= count; i++) requests["r" + i] = {
    id: "r" + i, key: "graph", status: i === 2 ? "executing" : "approved"
  };
  const engine = createRecoveryRestartAuditEngine({
    state: { async snapshot() { return { revision: 7, requests }; } },
    reconciliation: { async inspect({ id }) {
      if (id === fail) throw new Error("offline");
      return id === "r2"
        ? { status: "reconcile", reason: "state-finalization-pending" }
        : { status: "consistent", reason: "approved-awaiting-execution" };
    } },
    authorize: async () => !denied,
    clock: () => 1234, maxBatch: 3
  });
  return { engine, requests };
}
describe("Hyper XSUS Core — restart recovery audit", () => {
  it("paginates deterministic read-only assessments", async () => {
    const { engine } = setup();
    const first = await engine.scan({ actorId: "auditor", limit: 2 });
    expect(first.records.map(x => x.id)).toEqual(["r1", "r2"]);
    expect(first.nextCursor).toBe("r2");
    expect(first.counts).toEqual({ consistent: 1, reconcile: 1 });
    expect(first.readOnly).toBe(true);
    const second = await engine.scan({ actorId: "auditor", cursor: first.nextCursor, limit: 2 });
    expect(second.records.map(x => x.id)).toEqual(["r3", "r4"]);
    expect(second.nextCursor).toBeNull();
  });
  it("isolates individual reconciliation failures", async () => {
    const { engine } = setup({ fail: "r2" });
    const batch = await engine.scan({ actorId: "auditor", limit: 3 });
    expect(batch.records[1]).toMatchObject({
      assessment: "unavailable", reason: "reconciliation-error", safeToRetry: false
    });
    expect(batch.records).toHaveLength(3);
  });
  it("denies unauthorized scans", async () => {
    const { engine } = setup({ denied: true });
    await expect(engine.scan({ actorId: "auditor" })).rejects.toThrow("access denied");
  });
  it("does not mutate persisted requests", async () => {
    const { engine, requests } = setup();
    const before = JSON.stringify(requests);
    const batch = await engine.scan({ actorId: "auditor" });
    expect(JSON.stringify(requests)).toBe(before);
    expect(Object.isFrozen(batch.records)).toBe(true);
  });
  it("rejects malformed pagination and excessive batch sizes", async () => {
    const { engine } = setup();
    await expect(engine.scan({ actorId: "auditor", limit: 4 })).rejects.toThrow("Invalid");
    await expect(engine.scan({ actorId: "auditor", cursor: "../bad" })).rejects.toThrow("Invalid");
  });
  it("handles empty persisted state", async () => {
    const { engine } = setup({ count: 0 });
    const batch = await engine.scan({ actorId: "auditor" });
    expect(batch.records).toEqual([]);
    expect(batch.nextCursor).toBeNull();
  });
  it("rejects invalid dependencies", () => {
    expect(() => createRecoveryRestartAuditEngine()).toThrow("requires");
  });
});
