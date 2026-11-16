import { describe, expect, it } from "vitest";
import { createKnowledgeGraphAPI } from "../../src/hyper-xsus-core/knowledge-graph/public/knowledge-graph.api.js";
import { createKnowledgeChangeGovernance } from "../../src/hyper-xsus-core/knowledge-graph/knowledge-change-governance.js";
import { createKnowledgeChangeEvidenceLedger } from "../../src/hyper-xsus-core/knowledge-graph/knowledge-change-evidence-ledger.js";
import { createGovernedChangeEvidence } from "../../src/hyper-xsus-core/knowledge-graph/governed-change-evidence.js";
import { createKnowledgeGovernanceReconciler } from "../../src/hyper-xsus-core/knowledge-graph/knowledge-governance-reconciliation.js";

const add = id => [{ type: "addNode", node: { id } }];
function setup() {
  const graphAPI = createKnowledgeGraphAPI({ id: "reconcile-graph" });
  const governance = createKnowledgeChangeGovernance({
    graphAPI, authorize: ({ actorId }) => actorId !== "denied"
  });
  const ledger = createKnowledgeChangeEvidenceLedger();
  let tick = 100;
  const facade = createGovernedChangeEvidence({ governance, ledger, clock: () => ++tick });
  const reconciler = createKnowledgeGovernanceReconciler({
    governance, ledger, authorize: ({ actorId }) => actorId === "auditor",
    clock: () => ++tick
  });
  return { graphAPI, governance, ledger, facade, reconciler };
}

describe("Hyper XSUS Core — governance evidence reconciliation", () => {
  it("identifies consistent, fully recorded transitions without writing", () => {
    const { facade, reconciler, ledger } = setup();
    facade.propose({ id: "p", actorId: "author", operations: add("n") });
    facade.approve("p", "reviewer");
    facade.execute("p", "operator");
    const before = ledger.headHash;
    const report = reconciler.inspect("p", "auditor");
    expect(report.classification).toBe("consistent");
    expect(report.recordedActions).toEqual(["proposed", "approved", "executed"]);
    expect(report.repairable).toBe(false);
    expect(reconciler.reconcile("p", "auditor").repaired).toBe(false);
    expect(ledger.headHash).toBe(before);
  });

  it("detects missing execution evidence and records a transparent observation", () => {
    const { governance, ledger, reconciler, graphAPI } = setup();
    governance.propose({ id: "p", actorId: "author", operations: add("n") });
    governance.approve("p", "reviewer");
    ledger.append({ proposalId: "p", actorId: "author", action: "proposed", timestamp: 1 });
    ledger.append({ proposalId: "p", actorId: "reviewer", action: "approved", timestamp: 2 });
    governance.execute("p", "operator");
    const report = reconciler.inspect("p", "auditor");
    expect(report.missingActions).toEqual(["executed"]);
    expect(report.repairable).toBe(true);
    const repaired = reconciler.reconcile("p", "auditor");
    expect(repaired.repaired).toBe(true);
    expect(repaired.evidence.event.details.reconciled).toBe(true);
    expect(repaired.evidence.event.action).toBe("executed");
    expect(repaired.report.classification).toBe("consistent");
    expect(graphAPI.getNode("n").id).toBe("n");
    expect(reconciler.reconcile("p", "auditor").repaired).toBe(false);
    expect(ledger.verify().valid).toBe(true);
  });

  it("does not fabricate missing approval evidence", () => {
    const { governance, ledger, reconciler } = setup();
    governance.propose({ id: "p", actorId: "author", operations: add("n") });
    governance.approve("p", "reviewer");
    governance.execute("p", "operator");
    ledger.append({ proposalId: "p", actorId: "author", action: "proposed", timestamp: 1 });
    const report = reconciler.inspect("p", "auditor");
    expect(report.unrecordedApprovals).toEqual(["reviewer"]);
    expect(report.repairable).toBe(false);
    expect(() => reconciler.reconcile("p", "auditor")).toThrow("manual review");
  });

  it("does not repair missing pending-proposal evidence", () => {
    const { governance, reconciler } = setup();
    governance.propose({ id: "p", actorId: "author", operations: add("n") });
    const report = reconciler.inspect("p", "auditor");
    expect(report.missingActions).toEqual(["proposed"]);
    expect(report.repairable).toBe(false);
    expect(() => reconciler.reconcile("p", "auditor")).toThrow("manual review");
  });

  it("rejects contradictory terminal records", () => {
    const { governance, ledger, reconciler } = setup();
    governance.propose({ id: "p", actorId: "author", operations: add("n") });
    governance.reject("p", "reviewer");
    ledger.append({ proposalId: "p", actorId: "author", action: "proposed", timestamp: 1 });
    ledger.append({ proposalId: "p", actorId: "reviewer", action: "executed", timestamp: 2 });
    const report = reconciler.inspect("p", "auditor");
    expect(report.unexpectedTerminalActions).toEqual(["executed"]);
    expect(report.repairable).toBe(false);
    expect(() => reconciler.reconcile("p", "auditor")).toThrow("manual review");
  });

  it("enforces reconciliation authorization and governance read access", () => {
    const { governance, reconciler } = setup();
    governance.propose({ id: "p", actorId: "author", operations: add("n") });
    expect(() => reconciler.inspect("p", "denied")).toThrow("denied");
    expect(() => reconciler.reconcile("p", "denied")).toThrow("denied");
  });

  it("rejects malformed dependencies", () => {
    expect(() => createKnowledgeGovernanceReconciler()).toThrow("governance");
    expect(() => createKnowledgeGovernanceReconciler({ governance: { get() {} } }))
      .toThrow("ledger");
  });
});
