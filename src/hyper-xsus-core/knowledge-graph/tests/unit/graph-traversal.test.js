
import { describe, it, expect } from "vitest";

import {
  GRAPH_TRAVERSAL_VERSION,
  breadthFirstSearch,
  depthFirstSearch,
  getReachableNodeIds
} from "../../algorithms/graph-traversal.js";

function createGraph() {
  return {
    id: "graph-001",
    version: "1.0.0",
    nodes: [
      { id: "A" },
      { id: "B" },
      { id: "C" },
      { id: "D" },
      { id: "E" }
    ],
    links: [
      { sourceId: "A", targetId: "B" },
      { sourceId: "A", targetId: "C" },
      { sourceId: "B", targetId: "D" },
      { sourceId: "C", targetId: "E" }
    ]
  };
}

describe("Graph Traversal", () => {
  it("ka version 1.0.0", () => {
    expect(GRAPH_TRAVERSAL_VERSION).toBe("1.0.0");
  });

  it("kryen Graph-in me BFS sipas niveleve", () => {
    expect(breadthFirstSearch(createGraph(), "A")).toEqual([
      { nodeId: "A", depth: 0 },
      { nodeId: "B", depth: 1 },
      { nodeId: "C", depth: 1 },
      { nodeId: "D", depth: 2 },
      { nodeId: "E", depth: 2 }
    ]);
  });

  it("kryen Graph-in me DFS", () => {
    expect(depthFirstSearch(createGraph(), "A")).toEqual([
      { nodeId: "A", depth: 0 },
      { nodeId: "B", depth: 1 },
      { nodeId: "D", depth: 2 },
      { nodeId: "C", depth: 1 },
      { nodeId: "E", depth: 2 }
    ]);
  });

  it("kthen vetëm nodes të arritshme", () => {
    expect(getReachableNodeIds(createGraph(), "A")).toEqual([
      "A", "B", "C", "D", "E"
    ]);
  });

  it("mbështet drejtimin outgoing", () => {
    expect(getReachableNodeIds(createGraph(), "B", {
      direction: "outgoing"
    })).toEqual(["B", "D"]);
  });

  it("mbështet drejtimin incoming", () => {
    expect(getReachableNodeIds(createGraph(), "D", {
      direction: "incoming"
    })).toEqual(["D", "B", "A"]);
  });

  it("mbështet drejtimin both", () => {
    expect(getReachableNodeIds(createGraph(), "B", {
      direction: "both"
    })).toEqual(["B", "A", "D", "C", "E"]);
  });

  it("respekton maxDepth në BFS", () => {
    expect(breadthFirstSearch(createGraph(), "A", {
      maxDepth: 1
    })).toEqual([
      { nodeId: "A", depth: 0 },
      { nodeId: "B", depth: 1 },
      { nodeId: "C", depth: 1 }
    ]);
  });

  it("respekton maxDepth në DFS", () => {
    expect(depthFirstSearch(createGraph(), "A", {
      maxDepth: 1
    })).toEqual([
      { nodeId: "A", depth: 0 },
      { nodeId: "B", depth: 1 },
      { nodeId: "C", depth: 1 }
    ]);
  });

  it("lejon maxDepth zero", () => {
    expect(getReachableNodeIds(createGraph(), "A", {
      maxDepth: 0
    })).toEqual(["A"]);
  });

  it("trajton ciklet pa përsëritur nodes", () => {
    const graph = createGraph();

    graph.links.push(
      { sourceId: "D", targetId: "A" },
      { sourceId: "E", targetId: "B" }
    );

    const result = breadthFirstSearch(graph, "A");
    const ids = result.map((item) => item.nodeId);

    expect(ids).toEqual(["A", "B", "C", "D", "E"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("refuzon Graph të pavlefshëm", () => {
    expect(() => breadthFirstSearch(null, "A")).toThrow(TypeError);
    expect(() => depthFirstSearch({}, "A")).toThrow(TypeError);
  });

  it("refuzon startNodeId bosh", () => {
    expect(() => breadthFirstSearch(createGraph(), "")).toThrow(TypeError);
    expect(() => depthFirstSearch(createGraph(), " ")).toThrow(TypeError);
  });

  it("refuzon node fillestar që nuk ekziston", () => {
    expect(() => breadthFirstSearch(createGraph(), "X")).toThrow(
      "Node not found: X"
    );
  });

  it("refuzon drejtim të pavlefshëm", () => {
    expect(() => breadthFirstSearch(createGraph(), "A", {
      direction: "unknown"
    })).toThrow(TypeError);
  });

  it("refuzon maxDepth të pavlefshëm", () => {
    expect(() => depthFirstSearch(createGraph(), "A", {
      maxDepth: -1
    })).toThrow(TypeError);

    expect(() => breadthFirstSearch(createGraph(), "A", {
      maxDepth: 1.5
    })).toThrow(TypeError);
  });

  it("nuk ndryshon Graph-in origjinal", () => {
    const graph = createGraph();
    const original = JSON.stringify(graph);

    breadthFirstSearch(graph, "A");
    depthFirstSearch(graph, "A");

    expect(JSON.stringify(graph)).toBe(original);
  });

  it("kthen vetëm node fillestar kur nuk ka lidhje", () => {
    const graph = {
      nodes: [{ id: "A" }],
      links: []
    };

    expect(getReachableNodeIds(graph, "A")).toEqual(["A"]);
  });
});
