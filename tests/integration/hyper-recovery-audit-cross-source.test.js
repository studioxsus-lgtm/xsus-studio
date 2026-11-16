import { describe, expect, it } from "vitest";
import { createRecoveryAuditSnapshotSession } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-snapshot-session.js";
import { createRecoveryEvidenceSnapshotGate } from "../../src/hyper-xsus-core/knowledge-graph/recovery-evidence-snapshot-gate.js";
const G = "0".repeat(64), J = "a".repeat(64);
function fixture() {
  let anchorRevision = 1, anchorHead = G, journalHead = J;
  const state = { async snapshot() {
    return { revision: 1, requests: { r1: { id: "r1", key: "graph", status: "approved" },
      r2: { id: "r2", key: "graph", status: "executing" } } };
  } };
  const authorize = async () => true;
  const evidenceGate = createRecoveryEvidenceSnapshotGate({
    state, authorize,
    journal: { async inspect() { return { headHash: journalHead, records: [] }; } },
    anchor: { async inspect() {
      return { revision: anchorRevision, headHash: anchorHead, fencingToken: anchorRevision };
    } },
    trustedJournalHead: async () => journalHead
  });
  const session = createRecoveryAuditSnapshotSession({
    state, authorize, evidenceGate, evidenceKey: "graph", maxPageSize: 1,
    reconciliation: { async inspect() { return { status: "consistent", reason: "verified" }; } }
  });
  return { session, changeAnchor() { anchorRevision++; anchorHead = "b".repeat(64); },
    changeJournal() { journalHead = "c".repeat(64); } };
}
describe("Hyper XSUS Core — audit session cross-source evidence integration", () => {
  it("reads two pages while all evidence sources stay stable", async () => {
    const f = fixture();
    await f.session.begin({ actorId: "auditor" });
    const a = await f.session.page({ actorId: "auditor", limit: 1 });
    expect(a.records[0].id).toBe("r1");
    const b = await f.session.page({ actorId: "auditor", offset: 1, limit: 1 });
    expect(b.records[0].id).toBe("r2");
  });
  it("rejects anchor changes between pages", async () => {
    const f = fixture();
    await f.session.begin({ actorId: "auditor" });
    await f.session.page({ actorId: "auditor", limit: 1 });
    f.changeAnchor();
    await expect(f.session.page({ actorId: "auditor", offset: 1, limit: 1 }))
      .rejects.toMatchObject({ code: "RECOVERY_EVIDENCE_SNAPSHOT_CHANGED" });
  });
  it("rejects journal changes between pages", async () => {
    const f = fixture();
    await f.session.begin({ actorId: "auditor" });
    f.changeJournal();
    await expect(f.session.page({ actorId: "auditor", limit: 1 }))
      .rejects.toMatchObject({ code: "RECOVERY_EVIDENCE_SNAPSHOT_CHANGED" });
  });
  it("rejects incomplete cross-source configuration", () => {
    expect(() => createRecoveryAuditSnapshotSession({
      state: { snapshot: async () => ({ revision: 1, requests: {} }) },
      reconciliation: { inspect: async () => ({ status: "consistent" }) },
      authorize: async () => true,
      evidenceGate: { begin: async () => ({}) }
    })).toThrow("configuration");
  });
});
