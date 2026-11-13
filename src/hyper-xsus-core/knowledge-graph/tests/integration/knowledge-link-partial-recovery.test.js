import { describe, it, expect } from "vitest";
import { createKnowledgeLinkAPI } from "../../../knowledge-linking/index.js";
import { createKnowledgeGraphAPI } from "../../index.js";

const makeLink = (i) => ({
  id: `recovery-${i}`,
  sourceId: `node-${i}`,
  targetId: `node-${i + 1}`,
  relationType: "supports",
  confidence: 0.9,
});

// Explicit reconciliation at the integration boundary; no hidden engine coupling.
function reconcile(links, graph) {
  const existing = new Set(graph.getGraph().links.map((link) => link.id));
  const missing = links.find().links.filter((link) => !existing.has(link.id));
  if (missing.length) graph.addLinks(missing);
  return missing.length;
}

describe("Hyper XSUS Core — partial propagation recovery", () => {
  function setup() {
    const links = createKnowledgeLinkAPI();
    const graph = createKnowledgeGraphAPI({ id: "partial-propagation" });
    graph.addNodes(Array.from({ length: 11 }, (_, i) => ({ id: `node-${i}` })));
    links.addMany(Array.from({ length: 10 }, (_, i) => makeLink(i)));
    return { links, graph };
  }

  it("reconciles the remaining links after partial propagation", () => {
    const { links, graph } = setup();
    try {
      graph.addLinks(links.find().links.slice(0, 4));
      expect(graph.getStatus().linkCount).toBe(4);
      expect(reconcile(links, graph)).toBe(6);
      expect(graph.getStatus().linkCount).toBe(10);
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });

  it("is idempotent when reconciliation is repeated", () => {
    const { links, graph } = setup();
    try {
      expect(reconcile(links, graph)).toBe(10);
      expect(reconcile(links, graph)).toBe(0);
      expect(graph.getStatus().linkCount).toBe(10);
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });

  it("preserves existing graph links when a missing endpoint prevents reconciliation", () => {
    const { links, graph } = setup();
    try {
      graph.addLinks(links.find().links.slice(0, 3));
      links.add({
        id: "unknown-endpoint",
        sourceId: "node-0",
        targetId: "missing-node",
        relationType: "supports",
        confidence: 0.9,
      });
      expect(() => reconcile(links, graph)).toThrow();
      expect(graph.getStatus().linkCount).toBe(3);
      expect(graph.verifyIntegrity().valid).toBe(true);
      expect(links.getById("unknown-endpoint")).toBeTruthy();
      graph.addNode({ id: "missing-node" });
      expect(reconcile(links, graph)).toBe(8);
      expect(graph.getStatus().linkCount).toBe(11);
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });
});
