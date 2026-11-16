import { describe, expect, it } from "vitest";
import { createRecoveryFinalizationEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-finalization-engine.js";
function fixture({ reason = "state-finalization-pending", denied = false,
  busy = false, stateStatus = "executing" } = {}) {
  const record = { id: "r1", key: "graph", trustedHead: "0".repeat(64),
    checkpointHead: "a".repeat(64), status: stateStatus };
  let transitions = 0, releases = 0;
  const state = {
    async get() { return { ...record }; },
    async transition({ expectedStatus, nextStatus }) {
      if (record.status !== expectedStatus) throw new Error("CAS conflict");
      record.status = nextStatus; transitions++;
      return { ...record };
    }
  };
  const lease = {
    async acquire() { return busy ? null : { fencingToken: 1 }; },
    async release() { releases++; return true; }
  };
  const reconciliation = {
    async inspect() { return { status: "reconcile", reason, safeToRetry: false }; }
  };
  const engine = createRecoveryFinalizationEngine({
    reconciliation, state, lease, workerId: "worker-1",
    authorize: async () => !denied
  });
  return { engine, record, getTransitions: () => transitions, getReleases: () => releases };
}
const input = { id: "r1", actorId: "auditor" };
describe("Hyper XSUS Core — recovery finalization", () => {
  it("finalizes only previously journaled executed recovery", async () => {
    const f = fixture();
    expect(await f.engine.finalize(input)).toMatchObject({ status: "executed", id: "r1" });
    expect(f.record.status).toBe("executed");
    expect(f.getTransitions()).toBe(1);
    expect(f.getReleases()).toBe(1);
  });
  it("rejects ambiguous anchor outcomes without changing state", async () => {
    const f = fixture({ reason: "execution-outcome-unconfirmed" });
    await expect(f.engine.finalize(input)).rejects.toThrow("verified executed evidence");
    expect(f.getTransitions()).toBe(0);
    expect(f.getReleases()).toBe(1);
  });
  it("rejects missing journal finalization", async () => {
    const f = fixture({ reason: "journal-and-state-finalization-pending" });
    await expect(f.engine.finalize(input)).rejects.toThrow("verified executed evidence");
    expect(f.record.status).toBe("executing");
  });
  it("rejects unauthorized identities", async () => {
    const f = fixture({ denied: true });
    await expect(f.engine.finalize(input)).rejects.toThrow("access denied");
    expect(f.getTransitions()).toBe(0);
  });
  it("rejects concurrent lease holders", async () => {
    const f = fixture({ busy: true });
    await expect(f.engine.finalize(input)).rejects.toThrow("lease unavailable");
    expect(f.getTransitions()).toBe(0);
  });
  it("does not finalize already completed requests again", async () => {
    const f = fixture({ stateStatus: "executed" });
    await expect(f.engine.finalize(input)).rejects.toThrow("state changed");
  });
  it("validates configuration and identifiers", async () => {
    expect(() => createRecoveryFinalizationEngine()).toThrow("requires");
    await expect(fixture().engine.finalize({ id: "../bad", actorId: "auditor" }))
      .rejects.toThrow("Invalid");
  });
});
