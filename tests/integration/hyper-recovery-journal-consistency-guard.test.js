import { describe, expect, it } from "vitest";
import { createRecoveryJournalConsistencyGuard } from "../../src/hyper-xsus-core/knowledge-graph/recovery-journal-consistency-guard.js";
const G = "0".repeat(64), A = "a".repeat(64), J = "b".repeat(64);
function fixture({ actions = ["proposed", "approved"], status = "approved",
  head = G, fail = false } = {}) {
  const record = { id: "r1", key: "graph", status, trustedHead: G, checkpointHead: A };
  const guard = createRecoveryJournalConsistencyGuard({
    journal: { async inspect({ expectedHeadHash }) {
      if (fail || expectedHeadHash !== J) throw new Error("invalid");
      return { headHash: J, records: actions.map(action => ({ requestId: "r1", action })) };
    } },
    state: { async get() { return record; } },
    anchor: { async inspect() { return { headHash: head }; } }
  });
  return guard;
}
const request = { id: "r1", key: "graph", expectedJournalHead: J };
describe("Hyper XSUS Core — recovery journal consistency guard", () => {
  it("allows only a verified approved decision", async () => {
    expect(await fixture().inspect(request)).toMatchObject({
      status: "verified", safeToExecute: true
    });
  });
  it("rejects a missing approval or duplicate proposal", async () => {
    expect((await fixture({ actions: ["proposed"] }).inspect(request)).safeToExecute).toBe(false);
    expect((await fixture({ actions: ["proposed", "proposed", "approved"] })
      .inspect(request)).status).toBe("journal-inconsistent");
  });
  it("rejects revoked or already executed decisions", async () => {
    expect((await fixture({ actions: ["proposed", "approved", "revoked"] })
      .inspect(request)).safeToExecute).toBe(false);
    expect((await fixture({ actions: ["proposed", "approved", "executed"] })
      .inspect(request)).safeToExecute).toBe(false);
  });
  it("rejects diverged anchors and pending state", async () => {
    expect((await fixture({ head: A }).inspect(request)).status).toBe("state-diverged");
    expect((await fixture({ status: "pending" }).inspect(request)).safeToExecute).toBe(false);
  });
  it("fails closed on unverified journal history", async () => {
    expect((await fixture({ fail: true }).inspect(request)).status).toBe("integrity-unavailable");
  });
  it("requires a trusted head and dependencies", async () => {
    await expect(fixture().inspect({ id: "r1", key: "graph" }))
      .rejects.toThrow("trusted journal head");
    expect(() => createRecoveryJournalConsistencyGuard()).toThrow("requires");
  });
});
