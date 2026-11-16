import { describe, expect, it } from "vitest";
import { createRecoveryIncidentTriageEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-incident-triage-engine.js";
import { createRecoveryAuditReportEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-report-engine.js";
function report(assessments) {
  const counts = {};
  const records = assessments.map((assessment, i) => {
    counts[assessment] = (counts[assessment] ?? 0) + 1;
    return { id: "r" + String(i).padStart(3, "0"), assessment,
      persistedStatus: "executing", safeToRetry: false };
  });
  return { revision: 4, total: records.length, records, counts,
    readOnly: true, automaticRecovery: false };
}
describe("Hyper XSUS Core — recovery incident triage", () => {
  it("classifies and sorts critical, high and medium incidents", () => {
    const triage = createRecoveryIncidentTriageEngine();
    const result = triage.assess(report([
      "consistent", "reconcile", "unavailable", "inconsistent", "invalid", "missing"
    ]));
    expect(result.incidents.map(x => x.priority)).toEqual([
      "critical", "critical", "high", "high", "medium"
    ]);
    expect(result.summary).toEqual({ critical: 2, high: 2, medium: 1 });
    expect(result.highestPriority).toBe("critical");
    expect(result.incidents.every(x => x.automaticRecoveryAllowed === false)).toBe(true);
    expect(Object.isFrozen(result.incidents)).toBe(true);
  });
  it("reports no incidents for consistent records", () => {
    const result = createRecoveryIncidentTriageEngine().assess(report(["consistent"]));
    expect(result.incidents).toEqual([]);
    expect(result.highestPriority).toBe("none");
  });
  it("handles an empty report", () => {
    const result = createRecoveryIncidentTriageEngine().assess(report([]));
    expect(result.total).toBe(0);
    expect(result.incidentCount).toBe(0);
  });
  it("rejects forged report counts", () => {
    const bad = report(["inconsistent"]);
    bad.counts.inconsistent = 0;
    expect(() => createRecoveryIncidentTriageEngine().assess(bad)).toThrow("Invalid");
  });
  it("rejects unsorted and duplicate records", () => {
    const bad = report(["consistent", "reconcile"]);
    bad.records[1].id = bad.records[0].id;
    expect(() => createRecoveryIncidentTriageEngine().assess(bad)).toThrow("Invalid");
  });
  it("rejects reports that claim automatic recovery is allowed", () => {
    const bad = report(["reconcile"]);
    bad.records[0].safeToRetry = true;
    expect(() => createRecoveryIncidentTriageEngine().assess(bad)).toThrow("Invalid");
  });
  it("rejects oversized reports and invalid limits", () => {
    expect(() => createRecoveryIncidentTriageEngine({ maxRecords: 0 })).toThrow("configuration");
    expect(() => createRecoveryIncidentTriageEngine({ maxRecords: 1 })
      .assess(report(["consistent", "consistent"]))).toThrow("Invalid");
  });
  it("integrates with a real generated audit report", async () => {
    const engine = createRecoveryAuditReportEngine({
      authorize: async () => true, pageSize: 2,
      sessionFactory: () => ({
        async begin() { return { revision: 5, total: 3 }; },
        async page({ offset, limit }) {
          const values = ["consistent", "reconcile", "inconsistent"];
          return { revision: 5, total: 3,
            records: values.slice(offset, offset + limit).map((assessment, i) => ({
              id: "r" + (offset + i), assessment, persistedStatus: "executing"
            })),
            nextOffset: offset + limit < 3 ? offset + limit : null };
        }
      })
    });
    const generated = await engine.generate({ actorId: "auditor" });
    const result = createRecoveryIncidentTriageEngine().assess(generated);
    expect(result.summary).toEqual({ critical: 1, high: 0, medium: 1 });
  });
});
