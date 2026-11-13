import { describe, it, expect } from "vitest";
import { createKnowledgeLinkAPI } from "../../../knowledge-linking/index.js";
import { createKnowledgeGraphAPI } from "../../index.js";

const makeLink = (id, sourceId, targetId) => ({
  id, sourceId, targetId, relationType: "supports", confidence: 0.9,
});

function createPair() {
  const links = createKnowledgeLinkAPI();
  const graph = createKnowledgeGraphAPI({ id: "recovery-boundary" });
  graph.addNodes([{ id: "A" }, { id: "B" }, { id: "C" }]);
  return { links, graph };
}

describe("KnowledgeLink ↔ KnowledgeGraph — recovery boundaries", () => {
  it("can retry explicit propagation after a missing-node failure", () => {
    const { links, graph } = createPair();
    try {
      links.add(makeLink("AX", "A", "X"));
      expect(() => graph.addLink(links.getById("AX"))).toThrow();
      expect(graph.getGraph().links).toHaveLength(0);
      expect(links.getById("AX")).toBeTruthy();
      graph.addNode({ id: "X" });
      graph.addLink(links.getById("AX"));
      expect(graph.getLink("AX")).toBeTruthy();
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });

  it("retains graph data when KnowledgeLink indexes are rebuilt", () => {
    const { links, graph } = createPair();
    try {
      links.add(makeLink("AB", "A", "B"));
      graph.addLink(links.getById("AB"));
      links.rebuildIndexes();
      expect(links.getById("AB")).toBeTruthy();
      expect(graph.getLink("AB")).toBeTruthy();
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });

  it("requires explicit reconciliation after independent deletion", () => {
    const { links, graph } = createPair();
    try {
      links.add(makeLink("AB", "A", "B"));
      graph.addLink(links.getById("AB"));
      graph.removeLink("AB");
      expect(links.getById("AB")).toBeTruthy();
      expect(graph.getLink("AB")).toBeNull();
      graph.addLink(links.getById("AB"));
      expect(graph.getGraph().links).toHaveLength(1);
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });
});
