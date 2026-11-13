import { describe, it, expect } from "vitest";
import { createKnowledgeLinkAPI } from "../../../knowledge-linking/index.js";
import { createKnowledgeGraphAPI } from "../../index.js";

describe("KnowledgeLink ↔ KnowledgeGraph — consistency boundaries", () => {
  function setup() {
    const links = createKnowledgeLinkAPI();
    const graph = createKnowledgeGraphAPI({ id: "consistency-boundary" });
    graph.addNode({ id: "A" });
    graph.addNode({ id: "B" });
    graph.addNode({ id: "C" });
    return { links, graph };
  }

  function link(id, sourceId, targetId) {
    return { id, sourceId, targetId, relationType: "supports", confidence: 0.9 };
  }

  it("requires explicit propagation and preserves independent ownership", () => {
    const { links, graph } = setup();
    try {
      links.add(link("AB", "A", "B"));
      expect(graph.getGraph().links).toHaveLength(0);
      graph.addLink(links.getById("AB"));
      expect(graph.getGraph().links).toHaveLength(1);
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });

  it("does not silently propagate deletion between independent APIs", () => {
    const { links, graph } = setup();
    try {
      links.add(link("AB", "A", "B"));
      graph.addLink(links.getById("AB"));
      links.remove("AB");
      expect(links.getById("AB")).toBeNull();
      expect(graph.getLink("AB")).toBeTruthy();
      graph.removeLink("AB");
      expect(graph.getGraph().links).toHaveLength(0);
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });

  it("preserves independent graph integrity after index rebuild", () => {
    const { links, graph } = setup();
    try {
      links.add(link("AB", "A", "B"));
      links.add(link("BC", "B", "C"));
      for (const item of links.find().links) graph.addLink(item);
      links.rebuildIndexes();
      expect(links.find().count).toBe(2);
      expect(graph.getGraph().links).toHaveLength(2);
      expect(graph.verifyIntegrity().valid).toBe(true);
    } finally {
      graph.close();
      links.close();
    }
  });
});
