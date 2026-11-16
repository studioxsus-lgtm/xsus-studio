import { describe, expect, it } from "vitest";
import { createKnowledgeEvidenceCheckpointStore, createInMemoryEvidenceCheckpointAdapter } from "../../src/hyper-xsus-core/knowledge-graph/knowledge-evidence-checkpoints.js";
import { createEvidenceCrashRecoveryInspector } from "../../src/hyper-xsus-core/knowledge-graph/evidence-crash-recovery-inspector.js";

const genesis = "0".repeat(64);
const event = { proposalId: "p", actorId: "reviewer", action: "proposed", timestamp: 1, details: {} };
async function fixture() {
  const storage = createInMemoryEvidenceCheckpointAdapter();
  const store = createKnowledgeEvidenceCheckpointStore({ storage, key: "graph" });
  const state = await store.recover();
  state.ledger.append(event);
  const saved = await store.commit({
    ledger: state.ledger, expectedRevision: 0, expectedHeadHash: genesis
  });
  let head = saved.headHash;
  const anchor = { async read() { return head; } };
  const inspector = createEvidenceCrashRecoveryInspector({ storage, anchor, key: "graph" });
  return { storage, store, saved, inspector, setHead(value) { head = value; } };
}
describe("Hyper XSUS Core — evidence crash recovery inspector", () => {
  it("identifies consistent checkpoints", async () => {
    const f = await fixture();
    expect(await f.inspector.inspect()).toMatchObject({
      status: "consistent", safeToWrite: true, recordCount: 1
    });
  });
  it("flags a possible interrupted anchor update without auto-repair", async () => {
    const f = await fixture();
    f.setHead(genesis);
    const report = await f.inspector.inspect();
    expect(report.status).toBe("possible-interrupted-anchor-update");
    expect(report.safeToWrite).toBe(false);
    expect(report.requiresIndependentCommitProof).toBe(true);
  });
  it("rejects divergent trusted anchors", async () => {
    const f = await fixture();
    f.setHead("a".repeat(64));
    expect((await f.inspector.inspect()).status).toBe("divergent-history");
  });
  it("detects tampered checkpoint contents", async () => {
    const f = await fixture();
    const bad = await f.storage.read("graph");
    bad.snapshot.records[0].event.actorId = "intruder";
    await f.storage.compareAndSwap("graph", 1, bad);
    expect((await f.inspector.inspect()).status).toBe("invalid-checkpoint");
  });
  it("distinguishes missing checkpoint from empty genesis", async () => {
    const storage = createInMemoryEvidenceCheckpointAdapter();
    let head = genesis;
    const inspector = createEvidenceCrashRecoveryInspector({
      storage, anchor: { async read() { return head; } }, key: "graph"
    });
    expect((await inspector.inspect()).status).toBe("empty");
    head = "b".repeat(64);
    expect((await inspector.inspect()).status).toBe("missing-checkpoint");
  });
  it("rejects invalid anchor values", async () => {
    const storage = createInMemoryEvidenceCheckpointAdapter();
    const inspector = createEvidenceCrashRecoveryInspector({
      storage, anchor: { async read() { return "invalid"; } }, key: "graph"
    });
    expect((await inspector.inspect()).status).toBe("invalid-anchor");
  });
  it("rejects invalid adapters and keys", () => {
    expect(() => createEvidenceCrashRecoveryInspector()).toThrow("storage.read");
    expect(() => createEvidenceCrashRecoveryInspector({
      storage: { read() {} }, anchor: { read() {} }, key: "../unsafe"
    })).toThrow("key");
  });
});
