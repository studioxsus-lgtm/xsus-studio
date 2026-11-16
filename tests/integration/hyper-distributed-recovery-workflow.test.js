import { describe, expect, it } from "vitest";
import { createPersistentRecoveryStateEngine } from "../../src/hyper-xsus-core/knowledge-graph/persistent-recovery-state-engine.js";
import { createDistributedRecoveryLeaseCoordinator } from "../../src/hyper-xsus-core/knowledge-graph/distributed-recovery-lease-coordinator.js";
import { createDistributedRecoveryWorkflow } from "../../src/hyper-xsus-core/knowledge-graph/distributed-recovery-workflow.js";
const oldHead = "0".repeat(64), nextHead = "a".repeat(64);
function storage() {
  const db = new Map();
  return {
    async read(key) { return db.has(key) ? structuredClone(db.get(key)) : null; },
    async compareAndSwap(key, rev, value) {
      if ((db.get(key)?.revision ?? 0) !== rev) return false;
      db.set(key, structuredClone(value)); return true;
    }
  };
}
function harness({ deny = false, rejectAnchor = false, rejectJournal = false } = {}) {
  const db = storage();
  const leases = storage();
  const events = [];
  let head = oldHead;
  let time = 1000;
  const state = createPersistentRecoveryStateEngine({ storage: db, key: "requests", clock: () => time });
  const lease = () => createDistributedRecoveryLeaseCoordinator({
    storage: leases, key: "recovery-lock", clock: () => time, leaseMs: 5000
  });
  const config = workerId => ({
    state, lease: lease(),
    inspector: { async inspect() {
      return { status: head === oldHead ? "possible-interrupted-anchor-update" : "consistent",
        safeToWrite: head !== oldHead, trustedHead: head, checkpointHead: nextHead };
    } },
    fencedAnchor: { async compareAndSwap({ expectedHead, nextHead: next, fencingToken }) {
      if (rejectAnchor || head !== expectedHead || fencingToken < 1) return false;
      head = next; return true;
    } },
    journal: { async append(event) {
      if (rejectJournal) throw new Error("journal offline");
      events.push(event); return event;
    } },
    authorize: async () => !deny,
    verifyCommitProof: async ({ proof }) => proof === "verified",
    workerId, clock: () => time
  });
  return {
    state, events, lease, getHead: () => head,
    workflow: worker => createDistributedRecoveryWorkflow(config(worker)),
    setTime: value => { time = value; }
  };
}
const proposal = {
  id: "recovery-1", key: "graph", actorId: "operator",
  trustedHead: oldHead, checkpointHead: nextHead, proof: "verified"
};
describe("Hyper XSUS Core — distributed durable recovery workflow", () => {
  it("survives instance recreation and executes after independent approval", async () => {
    const h = harness();
    await h.workflow("worker-a").propose(proposal);
    await h.workflow("worker-b").approve({ id: proposal.id, actorId: "reviewer" });
    const result = await h.workflow("worker-c").execute({
      id: proposal.id, actorId: "auditor", proof: "verified"
    });
    expect(result.status).toBe("executed");
    expect(h.getHead()).toBe(nextHead);
    expect((await h.state.get(proposal.id)).status).toBe("executed");
    expect(h.events.map(x => x.action)).toEqual(["proposed", "approved", "executed"]);
  });
  it("rejects execution without independent approval", async () => {
    const h = harness();
    await h.workflow("worker-a").propose(proposal);
    await expect(h.workflow("worker-b").execute({
      id: proposal.id, actorId: "auditor", proof: "verified"
    })).rejects.toThrow("not approved");
    expect(h.getHead()).toBe(oldHead);
  });
  it("prevents simultaneous lease holders", async () => {
    const h = harness();
    await h.workflow("worker-a").propose(proposal);
    await h.workflow("worker-b").approve({ id: proposal.id, actorId: "reviewer" });
    const held = await h.lease().acquire("other-worker");
    await expect(h.workflow("worker-c").execute({
      id: proposal.id, actorId: "auditor", proof: "verified"
    })).rejects.toThrow("lease unavailable");
    expect((await h.state.get(proposal.id)).status).toBe("approved");
    expect(await h.lease().release("other-worker", held.fencingToken)).toBe(true);
  });
  it("leaves an execution reservation for reconciliation after anchor CAS rejection", async () => {
    const h = harness({ rejectAnchor: true });
    await h.workflow("worker-a").propose(proposal);
    await h.workflow("worker-b").approve({ id: proposal.id, actorId: "reviewer" });
    await expect(h.workflow("worker-c").execute({
      id: proposal.id, actorId: "auditor", proof: "verified"
    })).rejects.toMatchObject({ code: "RECOVERY_RECONCILIATION_REQUIRED" });
    expect((await h.state.get(proposal.id)).status).toBe("executing");
    expect(h.getHead()).toBe(oldHead);
    await expect(h.workflow("worker-d").execute({
      id: proposal.id, actorId: "auditor", proof: "verified"
    })).rejects.toThrow("not approved");
  });
  it("fails closed on journal outage after persisting proposal", async () => {
    const h = harness({ rejectJournal: true });
    await expect(h.workflow("worker-a").propose(proposal))
      .rejects.toMatchObject({ code: "RECOVERY_JOURNAL_FAILURE" });
    expect((await h.state.get(proposal.id)).status).toBe("pending");
    expect(h.getHead()).toBe(oldHead);
  });
  it("rejects proof failures and invalid configuration", async () => {
    const h = harness();
    await expect(h.workflow("worker-a").propose({ ...proposal, proof: "bad" }))
      .rejects.toThrow("proof rejected");
    expect(() => createDistributedRecoveryWorkflow()).toThrow("dependencies");
  });
});
