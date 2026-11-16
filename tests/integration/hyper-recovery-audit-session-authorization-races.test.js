import { describe, expect, it } from "vitest";
import { createRecoveryAuditSnapshotSession } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-snapshot-session.js";
const requests = { r1: { id: "r1", key: "graph", status: "approved" } };
function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}
describe("Hyper XSUS Core — audit session authorization and evidence race", () => {
  it("does not invalidate an existing session on denied begin", async () => {
    const session = createRecoveryAuditSnapshotSession({
      state: { async snapshot() { return { revision: 1, requests }; } },
      reconciliation: { async inspect() { return { status: "consistent", reason: "verified" }; } },
      authorize: async ({ actorId }) => actorId === "auditor"
    });
    await session.begin({ actorId: "auditor" });
    await expect(session.begin({ actorId: "intruder" })).rejects.toThrow("access denied");
    const page = await session.page({ actorId: "auditor" });
    expect(page.records.map(record => record.id)).toEqual(["r1"]);
  });
  it("never uses a replacement session baseline for an in-flight page", async () => {
    const entered = deferred(), release = deferred();
    let baselineNumber = 0;
    const seen = [];
    const session = createRecoveryAuditSnapshotSession({
      state: { async snapshot() { return { revision: 1, requests }; } },
      reconciliation: { async inspect() {
        entered.release();
        await release.promise;
        return { status: "consistent", reason: "verified" };
      } },
      authorize: async () => true,
      evidenceKey: "graph",
      evidenceGate: {
        async begin() { return Object.freeze({ stateRevision: 1, marker: ++baselineNumber }); },
        async verify({ baseline }) {
          seen.push(baseline.marker);
          if (baseline.marker !== 1) {
            throw new Error("Wrong audit baseline.");
          }
          return { consistent: true };
        }
      }
    });
    await session.begin({ actorId: "auditor" });
    const stalePage = session.page({ actorId: "auditor" });
    await entered.promise;
    await session.begin({ actorId: "auditor" });
    release.release();
    await expect(stalePage).rejects.toThrow("superseded");
    expect(seen).toEqual([1, 1]);
  });
});
