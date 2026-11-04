
import { describe, it, expect } from "vitest";

import {
  createKnowledgeGraphAPI
} from "../../index.js";

describe("KnowledgeGraph — Integration", () => {
  it("krijon graf dhe menaxhon nodes", () => {
    const api = createKnowledgeGraphAPI({
      id: "integration-graph"
    });

    const nodeA = api.addNode({
      id: "A",
      type: "concept",
      label: "Artificial Intelligence"
    });

    const nodeB = api.addNode({
      id: "B",
      type: "concept",
      label: "Machine Learning"
    });

    expect(nodeA.id).toBe("A");
    expect(nodeB.id).toBe("B");
    expect(api.getGraph().nodes).toHaveLength(2);

    api.close();
  });

  it("krijon lidhje dhe gjen rrugë", () => {
    const api = createKnowledgeGraphAPI({
      id: "path-integration"
    });

    api.addNode({ id: "A" });
    api.addNode({ id: "B" });
    api.addNode({ id: "C" });

    api.addLink({
      id: "AB",
      sourceId: "A",
      targetId: "B",
      relationType: "supports"
    });

    api.addLink({
      id: "BC",
      sourceId: "B",
      targetId: "C",
      relationType: "depends_on"
    });

    expect(api.hasPath("A", "C")).toBe(true);

    const path = api.findShortestPath("A", "C");

    expect(path).toBeTruthy();
    expect(path).toEqual(["A", "B", "C"]);

    api.close();
  });

  it("zbulon ciklet në graf", () => {
    const api = createKnowledgeGraphAPI({
      id: "cycle-integration"
    });

    api.addNode({ id: "A" });
    api.addNode({ id: "B" });
    api.addNode({ id: "C" });

    api.addLink({
      id: "AB",
      sourceId: "A",
      targetId: "B",
      relationType: "related_to"
    });

    api.addLink({
      id: "BC",
      sourceId: "B",
      targetId: "C",
      relationType: "related_to"
    });

    api.addLink({
      id: "CA",
      sourceId: "C",
      targetId: "A",
      relationType: "related_to"
    });

    expect(api.hasCycles()).toBe(true);
    expect(api.isAcyclicGraph()).toBe(false);

    api.close();
  });

  it("verifikon integritetin dhe statusin", () => {
    const api = createKnowledgeGraphAPI({
      id: "integrity-integration"
    });

    api.addNode({ id: "A" });
    api.addNode({ id: "B" });

    api.addLink({
      id: "AB",
      sourceId: "A",
      targetId: "B",
      relationType: "contains"
    });

    const integrity = api.verifyIntegrity();

    expect(integrity).toBeTruthy();
    expect(integrity.valid).toBe(true);
    expect(integrity.errors).toEqual([]);
    expect(integrity.nodeCount).toBe(2);
    expect(integrity.linkCount).toBe(1);

    const status = api.getStatus();

    expect(status).toBeTruthy();
    expect(typeof status).toBe("object");

    api.close();
  });

  it("heq node dhe lidhjet përkatëse", () => {
    const api = createKnowledgeGraphAPI({
      id: "deletion-integration"
    });

    api.addNode({ id: "A" });
    api.addNode({ id: "B" });

    api.addLink({
      id: "AB",
      sourceId: "A",
      targetId: "B",
      relationType: "related_to"
    });

    api.removeNode("A");

    expect(api.getNode("A")).toBeNull();
    expect(api.getGraph().links).toHaveLength(0);

    api.close();
  });
});
