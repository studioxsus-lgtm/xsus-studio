
import {
  describe,
  it,
  expect,
} from "vitest";

import {
  isKnowledgeGraphInterface,
  isKnowledgeGraphNodeInterface,
  KNOWLEDGE_GRAPH_INTERFACE_VERSION,
} from "../../interfaces/knowledge-graph.interface.js";

describe("Knowledge Graph Interface", () => {
  const validGraph = {
    id: "graph-001",
    version: "1.0.0",
    nodes: [],
    links: [],
    metadata: {},
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("exposes the correct version", () => {
    expect(KNOWLEDGE_GRAPH_INTERFACE_VERSION).toBe(
      "1.0.0",
    );
  });

  it("accepts a valid graph structure", () => {
    expect(isKnowledgeGraphInterface(validGraph)).toBe(
      true,
    );
  });

  it("rejects null", () => {
    expect(isKnowledgeGraphInterface(null)).toBe(false);
  });

  it("rejects arrays", () => {
    expect(isKnowledgeGraphInterface([])).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      isKnowledgeGraphInterface({
        id: "graph-001",
      }),
    ).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(
      isKnowledgeGraphInterface({
        ...validGraph,
        unknown: true,
      }),
    ).toBe(false);
  });

  it("rejects class instances", () => {
    class Graph {}

    expect(
      isKnowledgeGraphInterface(new Graph()),
    ).toBe(false);
  });

  it("accepts a valid node structure", () => {
    expect(
      isKnowledgeGraphNodeInterface({
        id: "node-001",
        type: "concept",
        label: "Artificial Intelligence",
        metadata: {},
      }),
    ).toBe(true);
  });

  it("accepts a node with only its required id", () => {
    expect(
      isKnowledgeGraphNodeInterface({
        id: "node-001",
      }),
    ).toBe(true);
  });

  it("rejects a node without id", () => {
    expect(
      isKnowledgeGraphNodeInterface({
        type: "concept",
      }),
    ).toBe(false);
  });

  it("rejects unknown node fields", () => {
    expect(
      isKnowledgeGraphNodeInterface({
        id: "node-001",
        unknown: true,
      }),
    ).toBe(false);
  });

  it("rejects arrays as nodes", () => {
    expect(
      isKnowledgeGraphNodeInterface([]),
    ).toBe(false);
  });
});
