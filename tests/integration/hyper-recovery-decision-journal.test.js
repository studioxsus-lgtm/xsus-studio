import { describe, expect, it } from "vitest";
import { createRecoveryDecisionJournal } from "../../src/hyper-xsus-core/knowledge-graph/recovery-decision-journal.js";
const GENESIS = "0".repeat(64);
function adapter() {
  const db = new Map();
  return {
    async read(key) { return db.has(key) ? structuredClone(db.get(key)) : null; },
    async compareAndSwap(key, revision, next) {
      if ((db.get(key)?.revision ?? 0) !== revision) return false;
      db.set(key, structuredClone(next)); return true;
    },
    db
  };
}
const event = (action, timestamp) => ({
  requestId: "recovery-1", actorId: "reviewer", action, timestamp
});
describe("Hyper XSUS Core — durable recovery decision journal", () => {
  it("persists an append-only hash chain and verifies its trusted head", async () => {
    const storage = adapter();
    const journal = createRecoveryDecisionJournal({ storage, key: "tenant:graph" });
    const first = await journal.append(event("proposed", 1));
    const second = await journal.append(event("approved", 2));
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    const restarted = createRecoveryDecisionJournal({ storage, key: "tenant:graph" });
    const snapshot = await restarted.inspect({ expectedHeadHash: second.headHash });
    expect(snapshot.records[1].previousHash).toBe(first.headHash);
    expect(Object.isFrozen(snapshot.records[0])).toBe(true);
  });
  it("detects tampering and mismatched trusted heads", async () => {
    const storage = adapter();
    const journal = createRecoveryDecisionJournal({ storage, key: "graph" });
    await journal.append(event("proposed", 1));
    await expect(journal.inspect({ expectedHeadHash: GENESIS }))
      .rejects.toThrow("trusted head mismatch");
    const stored = storage.db.get("graph");
    stored.records[0].actorId = "intruder";
    await expect(journal.inspect()).rejects.toThrow("hash mismatch");
  });
  it("rejects competing writers without overwriting the first", async () => {
    const storage = adapter();
    const a = createRecoveryDecisionJournal({ storage, key: "graph" });
    const b = createRecoveryDecisionJournal({ storage, key: "graph" });
    await Promise.allSettled([a.append(event("proposed", 1)), b.append(event("approved", 2))]);
    expect((await a.inspect()).revision).toBe(1);
  });
  it("enforces capacity and validates inputs", async () => {
    const storage = adapter();
    const journal = createRecoveryDecisionJournal({ storage, key: "graph", maxRecords: 1 });
    await journal.append(event("proposed", 1));
    await expect(journal.append(event("approved", 2))).rejects.toThrow("capacity");
    await expect(journal.append(event("invalid", 3))).rejects.toThrow("Invalid");
    expect(() => createRecoveryDecisionJournal({ storage, key: "../bad" })).toThrow("configuration");
  });
});
