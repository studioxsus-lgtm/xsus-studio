import { describe, expect, it } from "vitest";
import { createRecoveryEvidenceSnapshotGate } from "../../src/hyper-xsus-core/knowledge-graph/recovery-evidence-snapshot-gate.js";
const H = "a".repeat(64), J = "b".repeat(64), H2 = "c".repeat(64), J2 = "d".repeat(64);
function fixture() {
  let revision = 2, head = H, anchorRevision = 1, journalHead = J, trust = J, denied = false;
  const gate = createRecoveryEvidenceSnapshotGate({
    state: { async snapshot() { return { revision }; } },
    journal: { async inspect({ expectedHeadHash }) {
      if (expectedHeadHash !== journalHead) throw new Error("journal integrity");
      return { headHash: journalHead, records: [] };
    } },
    anchor: { async inspect() {
      return { revision: anchorRevision, headHash: head, fencingToken: anchorRevision };
    } },
    trustedJournalHead: async () => trust,
    authorize: async () => !denied
  });
  return { gate, changeState() { revision++; }, changeAnchor() {
    head = H2; anchorRevision++;
  }, changeJournal() { journalHead = J2; trust = J2; },
    breakTrust() { trust = H; }, deny() { denied = true; } };
}
const input = { key: "graph", actorId: "auditor" };
describe("Hyper XSUS Core — cross-source recovery evidence gate", () => {
  it("pins and verifies a stable state, journal and anchor", async () => {
    const f = fixture();
    const baseline = await f.gate.begin(input);
    expect(baseline).toMatchObject({
      stateRevision: 2, journalHead: J, anchorHead: H, anchorRevision: 1
    });
    expect((await f.gate.verify({ baseline, actorId: "auditor" })).consistent).toBe(true);
  });
  it("rejects changed state revisions", async () => {
    const f = fixture(), baseline = await f.gate.begin(input);
    f.changeState();
    await expect(f.gate.verify({ baseline, actorId: "auditor" }))
      .rejects.toMatchObject({ code: "RECOVERY_EVIDENCE_SNAPSHOT_CHANGED" });
  });
  it("rejects changed anchor head and fencing token", async () => {
    const f = fixture(), baseline = await f.gate.begin(input);
    f.changeAnchor();
    await expect(f.gate.verify({ baseline, actorId: "auditor" }))
      .rejects.toMatchObject({ code: "RECOVERY_EVIDENCE_SNAPSHOT_CHANGED" });
  });
  it("rejects changed journal head", async () => {
    const f = fixture(), baseline = await f.gate.begin(input);
    f.changeJournal();
    await expect(f.gate.verify({ baseline, actorId: "auditor" }))
      .rejects.toMatchObject({ code: "RECOVERY_EVIDENCE_SNAPSHOT_CHANGED" });
  });
  it("fails closed on journal/trust mismatch", async () => {
    const f = fixture();
    f.breakTrust();
    await expect(f.gate.begin(input)).rejects.toThrow("journal integrity");
  });
  it("enforces authorization before sampling", async () => {
    const f = fixture();
    f.deny();
    await expect(f.gate.begin(input)).rejects.toThrow("access denied");
  });
  it("rejects invalid configuration and identifiers", async () => {
    expect(() => createRecoveryEvidenceSnapshotGate()).toThrow("requires");
    await expect(fixture().gate.begin({ key: "../bad", actorId: "auditor" }))
      .rejects.toThrow("Invalid");
  });
});
