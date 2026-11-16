import { describe, expect, it } from "vitest";
import { createRecoveryWorkflowCoordinator } from "../../src/hyper-xsus-core/knowledge-graph/recovery-workflow-coordinator.js";
import { createRecoveryDecisionJournal } from "../../src/hyper-xsus-core/knowledge-graph/recovery-decision-journal.js";

const oldHead = "0".repeat(64), newHead = "a".repeat(64);
function setup({ failJournal = false, failAnchor = false } = {}) {
  let head = oldHead;
  const data = new Map();
  const storage = {
    async read(key) { return data.has(key) ? structuredClone(data.get(key)) : null; },
    async compareAndSwap(key, revision, next) {
      if ((data.get(key)?.revision ?? 0) !== revision) return false;
      data.set(key, structuredClone(next)); return true;
    }
  };
  const durable = createRecoveryDecisionJournal({ storage, key: "recovery-journal" });
  const journal = {
    async append(record) {
      if (failJournal) throw new Error("offline");
      return durable.append(record);
    }
  };
  const inspector = {
    async inspect() {
      return {
        status: head === oldHead ? "possible-interrupted-anchor-update" : "consistent",
        safeToWrite: head !== oldHead, trustedHead: head, checkpointHead: newHead
      };
    }
  };
  const anchor = {
    async compareAndSwap(_key, expected, next) {
      if (failAnchor || head !== expected) return false;
      head = next; return true;
    }
  };
  let timestamp = 0;
  const workflow = createRecoveryWorkflowCoordinator({
    inspector, anchor, journal,
    authorize: async ({ actorId }) => actorId !== "denied",
    verifyCommitProof: async ({ proof }) => proof === "verified",
    clock: () => ++timestamp
  });
  const input = {
    actorId: "operator", key: "graph", trustedHead: oldHead,
    checkpointHead: newHead, proof: "verified"
  };
  return { workflow, durable, input, getHead: () => head,
    setJournalFailure(value) { failJournal = value; } };
}
describe("Hyper XSUS Core — integrated recovery workflow", () => {
  it("journals proposal and independent approval before anchor execution", async () => {
    const f = setup();
    const proposed = await f.workflow.propose(f.input);
    await f.workflow.approve({ id: proposed.id, actorId: "reviewer" });
    const result = await f.workflow.execute({
      id: proposed.id, actorId: "auditor", proof: "verified"
    });
    expect(result.status).toBe("executed");
    expect(f.getHead()).toBe(newHead);
    expect((await f.durable.inspect()).records.map(record => record.action))
      .toEqual(["proposed", "approved", "executed"]);
  });
  it("rejects execution without approval", async () => {
    const f = setup();
    const proposed = await f.workflow.propose(f.input);
    await expect(f.workflow.execute({
      id: proposed.id, actorId: "auditor", proof: "verified"
    })).rejects.toThrow("not eligible");
    expect(f.getHead()).toBe(oldHead);
  });
  it("rejects self approval and unauthorized proposals", async () => {
    const f = setup();
    await expect(f.workflow.propose({ ...f.input, actorId: "denied" }))
      .rejects.toThrow("denied");
    const proposed = await f.workflow.propose(f.input);
    await expect(f.workflow.approve({ id: proposed.id, actorId: "operator" }))
      .rejects.toThrow("independent");
  });
  it("fails closed if the proposal journal write fails", async () => {
    const f = setup({ failJournal: true });
    await expect(f.workflow.propose(f.input)).rejects.toMatchObject({
      code: "RECOVERY_JOURNAL_FAILURE"
    });
    expect(f.getHead()).toBe(oldHead);
  });
  it("fails closed if approval journaling fails", async () => {
    const f = setup();
    const proposed = await f.workflow.propose(f.input);
    f.setJournalFailure(true);
    await expect(f.workflow.approve({
      id: proposed.id, actorId: "reviewer"
    })).rejects.toMatchObject({ code: "RECOVERY_JOURNAL_FAILURE" });
    await expect(f.workflow.execute({
      id: proposed.id, actorId: "auditor", proof: "verified"
    })).rejects.toThrow("manual reconciliation");
    expect(f.getHead()).toBe(oldHead);
  });
  it("does not execute revoked decisions", async () => {
    const f = setup();
    const proposed = await f.workflow.propose(f.input);
    await f.workflow.revoke({ id: proposed.id, actorId: "reviewer" });
    await expect(f.workflow.execute({
      id: proposed.id, actorId: "auditor", proof: "verified"
    })).rejects.toThrow("not eligible");
  });
  it("records failed CAS and blocks retries pending reconciliation", async () => {
    const f = setup({ failAnchor: true });
    const proposed = await f.workflow.propose(f.input);
    await f.workflow.approve({ id: proposed.id, actorId: "reviewer" });
    await expect(f.workflow.execute({
      id: proposed.id, actorId: "auditor", proof: "verified"
    })).rejects.toThrow("CAS conflict");
    expect((await f.durable.inspect()).records.at(-1).action).toBe("failed");
    expect((await f.workflow.inspect({ id: proposed.id, actorId: "auditor" })).blocked).toBe(true);
  });
  it("rejects incomplete integration dependencies", () => {
    expect(() => createRecoveryWorkflowCoordinator()).toThrow("requires");
  });
});
