import { describe, expect, it } from "vitest";
import {
  createKnowledgeEvidenceCheckpointStore,
  createInMemoryEvidenceCheckpointAdapter
} from "../../src/hyper-xsus-core/knowledge-graph/knowledge-evidence-checkpoints.js";

const genesis = "0".repeat(64);
const event = (action, timestamp) => ({
  proposalId: "p", actorId: "reviewer", action, timestamp, details: {}
});
function setup(storage = createInMemoryEvidenceCheckpointAdapter()) {
  return createKnowledgeEvidenceCheckpointStore({ storage, key: "graph-1" });
}

describe("Hyper XSUS Core — evidence checkpoint recovery", () => {
  it("recovers an empty ledger and persists verified evidence", async () => {
    const store = setup();
    const initial = await store.recover();
    expect(initial.revision).toBe(0);
    expect(initial.headHash).toBe(genesis);
    initial.ledger.append(event("proposed", 1));
    const saved = await store.commit({
      ledger: initial.ledger, expectedRevision: 0, expectedHeadHash: genesis
    });
    expect(saved.revision).toBe(1);
    const recovered = await store.recover({ expectedHeadHash: saved.headHash });
    expect(recovered.revision).toBe(1);
    expect(recovered.ledger.verify().valid).toBe(true);
    expect(recovered.ledger.list()[0].event.action).toBe("proposed");
  });

  it("survives store re-creation with a shared storage adapter", async () => {
    const storage = createInMemoryEvidenceCheckpointAdapter();
    const first = setup(storage);
    const recovered = await first.recover();
    recovered.ledger.append(event("proposed", 1));
    const saved = await first.commit({
      ledger: recovered.ledger, expectedRevision: 0, expectedHeadHash: genesis
    });
    const second = setup(storage);
    const restarted = await second.recover({ expectedHeadHash: saved.headHash });
    restarted.ledger.append(event("approved", 2));
    const next = await second.commit({
      ledger: restarted.ledger, expectedRevision: restarted.revision,
      expectedHeadHash: restarted.headHash
    });
    expect(next.revision).toBe(2);
    expect((await first.recover({ expectedHeadHash: next.headHash })).ledger.count).toBe(2);
  });

  it("rejects stale concurrent writers without overwriting history", async () => {
    const store = setup();
    const a = await store.recover();
    const b = await store.recover();
    a.ledger.append(event("proposed", 1));
    b.ledger.append(event("rejected", 2));
    const saved = await store.commit({
      ledger: a.ledger, expectedRevision: 0, expectedHeadHash: genesis
    });
    await expect(store.commit({
      ledger: b.ledger, expectedRevision: 0, expectedHeadHash: genesis
    })).rejects.toThrow("conflict");
    expect((await store.recover({ expectedHeadHash: saved.headHash })).ledger.count).toBe(1);
  });

  it("rejects truncated or forked history even with the current revision", async () => {
    const store = setup();
    const initial = await store.recover();
    initial.ledger.append(event("proposed", 1));
    const saved = await store.commit({
      ledger: initial.ledger, expectedRevision: 0, expectedHeadHash: genesis
    });
    const truncated = await setup().recover();
    await expect(store.commit({
      ledger: truncated.ledger, expectedRevision: 1, expectedHeadHash: saved.headHash
    })).rejects.toThrow("fork or truncation");
    const fork = await setup().recover();
    fork.ledger.append(event("rejected", 3));
    await expect(store.commit({
      ledger: fork.ledger, expectedRevision: 1, expectedHeadHash: saved.headHash
    })).rejects.toThrow("fork or truncation");
  });

  it("detects tampering with stored checkpoint contents", async () => {
    const storage = createInMemoryEvidenceCheckpointAdapter();
    const store = setup(storage);
    const initial = await store.recover();
    initial.ledger.append(event("proposed", 1));
    await store.commit({ ledger: initial.ledger, expectedRevision: 0, expectedHeadHash: genesis });
    const stored = await storage.read("graph-1");
    stored.snapshot.records[0].event.actorId = "intruder";
    expect(await storage.compareAndSwap("graph-1", 1, stored)).toBe(true);
    await expect(store.recover()).rejects.toThrow(/integrity|checksum/i);
  });

  it("rejects trusted head mismatches and missing trusted checkpoints", async () => {
    const store = setup();
    await expect(store.recover({ expectedHeadHash: "a".repeat(64) }))
      .rejects.toThrow("missing");
    const initial = await store.recover();
    initial.ledger.append(event("proposed", 1));
    await store.commit({ ledger: initial.ledger, expectedRevision: 0, expectedHeadHash: genesis });
    await expect(store.recover({ expectedHeadHash: genesis })).rejects.toThrow("trusted head");
  });

  it("makes unchanged commits idempotent", async () => {
    const store = setup();
    const initial = await store.recover();
    initial.ledger.append(event("proposed", 1));
    const saved = await store.commit({
      ledger: initial.ledger, expectedRevision: 0, expectedHeadHash: genesis
    });
    const recovered = await store.recover();
    const result = await store.commit({
      ledger: recovered.ledger, expectedRevision: saved.revision, expectedHeadHash: saved.headHash
    });
    expect(result).toEqual({ revision: 1, headHash: saved.headHash, unchanged: true });
  });

  it("rejects non-CAS adapters and invalid checkpoint identifiers", () => {
    expect(() => createKnowledgeEvidenceCheckpointStore({
      storage: { read() {} }, key: "x"
    })).toThrow("compareAndSwap");
    expect(() => createKnowledgeEvidenceCheckpointStore({
      storage: createInMemoryEvidenceCheckpointAdapter(), key: "../unsafe"
    })).toThrow("safe identifier");
  });

  it("surfaces CAS failure without claiming persistence", async () => {
    const storage = {
      async read() { return null; },
      async compareAndSwap() { return false; }
    };
    const store = setup(storage);
    const initial = await store.recover();
    initial.ledger.append(event("proposed", 1));
    await expect(store.commit({
      ledger: initial.ledger, expectedRevision: 0, expectedHeadHash: genesis
    })).rejects.toThrow("concurrent write conflict");
  });
});
