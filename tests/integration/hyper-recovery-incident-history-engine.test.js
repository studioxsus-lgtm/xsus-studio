import { describe, expect, it } from "vitest";
import { createRecoveryIncidentHistoryEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-incident-history-engine.js";
import { createRecoveryIncidentTriageEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-incident-triage-engine.js";
function triage(revision, assessment) {
  const counts = { [assessment]: 1 };
  return createRecoveryIncidentTriageEngine().assess({
    revision, total: 1, counts,
    records: [{ id: "incident-1", assessment, persistedStatus: "executing", safeToRetry: false }],
    readOnly: true, automaticRecovery: false
  });
}
function fixture({ denied = false, maxEntries = 5 } = {}) {
  const data = new Map();
  const storage = {
    async read(scope) {
      return structuredClone(data.get(scope) ?? { revision: 0, entries: [] });
    },
    async compareAndSwap(scope, revision, next) {
      const current = data.get(scope) ?? { revision: 0, entries: [] };
      if (current.revision !== revision) return false;
      data.set(scope, structuredClone(next));
      return true;
    }
  };
  const options = { storage, maxEntries,
    authorize: async ({ actorId }) => !denied && actorId === "auditor" };
  return { storage, data, options,
    engine: createRecoveryIncidentHistoryEngine(options) };
}
const request = (previous, current) => ({
  scope: "graph", actorId: "auditor", previous, current
});
describe("Hyper XSUS Core — persistent incident history", () => {
  it("appends validated trends and restores history with a new engine instance", async () => {
    const f = fixture();
    const first = await f.engine.append(request(triage(1, "reconcile"), triage(2, "inconsistent")));
    expect(first.persisted).toBe(true);
    const restarted = createRecoveryIncidentHistoryEngine(f.options);
    const history = await restarted.read({ scope: "graph", actorId: "auditor" });
    expect(history.revision).toBe(1);
    expect(history.entries[0].escalated).toEqual(["incident-1"]);
    expect(Object.isFrozen(history.entries[0].escalated)).toBe(true);
    await restarted.append(request(triage(2, "inconsistent"), triage(3, "consistent")));
    expect((await f.engine.read({ scope: "graph", actorId: "auditor" })).entries[1].resolved)
      .toEqual(["incident-1"]);
  });
  it("rejects gaps in audit revision continuity", async () => {
    const f = fixture();
    await f.engine.append(request(triage(1, "reconcile"), triage(2, "inconsistent")));
    await expect(f.engine.append(request(triage(4, "reconcile"), triage(5, "inconsistent"))))
      .rejects.toThrow("continuity");
  });
  it("rejects unauthorized access before touching storage", async () => {
    const f = fixture({ denied: true });
    await expect(f.engine.append(request(triage(1, "reconcile"), triage(2, "inconsistent"))))
      .rejects.toThrow("access denied");
    expect(f.data.size).toBe(0);
  });
  it("rejects corrupted persisted entries on recovery", async () => {
    const f = fixture();
    await f.engine.append(request(triage(1, "reconcile"), triage(2, "inconsistent")));
    f.data.get("graph").entries[0].escalated.push("incident-1");
    await expect(f.engine.read({ scope: "graph", actorId: "auditor" }))
      .rejects.toThrow("integrity");
  });
  it("prevents lost updates with atomic CAS across instances", async () => {
    const f = fixture();
    const a = f.engine, b = createRecoveryIncidentHistoryEngine(f.options);
    const [one, two] = await Promise.allSettled([
      a.append(request(triage(1, "reconcile"), triage(2, "inconsistent"))),
      b.append(request(triage(1, "reconcile"), triage(2, "inconsistent")))
    ]);
    expect([one.status, two.status].sort()).toEqual(["fulfilled", "rejected"]);
    expect((await a.read({ scope: "graph", actorId: "auditor" })).entries).toHaveLength(1);
  });
  it("enforces bounded history without deleting old evidence", async () => {
    const f = fixture({ maxEntries: 1 });
    await f.engine.append(request(triage(1, "reconcile"), triage(2, "inconsistent")));
    await expect(f.engine.append(request(triage(2, "inconsistent"), triage(3, "missing"))))
      .rejects.toThrow("capacity");
    expect((await f.engine.read({ scope: "graph", actorId: "auditor" })).entries).toHaveLength(1);
  });
  it("does not allow a caller to mutate returned stored evidence", async () => {
    const f = fixture();
    await f.engine.append(request(triage(1, "reconcile"), triage(2, "inconsistent")));
    const history = await f.engine.read({ scope: "graph", actorId: "auditor" });
    expect(() => history.entries[0].escalated.push("injected")).toThrow();
    expect((await f.engine.read({ scope: "graph", actorId: "auditor" }))
      .entries[0].escalated).toEqual(["incident-1"]);
  });
});
