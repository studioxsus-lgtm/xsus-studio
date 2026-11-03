
import { describe, it, expect } from "vitest";

import {
  CONNECTED_COMPONENTS_VERSION,
  findConnectedComponents,
  countConnectedComponents,
  isConnectedGraph,
  getConnectedComponentsVersion
} from "../../algorithms/connected-components.js";

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
    { id: "L2", sourceId: "B", targetId: "C" },
    { id: "L3", sourceId: "D", targetId: "E" }
  ]
};

describe("Knowledge Graph Connected Components", () => {
  it("exposes version 1.0.0", () => {
    expect(CONNECTED_COMPONENTS_VERSION).toBe("1.0.0");
    expect(getConnectedComponentsVersion()).toBe("1.0.0");
  });

  it("finds connected components using both directions", () => {
    expect(
      findConnectedComponents(graph)
    ).toEqual([
      ["A", "B", "C"],
      ["D", "E"],
      ["F"]
    ]);
  });

  it("counts connected components", () => {
    expect(
      countConnectedComponents(graph)
    ).toBe(3);
  });

  it("detects a connected graph", () => {
    const connectedGraph = {
      nodes: [
        { id: "A" },
        { id: "B" },
        { id: "C" }
      ],
      links: [
        { sourceId: "A", targetId: "B" },
        { sourceId: "B", targetId: "C" }
      ]
    };

    expect(isConnectedGraph(connectedGraph)).toBe(true);
  });

  it("detects a disconnected graph", () => {
    expect(isConnectedGraph(graph)).toBe(false);
  });

  it("treats an empty graph as connected", () => {
    expect(
      isConnectedGraph({ nodes: [], links: [] })
    ).toBe(true);
  });

  it("treats an isolated node as its own component", () => {
    const isolatedGraph = {
      nodes: [{ id: "A" }],
      links: []
    };

    expect(
      findConnectedComponents(isolatedGraph)
    ).toEqual([["A"]]);
  });

  it("supports outgoing direction", () => {
    expect(
      findConnectedComponents(graph, {
        direction: "outgoing"
      })
    ).toEqual([
      ["A", "B", "C"],
      ["D", "E"],
      ["F"]
    ]);
  });

  it("supports incoming direction", () => {
    expect(
      findConnectedComponents(graph, {
        direction: "incoming"
      })
    ).toEqual([
      ["A"],
      ["B", "A"],
      ["C", "B", "A"],
      ["D"],
      ["E", "D"],
      ["F"]
    ]);
  });

  it("supports both directions", () => {
    expect(
      findConnectedComponents(graph, {
        direction: "both"
      })
    ).toEqual([
      ["A", "B", "C"],
      ["D", "E"],
      ["F"]
    ]);
  });

  it("handles cycles without infinite traversal", () => {
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
      findConnectedComponents(cyclicGraph)
    ).toEqual([["A", "B", "C"]]);
  });

  it("rejects invalid graphs", () => {
    expect(() =>
      findConnectedComponents(null)
    ).toThrow("Invalid knowledge graph.");

    expect(() =>
      findConnectedComponents({
        nodes: [],
        links: "invalid"
      })
    ).toThrow("Invalid knowledge graph.");
  });

  it("rejects duplicate node IDs", () => {
    const invalidGraph = {
      nodes: [
        { id: "A" },
        { id: "A" }
      ],
      links: []
    };

    expect(() =>
      findConnectedComponents(invalidGraph)
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
      findConnectedComponents(invalidGraph)
    ).toThrow("Invalid graph link reference.");
  });

  it("rejects invalid directions", () => {
    expect(() =>
      findConnectedComponents(graph, {
        direction: "invalid"
      })
    ).toThrow("Invalid traversal direction.");
  });

  it("rejects invalid options", () => {
    expect(() =>
      findConnectedComponents(graph, null)
    ).toThrow("Invalid connected components options.");

    expect(() =>
      findConnectedComponents(graph, [])
    ).toThrow("Invalid connected components options.");
  });

  it("does not mutate the original graph", () => {
    const original = structuredClone(graph);

    findConnectedComponents(graph);
    countConnectedComponents(graph);
    isConnectedGraph(graph);

    expect(graph).toEqual(original);
  });
});
