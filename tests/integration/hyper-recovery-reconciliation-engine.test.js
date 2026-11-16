import { describe, expect, it } from "vitest";
import { createRecoveryReconciliationEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-reconciliation-engine.js";
const G = "0".repeat(64), A = "a".repeat(64), J = "b".repeat(64);
function setup({ status = "executing", head = G,
  actions = ["proposed", "approved"], unavailable = false } = {}) {
  const record = { id: "r1", key: "graph", status, trustedHead: G, checkpointHead: A };
  return createRecoveryReconciliationEngine({
    state: { async get() { return record; } },
    anchor: { async inspect() { return { headHash: head }; } },
    journal: { async inspect({ expectedHeadHash }) {
      if (unavailable || expectedHeadHash !== J) throw new Error("untrusted");
      return { headHash: J, records: actions.map(action => ({ requestId: "r1", action })) };
    } },
    trustedJournalHead: async () => J
  });
}
describe("Hyper XSUS Core — recovery reconciliation", () => {
  it("detects unconfirmed execution without retrying", async () => {
    expect(await setup().inspect({ id: "r1" })).toMatchObject({
      status: "reconcile", reason: "execution-outcome-unconfirmed", safeToRetry: false
    });
  });
  it("identifies journal finalization pending after anchor advance", async () => {
    expect(await setup({ head: A }).inspect({ id: "r1" })).toMatchObject({
      status: "reconcile", reason: "journal-and-state-finalization-pending"
    });
  });
  it("identifies state finalization pending after executed journal entry", async () => {
    expect(await setup({ head: A, actions: ["proposed", "approved", "executed"] })
      .inspect({ id: "r1" })).toMatchObject({
      status: "reconcile", reason: "state-finalization-pending"
    });
  });
  it("recognizes fully completed execution", async () => {
    expect(await setup({ status: "executed", head: A,
      actions: ["proposed", "approved", "executed"] }).inspect({ id: "r1" }))
      .toMatchObject({ status: "consistent", reason: "completed" });
  });
  it("rejects unexpected anchor changes", async () => {
    expect((await setup({ head: "c".repeat(64) }).inspect({ id: "r1" }))
      .status).toBe("inconsistent");
  });
  it("fails closed if evidence is unavailable", async () => {
    expect(await setup({ unavailable: true }).inspect({ id: "r1" }))
      .toMatchObject({ status: "unavailable", safeToRetry: false });
  });
  it("rejects invalid configuration and identifiers", async () => {
    expect(() => createRecoveryReconciliationEngine()).toThrow("requires");
    await expect(setup().inspect({ id: "../bad" })).rejects.toThrow("ID");
  });
});
