import { describe, expect, it } from "vitest";
import { createGuardedDistributedRecoveryWorkflow } from "../../src/hyper-xsus-core/knowledge-graph/guarded-distributed-recovery-workflow.js";
const HEAD = "a".repeat(64);
function fixture({ guardStatus = "verified", trusted = HEAD, failProvider = false } = {}) {
  let executed = 0;
  const workflow = {
    async inspect({ id }) { return { id, key: "graph", status: "approved" }; },
    async execute(input) { executed++; return { status: "executed", ...input }; }
  };
  const guard = {
    async inspect({ id, key, expectedJournalHead }) {
      return { id, key, journalHead: expectedJournalHead,
        status: guardStatus, safeToExecute: guardStatus === "verified" };
    }
  };
  const guarded = createGuardedDistributedRecoveryWorkflow({
    workflow, guard,
    trustedJournalHead: async () => {
      if (failProvider) throw new Error("trusted source offline");
      return trusted;
    }
  });
  return { guarded, getExecuted: () => executed };
}
const input = { id: "recovery-1", actorId: "auditor", proof: "verified" };
describe("Hyper XSUS Core — guarded distributed recovery workflow", () => {
  it("executes only after trusted journal integrity verification", async () => {
    const f = fixture();
    expect((await f.guarded.execute(input)).status).toBe("executed");
    expect(f.getExecuted()).toBe(1);
  });
  it("denies inconsistent journal without touching execution", async () => {
    const f = fixture({ guardStatus: "journal-inconsistent" });
    await expect(f.guarded.execute(input)).rejects.toMatchObject({
      code: "RECOVERY_INTEGRITY_GATE_DENIED"
    });
    expect(f.getExecuted()).toBe(0);
  });
  it("fails closed when trusted head provider is unavailable", async () => {
    const f = fixture({ failProvider: true });
    await expect(f.guarded.execute(input)).rejects.toThrow("trusted source offline");
    expect(f.getExecuted()).toBe(0);
  });
  it("rejects missing integration dependencies", () => {
    expect(() => createGuardedDistributedRecoveryWorkflow()).toThrow("requires");
  });
  it("passes the original request to the underlying guarded executor", async () => {
    const f = fixture();
    expect(await f.guarded.execute(input)).toMatchObject(input);
  });
});
