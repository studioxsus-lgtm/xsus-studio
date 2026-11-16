import { describe, expect, it } from "vitest";
import { createKnowledgeGraphAPI } from "../../src/hyper-xsus-core/knowledge-graph/public/knowledge-graph.api.js";
import { createKnowledgeChangeEvidenceLedger } from "../../src/hyper-xsus-core/knowledge-graph/knowledge-change-evidence-ledger.js";
import { createGovernedKnowledgeChanges } from "../../src/hyper-xsus-core/knowledge-graph/governed-change-evidence.js";

function setup(options = {}) {
  const graphAPI = createKnowledgeGraphAPI({ id: "governed-evidence" });
  graphAPI.addNodes([{ id: "core" }, { id: "client" }, { id: "isolated" }]);
  graphAPI.addLink({ id: "dependency", sourceId: "client", targetId: "core", relationType: "depends_on" });
  let tick = 0;
  const service = createGovernedKnowledgeChanges({
    graphAPI, authorize: ({ actorId }) => actorId !== "denied",
    clock: () => ++tick, ...options
  });
  return { graphAPI, service };
}
const add = id => [{ type: "addNode", node: { id } }];

describe("Hyper XSUS Core — governed change evidence integration", () => {
  it("records proposal, approval and execution in a verified hash chain", () => {
    const { graphAPI, service } = setup();
    const proposed = service.propose({ id: "p", actorId: "author", operations: add("new") });
    expect(proposed.evidence.event.action).toBe("proposed");
    expect(graphAPI.getNode("new")).toBeNull();
    expect(service.approve("p", "reviewer").evidence.event.action).toBe("approved");
    expect(service.execute("p", "operator").evidence.event.action).toBe("executed");
    expect(graphAPI.getNode("new").id).toBe("new");
    const history = service.history("p", "reviewer");
    expect(history.records.map(r => r.event.action)).toEqual(["proposed", "approved", "executed"]);
    expect(history.integrity.valid).toBe(true);
    expect(service.verifyEvidence(service.exportEvidence().headHash).valid).toBe(true);
    expect(Object.isFrozen(history)).toBe(true);
  });

  it("records policy-blocked proposals without executing them", () => {
    const { graphAPI, service } = setup();
    const result = service.propose({
      id: "blocked", actorId: "author",
      operations: [{ type: "removeNode", id: "core" }]
    });
    expect(result.proposal.status).toBe("blocked");
    expect(result.evidence.event.action).toBe("blocked");
    expect(graphAPI.getNode("core")).not.toBeNull();
    expect(service.history("blocked", "author").records).toHaveLength(1);
  });

  it("records explicit rejection", () => {
    const { service } = setup();
    service.propose({ id: "reject", actorId: "author", operations: add("new") });
    expect(service.reject("reject", "reviewer").evidence.event.action).toBe("rejected");
    expect(service.history("reject", "reviewer").records.map(r => r.event.action))
      .toEqual(["proposed", "rejected"]);
  });

  it("records a stale transition once when graph changes after approval", () => {
    const { graphAPI, service } = setup();
    service.propose({ id: "stale", actorId: "author", operations: add("new") });
    service.approve("stale", "reviewer");
    graphAPI.addNode({ id: "external" });
    expect(() => service.execute("stale", "operator")).toThrow("changed");
    expect(service.history("stale", "reviewer").records.map(r => r.event.action))
      .toEqual(["proposed", "approved", "stale"]);
    expect(() => service.execute("stale", "operator")).toThrow("not executable");
    expect(service.history("stale", "reviewer").records).toHaveLength(3);
  });

  it("does not record failed authorization or insufficient approvals", () => {
    const { service } = setup();
    expect(() => service.propose({ id: "bad", actorId: "denied", operations: add("new") }))
      .toThrow("denied");
    service.propose({ id: "ok", actorId: "author", operations: add("new") });
    expect(() => service.execute("ok", "operator")).toThrow("Insufficient");
    expect(() => service.approve("ok", "denied")).toThrow("denied");
    expect(service.history("ok", "author").records).toHaveLength(1);
    expect(() => service.history("ok", "denied")).toThrow("denied");
  });

  it("rejects invalid dependencies and clocks", () => {
    expect(() => createGovernedKnowledgeChanges({})).toThrow("graphAPI");
    const { graphAPI } = setup();
    const service = createGovernedKnowledgeChanges({
      graphAPI, authorize: () => true, clock: () => -1
    });
    expect(() => service.propose({ id: "clock", actorId: "author", operations: add("new") }))
      .toThrow("clock");
  });

  it("makes audit capacity failures visible without falsely claiming rollback", () => {
    const ledger = createKnowledgeChangeEvidenceLedger({ maxRecords: 1 });
    const { graphAPI, service } = setup({ ledger });
    service.propose({ id: "capacity", actorId: "author", operations: add("new") });
    expect(() => service.approve("capacity", "reviewer")).toThrow("capacity");
    // The approval already occurred in governance: callers must reconcile.
    expect(service.history("capacity", "reviewer").proposal.approvals).toEqual(["reviewer"]);
    expect(graphAPI.getNode("new")).toBeNull();
    expect(service.history("capacity", "reviewer").records).toHaveLength(1);
  });
});
