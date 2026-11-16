import { describe, expect, it } from "vitest";
import { createPersistentRecoveryStateEngine } from "../../src/hyper-xsus-core/knowledge-graph/persistent-recovery-state-engine.js";
const genesis = "0".repeat(64), next = "a".repeat(64);
function storage() {
  let value = null;
  return {
    async read() { return value ? structuredClone(value) : null; },
    async compareAndSwap(_key, revision, update) {
      if ((value?.revision ?? 0) !== revision) return false;
      value = structuredClone(update); return true;
    }
  };
}
describe("Hyper XSUS Core — durable execution reservation", () => {
  it("reserves an approved recovery and finalizes after execution", async () => {
    const db = storage();
    const state = createPersistentRecoveryStateEngine({ storage: db, key: "graph", clock: () => 1 });
    await state.propose({
      id: "r1", requestKey: "graph", proposer: "operator",
      trustedHead: genesis, checkpointHead: next
    });
    await state.transition({
      id: "r1", actorId: "reviewer", expectedStatus: "pending", nextStatus: "approved"
    });
    await state.transition({
      id: "r1", actorId: "auditor", expectedStatus: "approved", nextStatus: "executing"
    });
    const restarted = createPersistentRecoveryStateEngine({ storage: db, key: "graph" });
    expect((await restarted.get("r1")).status).toBe("executing");
    await expect(restarted.transition({
      id: "r1", actorId: "other", expectedStatus: "approved", nextStatus: "executing"
    })).rejects.toThrow("conflict");
    await restarted.transition({
      id: "r1", actorId: "auditor", expectedStatus: "executing", nextStatus: "executed"
    });
    expect((await state.get("r1")).status).toBe("executed");
  });
  it("allows a terminal failure marker but prevents re-execution", async () => {
    const db = storage();
    const state = createPersistentRecoveryStateEngine({ storage: db, key: "graph", clock: () => 1 });
    await state.propose({
      id: "r2", requestKey: "graph", proposer: "operator",
      trustedHead: genesis, checkpointHead: next
    });
    await state.transition({
      id: "r2", actorId: "reviewer", expectedStatus: "pending", nextStatus: "approved"
    });
    await state.transition({
      id: "r2", actorId: "auditor", expectedStatus: "approved", nextStatus: "executing"
    });
    await state.transition({
      id: "r2", actorId: "auditor", expectedStatus: "executing", nextStatus: "failed"
    });
    await expect(state.transition({
      id: "r2", actorId: "auditor", expectedStatus: "failed", nextStatus: "executed"
    })).rejects.toThrow("Invalid recovery state transition");
  });
});
