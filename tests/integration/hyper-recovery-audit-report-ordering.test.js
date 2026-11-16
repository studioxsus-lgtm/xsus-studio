import { describe, expect, it } from "vitest";
import { createRecoveryAuditReportEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-report-engine.js";
function makeEngine(ids, { mutate = false, revisionDrift = false } = {}) {
  let calls = 0;
  return createRecoveryAuditReportEngine({
    authorize: async () => true,
    maxRecords: 10000,
    pageSize: 2,
    clock: () => 123,
    sessionFactory: () => ({
      async begin() { return { revision: 3, total: ids.length }; },
      async page({ offset, limit }) {
        calls++;
        if (mutate && calls === 2) {
          // Reorder only the unread page: no duplicate IDs, so ordering
          // validation (rather than duplicate detection) must reject it.
          [ids[2], ids[3]] = [ids[3], ids[2]];
        }
        return {
          revision: revisionDrift && calls === 2 ? 4 : 3,
          total: ids.length,
          records: ids.slice(offset, offset + limit).map(id => ({
            id, assessment: "consistent", persistedStatus: "approved"
          })),
          nextOffset: offset + limit < ids.length ? offset + limit : null
        };
      }
    })
  });
}
describe("Hyper XSUS Core — audit report ordering and scale", () => {
  it("rejects reordered records within a page", async () => {
    await expect(makeEngine(["r2", "r1"]).generate({ actorId: "auditor" }))
      .rejects.toThrow("order consistency");
  });
  it("rejects out-of-order pages even without duplicate IDs", async () => {
    await expect(makeEngine(["r1", "r3", "r2", "r4"]).generate({ actorId: "auditor" }))
      .rejects.toThrow("order consistency");
  });
  it("rejects records reordered while pages are fetched", async () => {
    await expect(makeEngine(["r1", "r2", "r3", "r4"], { mutate: true })
      .generate({ actorId: "auditor" })).rejects.toThrow("order consistency");
  });
  it("produces bounded large reports in sorted order", async () => {
    const ids = Array.from({ length: 200 }, (_, i) => "r" + String(i).padStart(4, "0"));
    const report = await makeEngine(ids).generate({ actorId: "auditor" });
    expect(report.total).toBe(200);
    expect(report.records.map(record => record.id)).toEqual(ids);
    expect(report.counts).toEqual({ consistent: 200 });
  });
  it("does not return a partial report when the revision changes", async () => {
    await expect(makeEngine(["r1", "r2", "r3"], { revisionDrift: true })
      .generate({ actorId: "auditor" })).rejects.toThrow("consistency");
  });
});
