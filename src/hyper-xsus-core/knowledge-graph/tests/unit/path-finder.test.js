
import { describe, it, expect } from "vitest";

import {
  PATH_FINDER_VERSION,
  findShortestPath,
  findAllPaths,
  hasPath,
  getPathFinderVersion
} from "../../algorithms/path-finder.js";

const graph = {
  nodes: [
    { id: "A" },
    { id: "B" },
    { id: "C" },
    { id: "D" },
    { id: "E" },
    { id: "F" }
  ],
  links: [
    { id: "L1", sourceId: "A", targetId: "B" },
    { id: "L2", sourceId: "A", targetId: "C" },
    { id: "L3", sourceId: "B", targetId: "D" },
    { id: "L4", sourceId: "C", targetId: "D" },
    { id: "L5", sourceId: "D", targetId: "E" }
  ]
};

describe("Knowledge Graph Path Finder", () => {
  it("exposes version 1.0.0", () => {
    expect(PATH_FINDER_VERSION).toBe("1.0.0");
    expect(getPathFinderVersion()).toBe("1.0.0");
  });

  it("finds the shortest path", () => {
    expect(
      findShortestPath(graph, "A", "E")
    ).toEqual(["A", "B", "D", "E"]);
  });

  it("returns null when no path exists", () => {
    expect(
      findShortestPath(graph, "E", "A")
    ).toBeNull();
  });

  it("finds all simple paths", () => {
    expect(
      findAllPaths(graph, "A", "D")
    ).toEqual([
      ["A", "B", "D"],
      ["A", "C", "D"]
    ]);
  });

  it("supports outgoing direction", () => {
    expect(
      findShortestPath(graph, "A", "E", {
        direction: "outgoing"
      })
    ).toEqual(["A", "B", "D", "E"]);
  });

  it("supports incoming direction", () => {
    expect(
      findShortestPath(graph, "E", "A", {
        direction: "incoming"
      })
    ).toEqual(["E", "D", "B", "A"]);
  });

  it("supports both directions", () => {
    expect(
      findShortestPath(graph, "E", "A", {
        direction: "both"
      })
    ).toEqual(["E", "D", "B", "A"]);
  });

  it("respects maxDepth", () => {
    expect(
      findShortestPath(graph, "A", "E", {
        maxDepth: 2
      })
    ).toBeNull();

    expect(
      findShortestPath(graph, "A", "E", {
        maxDepth: 3
      })
    ).toEqual(["A", "B", "D", "E"]);
  });

  it("limits the number of returned paths", () => {
    expect(
      findAllPaths(graph, "A", "D", {
        maxPaths: 1
      })
    ).toEqual([["A", "B", "D"]]);
  });

  it("detects existing paths", () => {
    expect(hasPath(graph, "A", "E")).toBe(true);
  });

  it("detects missing paths", () => {
    expect(hasPath(graph, "E", "A")).toBe(false);
  });

  it("returns a single-node path when start equals target", () => {
    expect(
      findShortestPath(graph, "A", "A")
    ).toEqual(["A"]);

    expect(
      findAllPaths(graph, "A", "A")
    ).toEqual([["A"]]);
  });

  it("returns null or empty results for unknown nodes", () => {
    expect(
      findShortestPath(graph, "X", "A")
    ).toBeNull();

    expect(
      findAllPaths(graph, "A", "X")
    ).toEqual([]);
  });

  it("does not repeat nodes inside a path when cycles exist", () => {
    const cyclicGraph = {
      nodes: [
        { id: "A" },
        { id: "B" },
        { id: "C" }
      ],
      links: [
        { sourceId: "A", targetId: "B" },
        { sourceId: "B", targetId: "C" },
        { sourceId: "C", targetId: "A" }
      ]
    };

    expect(
      findAllPaths(cyclicGraph, "A", "C")
    ).toEqual([["A", "B", "C"]]);
  });

  it("rejects invalid graphs", () => {
    expect(() =>
      findShortestPath(null, "A", "B")
    ).toThrow(TypeError);

    expect(() =>
      findAllPaths({ nodes: [], links: "invalid" }, "A", "B")
    ).toThrow(TypeError);
  });

  it("rejects duplicate node IDs", () => {
    const invalidGraph = {
      nodes: [{ id: "A" }, { id: "A" }],
      links: []
    };

    expect(() =>
      findShortestPath(invalidGraph, "A", "A")
    ).toThrow("Duplicate graph node ID.");
  });

  it("rejects links referencing missing nodes", () => {
    const invalidGraph = {
      nodes: [{ id: "A" }],
      links: [
        { sourceId: "A", targetId: "B" }
      ]
    };

    expect(() =>
      findShortestPath(invalidGraph, "A", "A")
    ).toThrow("Invalid graph link reference.");
  });

  it("rejects invalid traversal options", () => {
    expect(() =>
      findShortestPath(graph, "A", "E", {
        direction: "unknown"
      })
    ).toThrow("Invalid traversal direction.");

    expect(() =>
      findShortestPath(graph, "A", "E", {
        maxDepth: -1
      })
    ).toThrow("maxDepth must be a non-negative integer.");

    expect(() =>
      findAllPaths(graph, "A", "E", {
        maxPaths: 0
      })
    ).toThrow("maxPaths must be a positive integer.");
  });

  it("does not mutate the original graph", () => {
    const original = structuredClone(graph);

    findShortestPath(graph, "A", "E");
    findAllPaths(graph, "A", "E");

    expect(graph).toEqual(original);
  });
});
