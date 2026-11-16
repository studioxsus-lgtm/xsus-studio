import { describe, expect, it } from "vitest";
import { createKnowledgeGraphAPI } from "../../src/hyper-xsus-core/knowledge-graph/public/knowledge-graph.api.js";
import {
  analyzeKnowledgeImpact,
  previewKnowledgeNodeRemoval,
  createKnowledgeImpactAnalyzer
} from "../../src/hyper-xsus-core/knowledge-graph/knowledge-impact-analyzer.js";

function graph() {
  const api = createKnowledgeGraphAPI({ id: "impact-graph" });
  api.addNodes(["a", "b", "c", "d", "e"].map(id => ({ id })));
  api.addLinks([
    { id: "ab", sourceId: "a", targetId: "b", relationType: "depends_on" },
    { id: "bc", sourceId: "b", targetId: "c", relationType: "depends_on" },
    { id: "cd", sourceId: "c", targetId: "d", relationType: "depends_on" },
    { id: "eb", sourceId: "e", targetId: "b", relationType: "depends_on" }
  ]);
  return api;
}

describe("Hyper XSUS Core — knowledge change impact analyzer", () => {
  it("finds transitive impact deterministically and leaves graph unchanged", () => {
    const api = graph();
    const before = api.getGraph();
    const report = analyzeKnowledgeImpact(before, ["a"]);
    expect(report.roots).toEqual(["a"]);
    expect(report.affectedNodes.map(node => [node.id, node.depth])).toEqual([
      ["b", 1], ["c", 2], ["d", 3]
    ]);
    expect(report.directlyRemovedLinkIds).toEqual(["ab"]);
    expect(report.incidentLinkIds).toEqual(["ab", "bc", "cd", "eb"]);
    expect(report.truncated).toBe(false);
    expect(api.getGraph()).toEqual(before);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.affectedNodes[0])).toBe(true);
    expect(analyzeKnowledgeImpact(before, ["a"])).toEqual(report);
  });

  it("supports incoming, both and depth-bounded traversal", () => {
    const snapshot = graph().getGraph();
    expect(analyzeKnowledgeImpact(snapshot, ["b"], { direction: "incoming" })
      .affectedNodes.map(node => node.id)).toEqual(["a", "e"]);
    expect(analyzeKnowledgeImpact(snapshot, ["b"], { direction: "both", maxDepth: 1 })
      .affectedNodes.map(node => node.id)).toEqual(["c", "a", "e"]);
    expect(analyzeKnowledgeImpact(snapshot, ["a"], { maxDepth: 0 }).affectedCount).toBe(0);
  });

  it("reports truncation when reachable nodes exceed the configured bound", () => {
    const report = analyzeKnowledgeImpact(graph().getGraph(), ["a"], { maxAffectedNodes: 1 });
    expect(report.affectedNodes.map(node => node.id)).toEqual(["b"]);
    expect(report.truncated).toBe(true);
  });

  it("previews a valid node removal and cascaded edge deletion without writing", () => {
    const api = graph();
    const before = api.getGraph();
    const preview = previewKnowledgeNodeRemoval(before, ["b"]);
    expect(preview.impact.directlyRemovedLinkIds).toEqual(["ab", "bc", "eb"]);
    expect(preview.proposedGraph.nodes.map(node => node.id)).toEqual(["a", "c", "d", "e"]);
    expect(preview.proposedGraph.links.map(link => link.id)).toEqual(["cd"]);
    expect(api.getGraph()).toEqual(before);
    expect(Object.isFrozen(preview.proposedGraph)).toBe(true);
  });

  it("reads a fresh snapshot for each bound API call", () => {
    const api = graph();
    const analyzer = createKnowledgeImpactAnalyzer(api);
    expect(analyzer.analyze(["a"]).affectedCount).toBe(3);
    api.addNode({ id: "f" });
    api.addLink({ id: "df", sourceId: "d", targetId: "f", relationType: "related_to" });
    expect(analyzer.analyze(["a"]).affectedCount).toBe(4);
    expect(analyzer.previewRemoval(["f"]).proposedGraph.nodes).toHaveLength(5);
    api.close();
    expect(() => analyzer.analyze(["a"])).toThrow("closed");
  });

  it("rejects missing, duplicate and malformed roots", () => {
    const snapshot = graph().getGraph();
    expect(() => analyzeKnowledgeImpact(snapshot, [])).toThrow("1 to 1000");
    expect(() => analyzeKnowledgeImpact(snapshot, ["missing"])).toThrow("not found");
    expect(() => analyzeKnowledgeImpact(snapshot, ["a", "a"])).toThrow("Duplicate");
    expect(() => analyzeKnowledgeImpact(snapshot, [" a "])).toThrow("Invalid");
  });

  it("rejects unbounded and invalid configuration", () => {
    const snapshot = graph().getGraph();
    expect(() => analyzeKnowledgeImpact(snapshot, ["a"], { maxDepth: Infinity })).toThrow("maxDepth");
    expect(() => analyzeKnowledgeImpact(snapshot, ["a"], { maxAffectedNodes: 10001 })).toThrow("maxAffectedNodes");
    expect(() => analyzeKnowledgeImpact(snapshot, ["a"], { direction: "sideways" })).toThrow("direction");
    expect(() => analyzeKnowledgeImpact(snapshot, ["a"], null)).toThrow("plain object");
  });

  it("rejects an invalid API adapter", () => {
    expect(() => createKnowledgeImpactAnalyzer({})).toThrow("getGraph");
  });
});
