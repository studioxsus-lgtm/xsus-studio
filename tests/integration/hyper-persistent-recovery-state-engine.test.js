import { describe, expect, it } from "vitest";
import { createPersistentRecoveryStateEngine } from "../../src/hyper-xsus-core/knowledge-graph/persistent-recovery-state-engine.js";
const oldHead = "0".repeat(64), newHead = "a".repeat(64);
function adapter() {
  const db = new Map();
  return {
    db,
    async read(k) { return db.has(k) ? structuredClone(db.get(k)) : null; },
    async compareAndSwap(k, rev, next) {
      if ((db.get(k)?.revision ?? 0) !== rev) return false;
      db.set(k, structuredClone(next)); return true;
    }
  };
}
const proposal = {
  id: "recovery-1", requestKey: "graph", proposer: "operator",
  trustedHead: oldHead, checkpointHead: newHead
};
describe("Hyper XSUS Core — persistent recovery state", () => {
  it("persists proposals and approvals across recreated instances", async () => {
    const storage = adapter();
    const a = createPersistentRecoveryStateEngine({ storage, key: "tenant:recovery", clock: () => 12 });
    expect((await a.propose(proposal)).status).toBe("pending");
    const b = createPersistentRecoveryStateEngine({ storage, key: "tenant:recovery" });
    const approved = await b.transition({
      id: proposal.id, actorId: "reviewer", expectedStatus: "pending", nextStatus: "approved"
    });
    expect(approved.approvedBy).toBe("reviewer");
    expect((await a.get(proposal.id)).status).toBe("approved");
  });
  it("rejects self approval and invalid transitions", async () => {
    const state = createPersistentRecoveryStateEngine({ storage: adapter(), key: "graph" });
    await state.propose(proposal);
    await expect(state.transition({
      id: proposal.id, actorId: "operator", expectedStatus: "pending", nextStatus: "approved"
    })).rejects.toThrow("independent actor");
    await expect(state.transition({
      id: proposal.id, actorId: "reviewer", expectedStatus: "pending", nextStatus: "executed"
    })).rejects.toThrow("Invalid recovery state transition");
  });
  it("detects competing writes and protects committed state", async () => {
    const storage = adapter();
    const a = createPersistentRecoveryStateEngine({ storage, key: "graph" });
    const b = createPersistentRecoveryStateEngine({ storage, key: "graph" });
    const results = await Promise.allSettled([
      a.propose(proposal), b.propose({ ...proposal, id: "recovery-2" })
    ]);
    expect(results.filter(x => x.status === "fulfilled")).toHaveLength(1);
    expect(Object.keys((await a.snapshot()).requests)).toHaveLength(1);
  });
  it("rejects duplicate requests and enforces capacity", async () => {
    const state = createPersistentRecoveryStateEngine({
      storage: adapter(), key: "graph", maxRequests: 1
    });
    await state.propose(proposal);
    await expect(state.propose(proposal)).rejects.toThrow("Duplicate");
    await expect(state.propose({ ...proposal, id: "recovery-2" }))
      .rejects.toThrow("capacity");
  });
  it("rejects malformed persisted state", async () => {
    const storage = adapter();
    storage.db.set("graph", { version: "1.0.0", revision: 1, requests: {
      bad: { id: "bad", status: "approved" }
    } });
    const state = createPersistentRecoveryStateEngine({ storage, key: "graph" });
    await expect(state.snapshot()).rejects.toThrow("Invalid persisted");
  });
  it("isolates storage namespaces and rejects invalid proposals", async () => {
    const storage = adapter();
    const a = createPersistentRecoveryStateEngine({ storage, key: "tenant:a" });
    const b = createPersistentRecoveryStateEngine({ storage, key: "tenant:b" });
    await a.propose(proposal);
    expect(await b.get(proposal.id)).toBeNull();
    await expect(a.propose({ ...proposal, trustedHead: "invalid" }))
      .rejects.toThrow("Invalid recovery proposal");
  });
});
