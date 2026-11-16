import { describe, expect, it } from "vitest";
import { createKnowledgeGraphAPI } from "../../src/hyper-xsus-core/knowledge-graph/public/knowledge-graph.api.js";
import { createKnowledgeChangeGovernance } from "../../src/hyper-xsus-core/knowledge-graph/knowledge-change-governance.js";

function setup(options = {}) {
  const graphAPI = createKnowledgeGraphAPI({ id: "governed-graph" });
  graphAPI.addNodes([{ id: "core" }, { id: "client" }, { id: "isolated" }]);
  graphAPI.addLink({ id: "client-core", sourceId: "client", targetId: "core", relationType: "depends_on" });
  const governance = createKnowledgeChangeGovernance({
    graphAPI,
    authorize: ({ actorId }) => actorId !== "intruder",
    ...options
  });
  return { graphAPI, governance };
}
const add = id => [{ type: "addNode", node: { id } }];

describe("Hyper XSUS Core — knowledge change governance", () => {
  it("requires independent approval before atomic execution", () => {
    const { graphAPI, governance } = setup();
    const proposal = governance.propose({ id: "p1", actorId: "author", operations: add("new") });
    expect(proposal.status).toBe("pending");
    expect(proposal.preview.nodes.map(n => n.id)).toContain("new");
    expect(graphAPI.getNode("new")).toBeNull();
    expect(() => governance.execute("p1", "operator")).toThrow("Insufficient");
    expect(() => governance.approve("p1", "author")).toThrow("own");
    governance.approve("p1", "reviewer");
    const executed = governance.execute("p1", "operator");
    expect(executed.status).toBe("executed");
    expect(executed.result.operationCount).toBe(1);
    expect(graphAPI.getNode("new").id).toBe("new");
    expect(() => governance.execute("p1", "operator")).toThrow("not executable");
  });

  it("blocks high-risk removals even when approvals are available", () => {
    const { graphAPI, governance } = setup();
    const proposal = governance.propose({
      id: "risk", actorId: "author",
      operations: [{ type: "removeNode", id: "core" }]
    });
    expect(proposal.status).toBe("blocked");
    expect(proposal.assessment.riskLevel).toBe("high");
    expect(() => governance.approve("risk", "reviewer")).toThrow("not pending");
    expect(graphAPI.getNode("core")).not.toBeNull();
  });

  it("rejects stale proposals without applying any operations", () => {
    const { graphAPI, governance } = setup();
    governance.propose({ id: "stale", actorId: "author", operations: add("new") });
    governance.approve("stale", "reviewer");
    graphAPI.addNode({ id: "external" });
    expect(() => governance.execute("stale", "operator")).toThrow("changed");
    expect(governance.get("stale", "reviewer").status).toBe("stale");
    expect(graphAPI.getNode("new")).toBeNull();
  });

  it("supports explicit rejection and immutable review snapshots", () => {
    const { governance } = setup();
    governance.propose({ id: "reject", actorId: "author", operations: add("new") });
    const rejected = governance.reject("reject", "reviewer");
    expect(rejected.status).toBe("rejected");
    expect(Object.isFrozen(rejected)).toBe(true);
    expect(Object.isFrozen(rejected.operations)).toBe(true);
    expect(() => governance.approve("reject", "reviewer")).toThrow("not pending");
  });

  it("rejects unauthorized access before creating or approving proposals", () => {
    const { governance } = setup();
    expect(() => governance.propose({ id: "bad", actorId: "intruder", operations: add("new") }))
      .toThrow("denied");
    governance.propose({ id: "ok", actorId: "author", operations: add("new") });
    expect(() => governance.approve("ok", "intruder")).toThrow("denied");
    expect(() => governance.get("ok", "intruder")).toThrow("denied");
  });

  it("requires multiple distinct reviewers when configured", () => {
    const { governance } = setup({ requiredApprovals: 2 });
    governance.propose({ id: "multi", actorId: "author", operations: add("new") });
    governance.approve("multi", "reviewer1");
    expect(() => governance.approve("multi", "reviewer1")).toThrow("Duplicate");
    expect(() => governance.execute("multi", "operator")).toThrow("Insufficient");
    governance.approve("multi", "reviewer2");
    expect(governance.execute("multi", "operator").status).toBe("executed");
  });

  it("rejects invalid changesets and duplicate proposal IDs", () => {
    const { governance, graphAPI } = setup();
    expect(() => governance.propose({ id: "empty", actorId: "author", operations: [] }))
      .toThrow("1 to 1000");
    expect(() => governance.propose({ id: "bad", actorId: "author", operations: [{ type: "unknown" }] }))
      .toThrow("Unsupported");
    governance.propose({ id: "one", actorId: "author", operations: add("new") });
    expect(() => governance.propose({ id: "one", actorId: "author", operations: add("other") }))
      .toThrow("Duplicate");
    expect(graphAPI.getNode("new")).toBeNull();
  });

  it("limits proposal storage and refuses operation after graph closure", () => {
    const { governance, graphAPI } = setup({ maxProposals: 1 });
    governance.propose({ id: "one", actorId: "author", operations: add("new") });
    expect(() => governance.propose({ id: "two", actorId: "author", operations: add("another") }))
      .toThrow("capacity");
    graphAPI.close();
    expect(() => governance.propose({ id: "three", actorId: "author", operations: add("another") }))
      .toThrow("capacity");
  });
});
