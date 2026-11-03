
import { describe, it, expect } from "vitest";

import {
  KNOWLEDGE_GRAPH_MODEL_VERSION,
  createKnowledgeGraph,
  isKnowledgeGraphModel,
  cloneKnowledgeGraph,
  getKnowledgeGraphModelVersion
} from "../../models/knowledge-graph.model.js";

function createValidGraph(overrides = {}) {
  return {
    id: " graph-001 ",
    version: "1.0.0",
    nodes: [
      {
        id: " node-a ",
        type: "concept",
        label: " Concept A ",
        metadata: {
          category: "AI"
        }
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
        id: " link-001 ",
        sourceId: " node-a ",
        targetId: " node-b ",
        relationType: " supports ",
        confidence: 0.95,
        createdAt: "2026-11-03T10:00:00.000Z",
        metadata: {}
      }
    ],
    metadata: {
      source: "XSUS"
    },
    createdAt: "2026-11-03T10:00:00.000Z",
    ...overrides
  };
}

describe("Knowledge Graph Model", () => {
  it("ka version 1.0.0", () => {
    expect(KNOWLEDGE_GRAPH_MODEL_VERSION).toBe("1.0.0");
    expect(getKnowledgeGraphModelVersion()).toBe("1.0.0");
  });

  it("krijon një Knowledge Graph të vlefshëm", () => {
    const graph = createKnowledgeGraph(createValidGraph());

    expect(graph.id).toBe("graph-001");
    expect(graph.version).toBe("1.0.0");
    expect(graph.nodes).toHaveLength(2);
    expect(graph.links).toHaveLength(1);
  });

  it("normalizon ID-të dhe tekstet me trim", () => {
    const graph = createKnowledgeGraph(createValidGraph());

    expect(graph.id).toBe("graph-001");
    expect(graph.nodes[0].id).toBe("node-a");
    expect(graph.nodes[0].label).toBe("Concept A");
    expect(graph.links[0].id).toBe("link-001");
    expect(graph.links[0].sourceId).toBe("node-a");
    expect(graph.links[0].targetId).toBe("node-b");
    expect(graph.links[0].relationType).toBe("supports");
  });

  it("vendos versionin default kur mungon", () => {
    const input = createValidGraph();
    delete input.version;

    const graph = createKnowledgeGraph(input);

    expect(graph.version).toBe("1.0.0");
  });

  it("refuzon input që nuk është plain object", () => {
    expect(() => createKnowledgeGraph(null)).toThrow(TypeError);
    expect(() => createKnowledgeGraph([])).toThrow(TypeError);
    expect(() => createKnowledgeGraph(new Date())).toThrow(TypeError);
  });

  it("refuzon Graph me ID që mungon", () => {
    const input = createValidGraph();
    delete input.id;

    expect(() => createKnowledgeGraph(input)).toThrow(TypeError);
  });

  it("refuzon Graph me node të pavlefshëm", () => {
    const input = createValidGraph({
      nodes: [{ id: "" }]
    });

    expect(() => createKnowledgeGraph(input)).toThrow(TypeError);
  });

  it("refuzon Graph me link që referon node që mungon", () => {
    const input = createValidGraph();
    input.links[0].targetId = "missing-node";

    expect(() => createKnowledgeGraph(input)).toThrow(TypeError);
  });

  it("nuk ndryshon input-in origjinal", () => {
    const input = createValidGraph();
    const originalId = input.id;
    const originalNodeId = input.nodes[0].id;

    createKnowledgeGraph(input);

    expect(input.id).toBe(originalId);
    expect(input.nodes[0].id).toBe(originalNodeId);
  });

  it("krijon kopje të pavarura të nodes dhe metadata", () => {
    const input = createValidGraph();
    const graph = createKnowledgeGraph(input);

    expect(graph.nodes).not.toBe(input.nodes);
    expect(graph.nodes[0]).not.toBe(input.nodes[0]);
    expect(graph.metadata).not.toBe(input.metadata);
    expect(graph.nodes[0].metadata).not.toBe(
      input.nodes[0].metadata
    );
  });

  it("ngrin Graph-in në të gjitha nivelet", () => {
    const graph = createKnowledgeGraph(createValidGraph());

    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.nodes)).toBe(true);
    expect(Object.isFrozen(graph.nodes[0])).toBe(true);
    expect(Object.isFrozen(graph.nodes[0].metadata)).toBe(true);
    expect(Object.isFrozen(graph.links)).toBe(true);
    expect(Object.isFrozen(graph.links[0])).toBe(true);
    expect(Object.isFrozen(graph.metadata)).toBe(true);
  });

  it("nuk lejon ndryshimin e Graph-it të ngrirë", () => {
    const graph = createKnowledgeGraph(createValidGraph());

    expect(() => {
      graph.nodes[0].id = "changed";
    }).toThrow(TypeError);
  });

  it("identifikon një Model të vlefshëm", () => {
    const graph = createKnowledgeGraph(createValidGraph());

    expect(isKnowledgeGraphModel(graph)).toBe(true);
  });

  it("refuzon një Model të pavlefshëm", () => {
    expect(isKnowledgeGraphModel(null)).toBe(false);
    expect(isKnowledgeGraphModel([])).toBe(false);
    expect(isKnowledgeGraphModel({ id: "invalid" })).toBe(false);
  });

  it("krijon kopje të re përmes cloneKnowledgeGraph", () => {
    const original = createKnowledgeGraph(createValidGraph());
    const clone = cloneKnowledgeGraph(original);

    expect(clone).not.toBe(original);
    expect(clone.nodes).not.toBe(original.nodes);
    expect(clone.links).not.toBe(original.links);
    expect(clone).toEqual(original);
  });

  it("ruan pandryshueshmërinë e kopjes", () => {
    const original = createKnowledgeGraph(createValidGraph());
    const clone = cloneKnowledgeGraph(original);

    expect(Object.isFrozen(clone)).toBe(true);
    expect(Object.isFrozen(clone.nodes[0])).toBe(true);
    expect(Object.isFrozen(clone.metadata)).toBe(true);
  });

  it("refuzon kopjimin e Graph-it të pavlefshëm", () => {
    expect(() => cloneKnowledgeGraph(null)).toThrow(TypeError);
    expect(() => cloneKnowledgeGraph({ id: "invalid" })).toThrow(TypeError);
  });

  it("lejon cikle normale në Graph", () => {
    const input = createValidGraph();

    input.links.push({
      id: "link-002",
      sourceId: "node-b",
      targetId: "node-a",
      relationType: "related_to",
      confidence: 0.8,
      createdAt: "2026-11-03T10:00:00.000Z",
      metadata: {}
    });

    const graph = createKnowledgeGraph(input);

    expect(graph.links).toHaveLength(2);
  });

  it("refuzon self-links", () => {
    const input = createValidGraph();
    input.links[0].targetId = "node-a";

    expect(() => createKnowledgeGraph(input)).toThrow(TypeError);
  });
});
