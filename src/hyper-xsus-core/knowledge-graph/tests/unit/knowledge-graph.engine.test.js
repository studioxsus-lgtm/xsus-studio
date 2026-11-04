
import { describe, it, expect } from "vitest";

import {
  createKnowledgeGraphEngine,
  KNOWLEDGE_GRAPH_ENGINE_VERSION,
  getKnowledgeGraphEngineVersion
} from "../../engines/knowledge-graph.engine.js";

function createEngine() {
  return createKnowledgeGraphEngine({
    id: "test-graph",
    metadata: { source: "unit-test" }
  });
}

function createNodes(engine) {
  engine.addNodes([
    { id: "A", type: "concept", label: "Alpha" },
    { id: "B", type: "concept", label: "Beta" },
    { id: "C", type: "entity", label: "Gamma" },
    { id: "D", type: "topic", label: "Delta" }
  ]);
}

function createLinks(engine) {
  engine.addLinks([
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

describe("Knowledge Graph Engine", () => {
  it("ka version të saktë", () => {
    expect(KNOWLEDGE_GRAPH_ENGINE_VERSION).toBe("1.0.0");
    expect(getKnowledgeGraphEngineVersion()).toBe("1.0.0");
  });

  it("krijon graph bosh", () => {
    const engine = createEngine();
    const status = engine.getStatus();

    expect(status.graphId).toBe("test-graph");
    expect(status.nodeCount).toBe(0);
    expect(status.linkCount).toBe(0);
    expect(engine.getGraph().nodes).toEqual([]);
    expect(engine.getGraph().links).toEqual([]);

    engine.close();
  });

  it("refuzon options jo objekt", () => {
    expect(() => createKnowledgeGraphEngine(null))
      .toThrow(TypeError);

    expect(() => createKnowledgeGraphEngine([]))
      .toThrow(TypeError);
  });

  it("shton nodes", () => {
    const engine = createEngine();

    createNodes(engine);

    expect(engine.getStatus().nodeCount).toBe(4);
    expect(engine.getNode("A").label).toBe("Alpha");

    engine.close();
  });

  it("refuzon node me ID të dyfishtë", () => {
    const engine = createEngine();

    engine.addNode({ id: "A" });

    expect(() => engine.addNode({ id: "A" }))
      .toThrow("Graph node ID already exists.");

    engine.close();
  });

  it("refuzon nodes që nuk janë array", () => {
    const engine = createEngine();

    expect(() => engine.addNodes({ id: "A" }))
      .toThrow(TypeError);

    engine.close();
  });

  it("përditëson node pa ndryshuar ID", () => {
    const engine = createEngine();

    engine.addNode({
      id: "A",
      label: "Old"
    });

    const updated = engine.updateNode("A", {
      label: "New"
    });

    expect(updated.id).toBe("A");
    expect(updated.label).toBe("New");

    engine.close();
  });

  it("refuzon përditësimin e node që mungon", () => {
    const engine = createEngine();

    expect(() => engine.updateNode("missing", {
      label: "New"
    })).toThrow("Node not found: missing");

    engine.close();
  });

  it("shton links me defaults", () => {
    const engine = createEngine();
    createNodes(engine);

    const link = engine.addLink({
      id: "L1",
      sourceId: "A",
      targetId: "B",
      relationType: "supports"
    });

    expect(link.confidence).toBe(1);
    expect(typeof link.createdAt).toBe("string");
    expect(link.metadata).toEqual({});
    expect(engine.getStatus().linkCount).toBe(1);

    engine.close();
  });

  it("refuzon link me ID të dyfishtë", () => {
    const engine = createEngine();
    createNodes(engine);

    const link = {
      id: "L1",
      sourceId: "A",
      targetId: "B",
      relationType: "supports"
    };

    engine.addLink(link);

    expect(() => engine.addLink(link))
      .toThrow("Graph link ID already exists.");

    engine.close();
  });

  it("refuzon link me node reference të pavlefshme", () => {
    const engine = createEngine();
    engine.addNode({ id: "A" });

    expect(() => engine.addLink({
      id: "L1",
      sourceId: "A",
      targetId: "UNKNOWN",
      relationType: "supports"
    })).toThrow(TypeError);

    engine.close();
  });

  it("refuzon self-link", () => {
    const engine = createEngine();
    engine.addNode({ id: "A" });

    expect(() => engine.addLink({
      id: "L1",
      sourceId: "A",
      targetId: "A",
      relationType: "supports"
    })).toThrow(TypeError);

    engine.close();
  });

  it("shton links në mënyrë batch", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(engine.getStatus().linkCount).toBe(3);

    engine.close();
  });

  it("heq link", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(engine.removeLink("L1")).toBe(true);
    expect(engine.getLink("L1")).toBe(null);
    expect(engine.removeLink("missing")).toBe(false);

    engine.close();
  });

  it("heq node dhe links incident", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(engine.removeNode("B")).toBe(true);
    expect(engine.getNode("B")).toBe(null);

    expect(
      engine.findLinks({
        sourceId: "B"
      })
    ).toEqual([]);

    expect(
      engine.findLinks({
        targetId: "B"
      })
    ).toEqual([]);

    engine.close();
  });

  it("kërkon nodes dhe links", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(engine.findNodes({ type: "concept" }))
      .toHaveLength(2);

    expect(engine.findLinks({ relationType: "supports" }))
      .toHaveLength(1);

    engine.close();
  });

  it("mbështet BFS dhe DFS", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(engine.traverse("A").map((item) => item.nodeId))
      .toEqual(["A", "B", "C"]);

    expect(engine.traverseDepthFirst("A").map((item) => item.nodeId))
      .toEqual(["A", "B", "C"]);

    expect(engine.getReachable("A"))
      .toEqual(["A", "B", "C"]);

    engine.close();
  });

  it("respekton direction dhe maxDepth", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(
      engine.traverse("A", { maxDepth: 1 })
        .map((item) => item.nodeId)
    ).toEqual(["A", "B"]);

    expect(
      engine.traverse("A", { direction: "incoming" })
        .map((item) => item.nodeId)
    ).toEqual(["A", "C", "B"]);

    engine.close();
  });

  it("zbulon ciklet", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(engine.hasCycles()).toBe(true);
    expect(engine.isAcyclicGraph()).toBe(false);
    expect(engine.detectCycles().length).toBeGreaterThan(0);
    expect(engine.getCycleNodes().length).toBeGreaterThan(0);

    engine.close();
  });

  it("gjen paths", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(engine.hasPath("A", "C")).toBe(true);
    expect(engine.findShortestPath("A", "C"))
      .toBeTruthy();

    expect(engine.findAllPaths("A", "C").length)
      .toBeGreaterThan(0);

    engine.close();
  });

  it("analizon connected components", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(
      engine.findConnectedComponents({ direction: "both" })
    ).toHaveLength(2);

    expect(
      engine.countConnectedComponents({ direction: "both" })
    ).toBe(2);

    expect(
      engine.isConnectedGraph({ direction: "both" })
    ).toBe(false);

    engine.close();
  });

  it("kontrollon integritetin", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    const report = engine.verifyIntegrity();

    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);

    engine.close();
  });

  it("rindërton snapshot-in e vlefshëm", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    const report = engine.rebuildIntegrity();

    expect(report.valid).toBe(true);
    expect(engine.getStatus().nodeCount).toBe(4);

    engine.close();
  });

  it("pastron graph", () => {
    const engine = createEngine();
    createNodes(engine);
    createLinks(engine);

    expect(engine.clear()).toBe(true);
    expect(engine.getStatus().nodeCount).toBe(0);
    expect(engine.getStatus().linkCount).toBe(0);

    engine.close();
  });

  it("ruan snapshot-et immutable", () => {
    const engine = createEngine();
    engine.addNode({ id: "A" });

    const graph = engine.getGraph();

    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.nodes)).toBe(true);

    engine.close();
  });

  it("mbyll Engine dhe refuzon operacionet pas mbylljes", () => {
    const engine = createEngine();

    expect(engine.close()).toBe(true);
    expect(engine.close()).toBe(false);

    expect(() => engine.getGraph())
      .toThrow("Knowledge Graph Engine is closed.");
  });
});
