import { describe, expect, it } from "vitest";
import { createRecoveryAuditReportEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-report-engine.js";
function fixture({ count = 5, denied = false, corrupt = false, duplicate = false } = {}) {
  let calls = 0;
  const factory = () => ({
    async begin() { return { revision: 7, total: count }; },
    async page({ offset, limit }) {
      calls++;
      const records = Array.from({ length: Math.min(limit, count - offset) },
        (_, i) => ({ id: duplicate ? "same" : "r" + (offset + i),
          assessment: (offset + i) % 2 ? "reconcile" : "consistent",
          persistedStatus: "executing" }));
      return { revision: corrupt && calls === 2 ? 8 : 7,
        total: count, records, nextOffset: offset + records.length < count
          ? offset + records.length : null };
    }
  });
  return { engine: createRecoveryAuditReportEngine({
    sessionFactory: factory, authorize: async () => !denied,
    clock: () => 1234, pageSize: 2, maxRecords: 10
  }), calls: () => calls };
}
describe("Hyper XSUS Core — recovery audit report engine", () => {
  it("builds a bounded immutable report across multiple pages", async () => {
    const f = fixture();
    const report = await f.engine.generate({ actorId: "auditor" });
    expect(report).toMatchObject({
      revision: 7, total: 5, counts: { consistent: 3, reconcile: 2 },
      readOnly: true, automaticRecovery: false
    });
    expect(report.records.map(x => x.id)).toEqual(["r0", "r1", "r2", "r3", "r4"]);
    expect(report.records.every(x => x.safeToRetry === false)).toBe(true);
    expect(Object.isFrozen(report.records)).toBe(true);
    expect(f.calls()).toBe(3);
  });
  it("rejects a changed revision mid-report", async () => {
    await expect(fixture({ corrupt: true }).engine.generate({ actorId: "auditor" }))
      .rejects.toThrow("consistency");
  });
  it("rejects duplicate records across pages", async () => {
    await expect(fixture({ duplicate: true }).engine.generate({ actorId: "auditor" }))
      .rejects.toThrow("repeated");
  });
  it("checks authorization before starting a report", async () => {
    const f = fixture({ denied: true });
    await expect(f.engine.generate({ actorId: "auditor" })).rejects.toThrow("access denied");
    expect(f.calls()).toBe(0);
  });
  it("handles an empty audit without fabricating records", async () => {
    const result = await fixture({ count: 0 }).engine.generate({ actorId: "auditor" });
    expect(result.total).toBe(0);
    expect(result.records).toEqual([]);
    expect(result.counts).toEqual({});
  });
  it("validates configuration and actor identity", async () => {
    expect(() => createRecoveryAuditReportEngine()).toThrow("configuration");
    await expect(fixture().engine.generate({ actorId: "../bad" }))
      .rejects.toThrow("Invalid");
  });
});
