
import { describe, it, expect } from "vitest";

import {
  createKnowledgeGraphAPI,
  KNOWLEDGE_GRAPH_API_VERSION,
  getKnowledgeGraphAPIVersion
} from "../../public/knowledge-graph.api.js";

function createAPI() {
  return createKnowledgeGraphAPI({
    id: "api-test-graph",
    metadata: {
      source: "api-unit-test"
    }
  });
}

function seedAPI(api) {
  api.addNodes([
    { id: "A", type: "concept", label: "Alpha" },
    { id: "B", type: "concept", label: "Beta" },
    { id: "C", type: "entity", label: "Gamma" },
    { id: "D", type: "topic", label: "Delta" }
  ]);

  api.addLinks([
    {
      id: "L1",
      sourceId: "A",
      targetId: "B",
      relationType: "supports"
    },
    {
      id: "L2",
      sourceId: "B",
      targetId: "C",
      relationType: "related_to"
    },
    {
      id: "L3",
      sourceId: "C",
      targetId: "A",
      relationType: "depends_on"
    }
  ]);
}

describe("Knowledge Graph Public API", () => {
  it("ka version të saktë", () => {
    expect(KNOWLEDGE_GRAPH_API_VERSION).toBe("1.0.0");
    expect(getKnowledgeGraphAPIVersion()).toBe("1.0.0");
  });

  it("krijon API me graph bosh", () => {
    const api = createAPI();

    expect(api.version).toBe("1.0.0");
    expect(api.getGraph().nodes).toEqual([]);
    expect(api.getGraph().links).toEqual([]);

    api.close();
  });

  it("refuzon options jo plain object", () => {
    expect(() => createKnowledgeGraphAPI(null))
      .toThrow(TypeError);

    expect(() => createKnowledgeGraphAPI([]))
      .toThrow(TypeError);
  });

  it("ekspozon metodën getGraph", () => {
    const api = createAPI();

    seedAPI(api);

    const graph = api.getGraph();

    expect(graph.id).toBe("api-test-graph");
    expect(graph.nodes).toHaveLength(4);
    expect(graph.links).toHaveLength(3);

    api.close();
  });

  it("mbështet addNode dhe addNodes", () => {
    const api = createAPI();

    api.addNode({
      id: "A",
      label: "Alpha"
    });

    api.addNodes([
      { id: "B" },
      { id: "C" }
    ]);

    expect(api.getNode("A").label).toBe("Alpha");
    expect(api.findNodes()).toHaveLength(3);

    api.close();
  });

  it("mbështet updateNode", () => {
    const api = createAPI();

    api.addNode({
      id: "A",
      label: "Old"
    });

    const updated = api.updateNode("A", {
      label: "New"
    });

    expect(updated.label).toBe("New");

    api.close();
  });

  it("mbështet getNode dhe removeNode", () => {
    const api = createAPI();

    api.addNode({ id: "A" });

    expect(api.getNode("A").id).toBe("A");
    expect(api.removeNode("A")).toBe(true);
    expect(api.getNode("A")).toBe(null);
    expect(api.removeNode("A")).toBe(false);

    api.close();
  });

  it("mbështet addLink dhe addLinks", () => {
    const api = createAPI();

    api.addNodes([
      { id: "A" },
      { id: "B" },
      { id: "C" }
    ]);

    api.addLink({
      id: "L1",
      sourceId: "A",
      targetId: "B",
      relationType: "supports"
    });

    api.addLinks([
      {
        id: "L2",
        sourceId: "B",
        targetId: "C",
        relationType: "contains"
      }
    ]);

    expect(api.getGraph().links).toHaveLength(2);

    api.close();
  });

  it("mbështet getLink dhe removeLink", () => {
    const api = createAPI();

    api.addNodes([
      { id: "A" },
      { id: "B" }
    ]);

    api.addLink({
      id: "L1",
      sourceId: "A",
      targetId: "B",
      relationType: "supports"
    });

    expect(api.getLink("L1").id).toBe("L1");
    expect(api.removeLink("L1")).toBe(true);
    expect(api.getLink("L1")).toBe(null);
    expect(api.removeLink("L1")).toBe(false);

    api.close();
  });

  it("mbështet updateMetadata", () => {
    const api = createAPI();

    const metadata = {
      updated: true,
      source: "test"
    };

    expect(api.updateMetadata(metadata)).toEqual(metadata);
    expect(api.getGraph().metadata).toEqual(metadata);

    api.close();
  });

  it("mbështet findNodes dhe findLinks", () => {
    const api = createAPI();

    seedAPI(api);

    expect(api.findNodes({ type: "concept" }))
      .toHaveLength(2);

    expect(api.findLinks({ relationType: "supports" }))
      .toHaveLength(1);

    api.close();
  });

  it("refuzon filters jo plain object", () => {
    const api = createAPI();

    expect(() => api.findNodes(null))
      .toThrow(TypeError);

    expect(() => api.findLinks([]))
      .toThrow(TypeError);

    api.close();
  });

  it("mbështet BFS dhe DFS", () => {
    const api = createAPI();

    seedAPI(api);

    expect(api.traverse("A").map((item) => item.nodeId))
      .toEqual(["A", "B", "C"]);

    expect(
      api.traverseDepthFirst("A").map((item) => item.nodeId)
    ).toEqual(["A", "B", "C"]);

    expect(api.getReachable("A"))
      .toEqual(["A", "B", "C"]);

    api.close();
  });

  it("mbështet cycle detection", () => {
    const api = createAPI();

    seedAPI(api);

    expect(api.hasCycles()).toBe(true);
    expect(api.isAcyclicGraph()).toBe(false);
    expect(api.detectCycles().length).toBeGreaterThan(0);
    expect(api.getCycleNodes().length).toBeGreaterThan(0);

    api.close();
  });

  it("mbështet cycle report", () => {
    const api = createAPI();

    seedAPI(api);

    const report = api.getCycleReport();

    expect(report).toBeTruthy();
    expect(typeof report).toBe("object");

    api.close();
  });

  it("mbështet path finding", () => {
    const api = createAPI();

    seedAPI(api);

    expect(api.hasPath("A", "C")).toBe(true);
    expect(api.findShortestPath("A", "C")).toBeTruthy();
    expect(api.findAllPaths("A", "C").length)
      .toBeGreaterThan(0);

    api.close();
  });

  it("mbështet connected components", () => {
    const api = createAPI();

    seedAPI(api);

    expect(
      api.findConnectedComponents({ direction: "both" })
    ).toHaveLength(2);

    expect(
      api.countConnectedComponents({ direction: "both" })
    ).toBe(2);

    expect(
      api.isConnectedGraph({ direction: "both" })
    ).toBe(false);

    api.close();
  });

  it("mbështet getStatus", () => {
    const api = createAPI();

    seedAPI(api);

    const status = api.getStatus();

    expect(status.graphId).toBe("api-test-graph");
    expect(status.nodeCount).toBe(4);
    expect(status.linkCount).toBe(3);

    api.close();
  });

  it("mbështet verifyIntegrity dhe rebuildIntegrity", () => {
    const api = createAPI();

    seedAPI(api);

    expect(api.verifyIntegrity().valid).toBe(true);
    expect(api.rebuildIntegrity().valid).toBe(true);

    api.close();
  });

  it("mbështet clear", () => {
    const api = createAPI();

    seedAPI(api);

    expect(api.clear()).toBe(true);
    expect(api.getGraph().nodes).toEqual([]);
    expect(api.getGraph().links).toEqual([]);

    api.close();
  });

  it("validon ID-të publike", () => {
    const api = createAPI();

    expect(() => api.getNode(""))
      .toThrow(TypeError);

    expect(() => api.getLink(" "))
      .toThrow(TypeError);

    expect(() => api.removeNode(""))
      .toThrow(TypeError);

    expect(() => api.removeLink(""))
      .toThrow(TypeError);

    expect(() => api.updateNode("", {}))
      .toThrow(TypeError);

    api.close();
  });

  it("mbyll API dhe refuzon operacionet pas mbylljes", () => {
    const api = createAPI();

    api.close();
    api.close();

    expect(() => api.getGraph())
      .toThrow("Knowledge Graph API is closed.");

    expect(() => api.addNode({ id: "A" }))
      .toThrow("Knowledge Graph API is closed.");

    expect(() => api.verifyIntegrity())
      .toThrow("Knowledge Graph API is closed.");
  });
});
