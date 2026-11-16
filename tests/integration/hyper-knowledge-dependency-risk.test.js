import { describe, expect, it } from "vitest";
import { createKnowledgeGraphAPI } from "../../src/hyper-xsus-core/knowledge-graph/public/knowledge-graph.api.js";
import {
  createKnowledgeRiskPolicy,
  assessKnowledgeDependencyRisk,
  previewKnowledgeRiskControlledRemoval,
  createKnowledgeDependencyRiskAssessor
} from "../../src/hyper-xsus-core/knowledge-graph/knowledge-dependency-risk.js";

function setup() {
  const api = createKnowledgeGraphAPI({ id: "dependency-risk" });
  api.addNodes(["core", "app", "web", "service", "leaf", "isolated"].map(id => ({ id })));
  api.addLinks([
    { id: "app-core", sourceId: "app", targetId: "core", relationType: "depends_on" },
    { id: "web-core", sourceId: "web", targetId: "core", relationType: "depends_on" },
    { id: "service-app", sourceId: "service", targetId: "app", relationType: "implements" },
    { id: "leaf-service", sourceId: "leaf", targetId: "service", relationType: "related_to" }
  ]);
  return api;
}

describe("Hyper XSUS Core — dependency risk assessment", () => {
  it("blocks removal of a central dependency and explains why", () => {
    const api = setup();
    const before = api.getGraph();
    const report = assessKnowledgeDependencyRisk(before, ["core"]);
    expect(report.riskLevel).toBe("high");
    expect(report.decision).toBe("blocked");
    expect(report.allowedByPolicy).toBe(false);
    expect(report.directDependents).toEqual(["app", "web"]);
    expect(report.highValueDependencyLinkIds).toEqual(["app-core", "web-core"]);
    expect(report.impact.affectedNodes.map(node => node.id)).toEqual(["app", "web", "service", "leaf"]);
    expect(report.reasons.map(item => item.code)).toContain("HIGH_VALUE_DEPENDENCY_RELATIONS");
    expect(api.getGraph()).toEqual(before);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.policy.highRelationTypes)).toBe(true);
  });

  it("allows isolated removals to proceed to review without executing", () => {
    const api = setup();
    const report = assessKnowledgeDependencyRisk(api.getGraph(), ["isolated"]);
    expect(report.riskLevel).toBe("low");
    expect(report.decision).toBe("review");
    expect(report.allowedByPolicy).toBe(true);
    expect(report.directDependentCount).toBe(0);
    expect(api.getNode("isolated")).not.toBeNull();
  });

  it("applies configurable high and critical thresholds", () => {
    const snapshot = setup().getGraph();
    const report = assessKnowledgeDependencyRisk(snapshot, ["core"], {
      highAffectedCount: 2,
      criticalAffectedCount: 4,
      highRelationTypes: []
    });
    expect(report.riskLevel).toBe("critical");
    expect(report.reasons.map(item => item.code)).toContain("CRITICAL_REACH");
  });

  it("fails closed on truncated impact analysis", () => {
    const report = assessKnowledgeDependencyRisk(setup().getGraph(), ["core"], {
      maxAffectedNodes: 1,
      highRelationTypes: [],
      blockAtOrAbove: "critical"
    });
    expect(report.impact.truncated).toBe(true);
    expect(report.riskLevel).toBe("critical");
    expect(report.allowedByPolicy).toBe(false);
    expect(report.reasons.map(item => item.code)).toContain("INCOMPLETE_IMPACT_ANALYSIS");
  });

  it("returns a valid proposed graph without changing live state", () => {
    const api = setup();
    const before = api.getGraph();
    const preview = previewKnowledgeRiskControlledRemoval(before, ["core"]);
    expect(preview.assessment.decision).toBe("blocked");
    expect(preview.proposedGraph.nodes.map(node => node.id)).not.toContain("core");
    expect(preview.proposedGraph.links.map(link => link.id)).toEqual(["service-app", "leaf-service"]);
    expect(api.getGraph()).toEqual(before);
    expect(Object.isFrozen(preview)).toBe(true);
  });

  it("binds to live graph API without caching snapshots", () => {
    const api = setup();
    const assessor = createKnowledgeDependencyRiskAssessor(api);
    expect(assessor.assess(["isolated"]).riskLevel).toBe("low");
    api.addLink({ id: "app-isolated", sourceId: "app", targetId: "isolated", relationType: "depends_on" });
    expect(assessor.assess(["isolated"]).riskLevel).toBe("high");
    expect(assessor.previewRemoval(["isolated"]).assessment.decision).toBe("blocked");
    api.close();
    expect(() => assessor.assess(["core"])).toThrow("closed");
  });

  it("rejects invalid policies and unknown fields", () => {
    expect(() => createKnowledgeRiskPolicy({ unknown: true })).toThrow("Unknown");
    expect(() => createKnowledgeRiskPolicy({ direction: "sideways" })).toThrow("direction");
    expect(() => createKnowledgeRiskPolicy({ maxDepth: Infinity })).toThrow("maxDepth");
    expect(() => createKnowledgeRiskPolicy({ blockAtOrAbove: "none" })).toThrow("blockAtOrAbove");
    expect(() => createKnowledgeRiskPolicy({ highAffectedCount: 5, criticalAffectedCount: 3 })).toThrow("thresholds");
    expect(() => createKnowledgeRiskPolicy({ highRelationTypes: ["depends_on", "depends_on"] })).toThrow("highRelationTypes");
    expect(() => createKnowledgeRiskPolicy(null)).toThrow("plain object");
  });

  it("rejects unknown nodes and invalid adapters", () => {
    expect(() => assessKnowledgeDependencyRisk(setup().getGraph(), ["unknown"])).toThrow("not found");
    expect(() => createKnowledgeDependencyRiskAssessor({})).toThrow("getGraph");
  });
});
