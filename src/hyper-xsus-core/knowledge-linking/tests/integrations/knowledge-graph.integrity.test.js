
import {
  describe,
  it,
  expect,
  beforeEach,
} from "vitest";

import {
  createKnowledgeLinkAPI,
} from "../../public/knowledge-link.api.js";

describe("Knowledge Graph — Integrity", () => {
  let api;

  const graphLinks = [
    {
      id: "graph-001",
      sourceId: "xsus-ai",
      targetId: "knowledge-engine",
      relationType: "implements",
      confidence: 0.99,
    },
    {
      id: "graph-002",
      sourceId: "knowledge-engine",
      targetId: "knowledge-base",
      relationType: "depends_on",
      confidence: 0.95,
    },
    {
      id: "graph-003",
      sourceId: "knowledge-base",
      targetId: "language-engine",
      relationType: "contains",
      confidence: 0.92,
    },
    {
      id: "graph-004",
      sourceId: "language-engine",
      targetId: "xsus-ai",
      relationType: "supports",
      confidence: 0.90,
    },
  ];

  beforeEach(() => {
    api = createKnowledgeLinkAPI();
    api.addMany(graphLinks);
  });

  function getAllLinks() {
    const result = api.find();

    expect(result).toBeDefined();
    expect(result.links).toBeInstanceOf(Array);

    return result.links;
  }

  function buildAdjacencyList(links) {
    const graph = new Map();

    for (const link of links) {
      if (!graph.has(link.sourceId)) {
        graph.set(link.sourceId, []);
      }

      graph.get(link.sourceId).push(link.targetId);
    }

    return graph;
  }

  function hasPath(graph, start, target) {
    const visited = new Set();
    const stack = [start];

    while (stack.length > 0) {
      const current = stack.pop();

      if (current === target) {
        return true;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      for (const neighbor of graph.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    return false;
  }

  function hasCycle(graph) {
    const visiting = new Set();
    const visited = new Set();

    function visit(node) {
      if (visiting.has(node)) {
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visiting.add(node);

      for (const neighbor of graph.get(node) ?? []) {
        if (visit(neighbor)) {
          return true;
        }
      }

      visiting.delete(node);
      visited.add(node);

      return false;
    }

    for (const node of graph.keys()) {
      if (visit(node)) {
        return true;
      }
    }

    return false;
  }

  describe("Graph construction", () => {
    it("builds a graph from real KnowledgeLinks", () => {
      const links = getAllLinks();
      const graph = buildAdjacencyList(links);

      expect(graph).toBeInstanceOf(Map);
      expect(graph.size).toBeGreaterThan(0);
    });

    it("preserves all graph connections", () => {
      const graph = buildAdjacencyList(getAllLinks());

      expect(graph.get("xsus-ai")).toContain(
        "knowledge-engine",
      );

      expect(graph.get("knowledge-engine")).toContain(
        "knowledge-base",
      );

      expect(graph.get("knowledge-base")).toContain(
        "language-engine",
      );
    });

    it("preserves the number of links", () => {
      const links = getAllLinks();

      expect(links).toHaveLength(4);
    });
  });

  describe("Indirect relationships", () => {
    it("detects an indirect path", () => {
      const graph = buildAdjacencyList(getAllLinks());

      expect(
        hasPath(
          graph,
          "xsus-ai",
          "language-engine",
        ),
      ).toBe(true);
    });

    it("detects a path through multiple entities", () => {
      const graph = buildAdjacencyList(getAllLinks());

      expect(
        hasPath(
          graph,
          "knowledge-engine",
          "xsus-ai",
        ),
      ).toBe(true);
    });

    it("rejects a nonexistent path", () => {
      const graph = buildAdjacencyList(getAllLinks());

      expect(
        hasPath(
          graph,
          "xsus-ai",
          "unknown-entity",
        ),
      ).toBe(false);
    });
  });

  describe("Cycle detection", () => {
    it("detects a cycle in the graph", () => {
      const graph = buildAdjacencyList(getAllLinks());

      expect(hasCycle(graph)).toBe(true);
    });

    it("does not detect a cycle in an acyclic graph", () => {
      const acyclicLinks = graphLinks.slice(0, 3);
      const graph = buildAdjacencyList(acyclicLinks);

      expect(hasCycle(graph)).toBe(false);
    });

    it("handles an empty graph", () => {
      const graph = buildAdjacencyList([]);

      expect(hasCycle(graph)).toBe(false);
    });
  });

  describe("Resolver consistency", () => {
    it("finds all links connected to an entity", () => {
      const result = api.findByEntity("knowledge-engine");

      expect(result.count).toBe(2);
      expect(result.links).toHaveLength(2);
    });

    it("preserves the source and target relationships", () => {
      const result = api.find({
        sourceId: "knowledge-engine",
      });

      expect(result.count).toBe(1);
      expect(result.links[0].targetId).toBe(
        "knowledge-base",
      );
    });
  });

  describe("Graph integrity after deletion", () => {
    it("removes a connection from the graph", () => {
      api.remove("graph-002");

      const links = getAllLinks();

      expect(
        links.some((link) => link.id === "graph-002"),
      ).toBe(false);
    });

    it("updates indirect paths after deletion", () => {
      api.remove("graph-002");

      const graph = buildAdjacencyList(getAllLinks());

      expect(
        hasPath(
          graph,
          "xsus-ai",
          "language-engine",
        ),
      ).toBe(false);
    });

    it("preserves unrelated connections after deletion", () => {
      api.remove("graph-002");

      const result = api.getById("graph-001");

      expect(result).toBeDefined();
      expect(result.id).toBe("graph-001");
    });

    it("maintains index integrity after deletion", () => {
      api.remove("graph-002");

      expect(() => api.verifyIntegrity()).not.toThrow();
    });
  });

  describe("Graph recovery", () => {
    it("rebuilds indexes without losing graph data", () => {
      const before = getAllLinks().length;

      api.rebuildIndexes();

      const after = getAllLinks().length;

      expect(after).toBe(before);
    });

    it("recovers index integrity without losing graph data", () => {
      const before = getAllLinks().length;

      api.recoverIntegrity();

      const after = getAllLinks().length;

      expect(after).toBe(before);
    });

    it("clears the graph completely", () => {
      api.clear();

      const result = getAllLinks();

      expect(result).toHaveLength(0);
    });
  });
});
