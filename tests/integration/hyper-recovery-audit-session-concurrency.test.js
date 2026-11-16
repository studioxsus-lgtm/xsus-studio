import { describe, expect, it } from "vitest";
import { createRecoveryAuditSnapshotSession } from "../../src/hyper-xsus-core/knowledge-graph/recovery-audit-snapshot-session.js";
const requests = { r1: { id: "r1", key: "graph", status: "approved" } };
function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}
function fixture({ inspectionWait = null, inspectionEntered = null, snapshotWait = null } = {}) {
  let reads = 0;
  const session = createRecoveryAuditSnapshotSession({
    state: { async snapshot() {
      reads++;
      if (snapshotWait && reads === 1) await snapshotWait.promise;
      return { revision: 1, requests };
    } },
    reconciliation: { async inspect() {
      if (inspectionEntered) inspectionEntered.release();
      if (inspectionWait) await inspectionWait.promise;
      return { status: "consistent", reason: "approved-awaiting-execution" };
    } },
    authorize: async () => true,
    maxPageSize: 1
  });
  return session;
}
describe("Hyper XSUS Core — concurrent audit session isolation", () => {
  it("does not return a stale page after a new begin", async () => {
    const wait = deferred(), entered = deferred();
    const session = fixture({ inspectionWait: wait, inspectionEntered: entered });
    await session.begin({ actorId: "auditor" });
    const pending = session.page({ actorId: "auditor" });
    await entered.promise;
    await session.begin({ actorId: "auditor" });
    wait.release();
    await expect(pending).rejects.toThrow("superseded");
    const current = await session.page({ actorId: "auditor" });
    expect(current.records.map(x => x.id)).toEqual(["r1"]);
  });
  it("does not let an older delayed begin overwrite a newer begin", async () => {
    const wait = deferred();
    const session = fixture({ snapshotWait: wait });
    const old = session.begin({ actorId: "old" });
    await Promise.resolve();
    await session.begin({ actorId: "new" });
    wait.release();
    await expect(old).rejects.toThrow("superseded");
    const page = await session.page({ actorId: "new" });
    expect(page.records).toHaveLength(1);
    await expect(session.page({ actorId: "old" })).rejects.toThrow("Invalid");
  });
});
