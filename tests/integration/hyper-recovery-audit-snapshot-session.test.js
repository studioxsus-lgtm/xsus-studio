import { describe, expect, it } from "vitest";
import { createRecoveryAuditSnapshotSession } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-snapshot-session.js";
function fixture({ count = 5, denied = false, mutateDuringInspection = false } = {}) {
  const requests = {};
  for (let i = 1; i <= count; i++) requests["r" + i] = {
    id: "r" + i, key: "graph", status: i % 2 ? "approved" : "executing"
  };
  let revision = 1;
  const engine = createRecoveryAuditSnapshotSession({
    state: { async snapshot() { return { revision, requests }; } },
    reconciliation: { async inspect({ id }) {
      if (mutateDuringInspection && id === "r1") revision++;
      return { status: "consistent", reason: "checked" };
    } },
    authorize: async () => !denied,
    clock: () => 1000,
    maxPageSize: 2, maxRecords: 10
  });
  return { engine, change() { revision++; }, requests };
}
describe("Hyper XSUS Core — revision-consistent recovery audit session", () => {
  it("returns deterministic pages within the same revision", async () => {
    const f = fixture();
    expect(await f.engine.begin({ actorId: "auditor" })).toMatchObject({
      revision: 1, total: 5
    });
    const a = await f.engine.page({ actorId: "auditor" });
    expect(a.records.map(r => r.id)).toEqual(["r1", "r2"]);
    expect(a.nextOffset).toBe(2);
    const b = await f.engine.page({ actorId: "auditor", offset: 2 });
    expect(b.records.map(r => r.id)).toEqual(["r3", "r4"]);
    const c = await f.engine.page({ actorId: "auditor", offset: 4 });
    expect(c.records.map(r => r.id)).toEqual(["r5"]);
    expect(c.nextOffset).toBeNull();
  });
  it("invalidates the session after persisted revision changes", async () => {
    const f = fixture();
    await f.engine.begin({ actorId: "auditor" });
    f.change();
    await expect(f.engine.page({ actorId: "auditor" }))
      .rejects.toMatchObject({ code: "RECOVERY_AUDIT_REVISION_CHANGED" });
    await expect(f.engine.page({ actorId: "auditor" })).rejects.toThrow("not started");
  });
  it("detects changes during slow reconciliation inspection", async () => {
    const f = fixture({ mutateDuringInspection: true });
    await f.engine.begin({ actorId: "auditor" });
    await expect(f.engine.page({ actorId: "auditor" }))
      .rejects.toMatchObject({ code: "RECOVERY_AUDIT_REVISION_CHANGED" });
  });
  it("rejects unauthorized access", async () => {
    const f = fixture({ denied: true });
    await expect(f.engine.begin({ actorId: "auditor" })).rejects.toThrow("access denied");
  });
  it("prevents a different actor from reading a session", async () => {
    const f = fixture();
    await f.engine.begin({ actorId: "auditor" });
    await expect(f.engine.page({ actorId: "other" })).rejects.toThrow("Invalid");
  });
  it("handles empty snapshots and bounds", async () => {
    const f = fixture({ count: 0 });
    await f.engine.begin({ actorId: "auditor" });
    const result = await f.engine.page({ actorId: "auditor" });
    expect(result.records).toEqual([]);
    expect(result.nextOffset).toBeNull();
    await expect(f.engine.page({ actorId: "auditor", limit: 3 })).rejects.toThrow("Invalid");
  });
  it("returns read-only records without mutating persisted state", async () => {
    const f = fixture();
    const before = JSON.stringify(f.requests);
    await f.engine.begin({ actorId: "auditor" });
    const result = await f.engine.page({ actorId: "auditor" });
    expect(Object.isFrozen(result.records)).toBe(true);
    expect(result.records.every(r => r.safeToRetry === false)).toBe(true);
    expect(JSON.stringify(f.requests)).toBe(before);
  });
  it("rejects invalid configuration", () => {
    expect(() => createRecoveryAuditSnapshotSession()).toThrow("configuration");
  });
});
