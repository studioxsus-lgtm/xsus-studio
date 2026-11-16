import { describe, expect, it } from "vitest";
import { createRecoveryAuditReportEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-report-engine.js";
import { createRecoveryAuditSnapshotSession } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-snapshot-session.js";
import { createRecoveryEvidenceSnapshotGate } from "../../src/hyper-xsus-core/knowledge-graph/recovery-evidence-snapshot-gate.js";
const HASH = "a".repeat(64), GENESIS = "0".repeat(64);
function harness() {
  let revision = 1, anchorRevision = 1, journalHash = HASH;
  const requests = {
    r1: { id: "r1", key: "graph", status: "approved" },
    r2: { id: "r2", key: "graph", status: "executing" },
    r3: { id: "r3", key: "graph", status: "executed" }
  };
  const state = { async snapshot() { return { revision, requests }; } };
  const authorize = async ({ actorId }) => actorId === "auditor";
  const evidenceGate = createRecoveryEvidenceSnapshotGate({
    state, authorize,
    journal: { async inspect() { return { headHash: journalHash, records: [] }; } },
    anchor: { async inspect() {
      return { revision: anchorRevision, headHash: GENESIS, fencingToken: anchorRevision };
    } },
    trustedJournalHead: async () => journalHash
  });
  const report = createRecoveryAuditReportEngine({
    authorize, pageSize: 2,
    sessionFactory: () => createRecoveryAuditSnapshotSession({
      state, authorize, evidenceGate, evidenceKey: "graph",
      maxPageSize: 2,
      reconciliation: { async inspect({ id }) {
        return id === "r2"
          ? { status: "reconcile", reason: "state-finalization-pending" }
          : { status: "consistent", reason: "verified" };
      } }
    })
  });
  return { report, changeState() { revision++; }, changeAnchor() { anchorRevision++; },
    changeJournal() { journalHash = "b".repeat(64); } };
}
describe("Hyper XSUS Core — integrated cross-source recovery report", () => {
  it("builds a complete report from actual snapshot and evidence engines", async () => {
    const { report } = harness();
    const result = await report.generate({ actorId: "auditor" });
    expect(result).toMatchObject({
      total: 3, revision: 1,
      counts: { consistent: 2, reconcile: 1 },
      readOnly: true, automaticRecovery: false
    });
    expect(result.records.map(record => record.id)).toEqual(["r1", "r2", "r3"]);
  });
  it("denies unauthorized report generation", async () => {
    await expect(harness().report.generate({ actorId: "intruder" }))
      .rejects.toThrow("access denied");
  });
  it("generates a fresh independent session for each report", async () => {
    const { report } = harness();
    const [a, b] = await Promise.all([
      report.generate({ actorId: "auditor" }),
      report.generate({ actorId: "auditor" })
    ]);
    expect(a.records).toEqual(b.records);
    expect(a.total).toBe(3);
  });
});
