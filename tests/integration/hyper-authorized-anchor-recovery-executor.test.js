import { describe, expect, it } from "vitest";
import { createAuthorizedAnchorRecoveryExecutor } from "../../src/hyper-xsus-core/knowledge-graph/authorized-anchor-recovery-executor.js";
const oldHead = "0".repeat(64), newHead = "a".repeat(64);
function fixture(overrides = {}) {
  let current = oldHead;
  const entries = [];
  const decision = {
    id: "recovery-1", key: "graph", status: "approved",
    proposer: "operator", approvedBy: "reviewer",
    trustedHead: oldHead, checkpointHead: newHead
  };
  const config = {
    decisions: { async get() { return decision; } },
    inspector: { async inspect() {
      return { status: "possible-interrupted-anchor-update", safeToWrite: false,
        trustedHead: current, checkpointHead: newHead };
    } },
    anchor: { async compareAndSwap(key, expected, next) {
      if (key !== "graph" || current !== expected) return false;
      current = next; return true;
    } },
    authorize: async ({ actorId }) => actorId !== "denied",
    verifyCommitProof: async ({ proof }) => proof === "verified",
    journal: { async append(record) { entries.push(record); return record; } },
    clock: () => 12, ...overrides
  };
  return { executor: createAuthorizedAnchorRecoveryExecutor(config),
    entries, decision, getHead: () => current };
}
const request = { id: "recovery-1", actorId: "auditor", proof: "verified" };
describe("Hyper XSUS Core — authorized anchor recovery executor", () => {
  it("advances only with approved decision, proof and fresh state", async () => {
    const f = fixture();
    const result = await f.executor.execute(request);
    expect(result.status).toBe("executed");
    expect(f.getHead()).toBe(newHead);
    expect(f.entries.map(item => item.action)).toEqual(["executed"]);
    await expect(f.executor.execute(request)).rejects.toThrow(/already attempted|state changed/);
  });
  it("rejects missing proof and denied identities without touching anchor", async () => {
    const f = fixture();
    await expect(f.executor.execute({ ...request, proof: "bad" })).rejects.toThrow("proof rejected");
    await expect(f.executor.execute({ ...request, actorId: "denied" })).rejects.toThrow("access denied");
    expect(f.getHead()).toBe(oldHead);
  });
  it("refuses unapproved and self-approved decisions", async () => {
    const f = fixture();
    f.decision.status = "pending";
    await expect(f.executor.execute(request)).rejects.toThrow("not eligible");
    f.decision.status = "approved";
    f.decision.approvedBy = f.decision.proposer;
    await expect(f.executor.execute(request)).rejects.toThrow("not eligible");
  });
  it("reports partial commit when journal fails after successful anchor CAS", async () => {
    const f = fixture({
      journal: { async append() { throw new Error("offline"); } }
    });
    await expect(f.executor.execute(request)).rejects.toMatchObject({
      code: "RECOVERY_PARTIAL_COMMIT"
    });
    expect(f.getHead()).toBe(newHead);
  });
  it("validates required dependencies", () => {
    expect(() => createAuthorizedAnchorRecoveryExecutor()).toThrow("requires");
  });
});
