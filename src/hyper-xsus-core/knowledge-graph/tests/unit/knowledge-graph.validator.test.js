import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_GRAPH_VALIDATOR_VERSION,
  validateKnowledgeGraph,
  isValidKnowledgeGraph,
  getKnowledgeGraphValidationErrors
} from "../../validators/knowledge-graph.validator.js";

function createValidGraph(overrides = {}) {
  return {
    id: "graph-001",
    version: "1.0.0",
    nodes: [
      {
        id: "node-a",
        type: "concept",
        label: "Concept A",
        metadata: {}
      },
      {
        id: "node-b",
        type: "entity",
        label: "Entity B",
        metadata: {}
      }
    ],
    links: [
      {
        id: "link-001",
        sourceId: "node-a",
        targetId: "node-b",
        relationType: "supports",
        confidence: 0.95,
        createdAt: "2026-11-03T10:00:00.000Z",
        metadata: {}
      }
    ],
    metadata: {},
    createdAt: "2026-11-03T10:00:00.000Z",
    ...overrides
  };
}

describe("Knowledge Graph Validator", () => {
  it("ka version e saktë", () => {
    expect(KNOWLEDGE_GRAPH_VALIDATOR_VERSION).toBe("1.0.0");
  });

  it("pranon një Knowledge Graph të vlefshëm", () => {
    expect(validateKnowledgeGraph(createValidGraph())).toEqual({
      valid: true,
      errors: []
    });
  });

  it("identifikon Graph të pavlefshëm", () => {
    expect(isValidKnowledgeGraph(null)).toBe(false);
  });

  it("refuzon vlera që nuk janë plain objects", () => {
    expect(isValidKnowledgeGraph(null)).toBe(false);
    expect(isValidKnowledgeGraph([])).toBe(false);
    expect(isValidKnowledgeGraph(new Date())).toBe(false);
  });

  it("refuzon fusha shtesë në Graph", () => {
    const graph = createValidGraph();
    graph.extra = true;

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon fusha të detyrueshme që mungojnë", () => {
    const graph = createValidGraph();
    delete graph.id;

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon version të pambështetur", () => {
    const graph = createValidGraph({
      version: "2.0.0"
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon nodes që nuk janë array", () => {
    const graph = createValidGraph({
      nodes: {}
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon links që nuk janë array", () => {
    const graph = createValidGraph({
      links: {}
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon node pa ID", () => {
    const graph = createValidGraph();

    graph.nodes[0] = {
      type: "concept"
    };

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon tipe të pavlefshme të nodes", () => {
    const graph = createValidGraph();

    graph.nodes[0].type = "unknown";

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon fusha shtesë në node", () => {
    const graph = createValidGraph();

    graph.nodes[0].extra = true;

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon ID të dyfishta të nodes", () => {
    const graph = createValidGraph();

    graph.nodes[1].id = "node-a";

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon ID të dyfishta të links", () => {
    const graph = createValidGraph();

    graph.links.push({
      ...graph.links[0],
      sourceId: "node-b",
      targetId: "node-a"
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon links që referojnë nodes që mungojnë", () => {
    const graph = createValidGraph();

    graph.links[0].targetId = "missing-node";

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon self-links", () => {
    const graph = createValidGraph();

    graph.links[0].targetId = "node-a";

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("lejon cikle normale në Graph", () => {
    const graph = createValidGraph();

    graph.links.push({
      id: "link-002",
      sourceId: "node-b",
      targetId: "node-a",
      relationType: "related_to",
      confidence: 0.8,
      createdAt: "2026-11-03T10:00:00.000Z",
      metadata: {}
    });

    expect(isValidKnowledgeGraph(graph)).toBe(true);
  });

  it("refuzon relationType të panjohur", () => {
    const graph = createValidGraph();

    graph.links[0].relationType = "unknown";

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon confidence jashtë intervalit", () => {
    for (const confidence of [-0.1, 1.1, Infinity, NaN]) {
      const graph = createValidGraph();

      graph.links[0].confidence = confidence;

      expect(isValidKnowledgeGraph(graph)).toBe(false);
    }
  });

  it("refuzon datë të pavlefshme", () => {
    const graph = createValidGraph();

    graph.createdAt = "invalid-date";

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon datë pa timezone", () => {
    const graph = createValidGraph();

    graph.createdAt = "2026-11-03T10:00:00";

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon metadata që nuk është plain object", () => {
    const graph = createValidGraph({
      metadata: []
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("pranon metadata JSON-compatible", () => {
    const graph = createValidGraph({
      metadata: {
        source: "XSUS",
        active: true,
        score: 10,
        tags: ["ai", "knowledge"],
        settings: {
          language: "en"
        }
      }
    });

    expect(isValidKnowledgeGraph(graph)).toBe(true);
  });

  it("refuzon metadata me funksione", () => {
    const graph = createValidGraph({
      metadata: {
        execute: () => true
      }
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon metadata me undefined", () => {
    const graph = createValidGraph({
      metadata: {
        value: undefined
      }
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon metadata me Infinity", () => {
    const graph = createValidGraph({
      metadata: {
        value: Infinity
      }
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon metadata me Date", () => {
    const graph = createValidGraph({
      metadata: {
        created: new Date()
      }
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("refuzon metadata me referencë ciklike", () => {
    const metadata = {};
    metadata.self = metadata;

    const graph = createValidGraph({
      metadata
    });

    expect(isValidKnowledgeGraph(graph)).toBe(false);
  });

  it("kthen gabimet e validimit", () => {
    const graph = createValidGraph();
    graph.version = "invalid";

    const errors = getKnowledgeGraphValidationErrors(graph);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.includes("version"))).toBe(true);
  });

  it("kthen rezultat të strukturuar për Graph null", () => {
    expect(validateKnowledgeGraph(null)).toEqual({
      valid: false,
      errors: [
        "Knowledge Graph must be a plain object."
      ]
    });
  });
});
