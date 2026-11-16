import { describe, expect, it } from "vitest";
import { createRecoveryEvidenceSnapshotGate } from "../../src/hyper-xsus-core/knowledge-graph/recovery-evidence-snapshot-gate.js";
import { createRecoveryAuditSnapshotSession } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-snapshot-session.js";
const J = "a".repeat(64), H = "0".repeat(64);
function evidence() {
  let revision = 1;
  const state = { async snapshot() { return { revision, requests: {} }; } };
  const config = {
    state, authorize: async () => true,
    journal: { async inspect() { return { headHash: J, records: [] }; } },
    anchor: { async inspect() { return { headHash: H, revision: 1, fencingToken: 1 }; } },
    trustedJournalHead: async () => J
  };
  return { state, config, change() { revision++; } };
}
describe("Hyper XSUS Core — evidence session trust boundaries", () => {
  it("rejects fabricated baselines even if values are correct", async () => {
    const f = evidence(), gate = createRecoveryEvidenceSnapshotGate(f.config);
    const baseline = await gate.begin({ key: "graph", actorId: "auditor" });
    await expect(gate.verify({ baseline: { ...baseline }, actorId: "auditor" }))
      .rejects.toThrow("Invalid recovery evidence baseline");
    expect((await gate.verify({ baseline, actorId: "auditor" })).consistent).toBe(true);
  });
  it("rejects a baseline issued by another gate instance", async () => {
    const f = evidence();
    const a = createRecoveryEvidenceSnapshotGate(f.config);
    const b = createRecoveryEvidenceSnapshotGate(f.config);
    const baseline = await a.begin({ key: "graph", actorId: "auditor" });
    await expect(b.verify({ baseline, actorId: "auditor" }))
      .rejects.toThrow("Invalid recovery evidence baseline");
  });
  it("rejects baseline reuse by a different actor", async () => {
    const f = evidence(), gate = createRecoveryEvidenceSnapshotGate(f.config);
    const baseline = await gate.begin({ key: "graph", actorId: "auditor" });
    await expect(gate.verify({ baseline, actorId: "intruder" }))
      .rejects.toThrow("Invalid recovery evidence baseline");
  });
  it("rejects a state/evidence race during audit initialization", async () => {
    const f = evidence();
    const gate = createRecoveryEvidenceSnapshotGate(f.config);
    const session = createRecoveryAuditSnapshotSession({
      state: f.state, evidenceGate: {
        async begin(args) { f.change(); return gate.begin(args); },
        verify: gate.verify
      }, evidenceKey: "graph",
      reconciliation: { async inspect() { return { status: "consistent" }; } },
      authorize: async () => true
    });
    await expect(session.begin({ actorId: "auditor" }))
      .rejects.toMatchObject({ code: "RECOVERY_AUDIT_REVISION_CHANGED" });
    await expect(session.page({ actorId: "auditor" }))
      .rejects.toThrow("not started");
  });
});
