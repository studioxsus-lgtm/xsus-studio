import { describe, expect, it } from "vitest";
import { createRecoveryAuthorizationEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-authorization-engine.js";

const oldHead = "0".repeat(64), newHead = "a".repeat(64);
function setup(overrides = {}) {
  let state = {
    status: "possible-interrupted-anchor-update", trustedHead: oldHead,
    checkpointHead: newHead, safeToWrite: false
  };
  const engine = createRecoveryAuthorizationEngine({
    inspect: async () => state,
    authorize: async ({ actorId }) => actorId !== "denied",
    verifyCommitProof: async ({ proof }) => proof === "verified",
    clock: () => 123, ...overrides
  });
  return { engine, setState(next) { state = next; } };
}
const request = { actorId: "operator", key: "graph", trustedHead: oldHead,
  checkpointHead: newHead, proof: "verified" };

describe("Hyper XSUS Core — recovery authorization engine", () => {
  it("requires independent proof and a second approver", async () => {
    const { engine } = setup();
    const proposed = await engine.propose(request);
    expect(proposed.status).toBe("pending");
    await expect(engine.approve({ id: proposed.id, actorId: "operator" }))
      .rejects.toThrow("independent approver");
    const approved = await engine.approve({ id: proposed.id, actorId: "reviewer" });
    expect(approved).toMatchObject({ status: "approved", approvedBy: "reviewer" });
    await expect(engine.approve({ id: proposed.id, actorId: "other" }))
      .rejects.toThrow("not pending");
  });
  it("rejects missing independent proof", async () => {
    const { engine } = setup();
    await expect(engine.propose({ ...request, proof: "unverified" }))
      .rejects.toThrow("proof rejected");
  });
  it("rejects stale recovery decisions at approval time", async () => {
    const { engine, setState } = setup();
    const proposed = await engine.propose(request);
    setState({ status: "consistent", safeToWrite: true });
    await expect(engine.approve({ id: proposed.id, actorId: "reviewer" }))
      .rejects.toThrow("state changed");
  });
  it("enforces authorization and protects proposal reads", async () => {
    const { engine } = setup();
    await expect(engine.propose({ ...request, actorId: "denied" }))
      .rejects.toThrow("denied");
    const proposed = await engine.propose(request);
    await expect(engine.get({ id: proposed.id, actorId: "denied" }))
      .rejects.toThrow("denied");
  });
  it("revokes approvals and disallows reuse", async () => {
    const { engine } = setup();
    const proposed = await engine.propose(request);
    const revoked = await engine.revoke({ id: proposed.id, actorId: "reviewer" });
    expect(revoked.status).toBe("revoked");
    await expect(engine.approve({ id: proposed.id, actorId: "reviewer" }))
      .rejects.toThrow("not pending");
  });
  it("rejects invalid configuration and proposals", async () => {
    expect(() => createRecoveryAuthorizationEngine()).toThrow("callbacks");
    const { engine } = setup();
    await expect(engine.propose({ ...request, key: "../bad" }))
      .rejects.toThrow("Invalid recovery proposal");
  });
});
