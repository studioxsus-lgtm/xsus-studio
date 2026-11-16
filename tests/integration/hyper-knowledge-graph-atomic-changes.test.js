import { describe, expect, it } from "vitest";
import { createKnowledgeGraphAPI } from "../../src/hyper-xsus-core/knowledge-graph/public/knowledge-graph.api.js";

function setup() {
  const api = createKnowledgeGraphAPI({ id: "atomic-graph" });
  api.addNode({ id: "existing" });
  return api;
}

describe("Hyper Knowledge Graph — atomic changesets", () => {
  it("previews a multi-operation transaction without changing the graph", () => {
    const api = setup();
    const changes = [
      { type: "addNode", node: { id: "new" } },
      { type: "addLink", link: { id: "edge", sourceId: "existing", targetId: "new", relationType: "related_to" } }
    ];
    const before = api.getGraph();
    const preview = api.previewChanges(changes);
    expect(preview.operationCount).toBe(2);
    expect(preview.graph.nodes).toHaveLength(2);
    expect(preview.graph.links).toHaveLength(1);
    expect(api.getGraph()).toEqual(before);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(Object.isFrozen(preview.results)).toBe(true);
    expect(Object.isFrozen(preview.graph)).toBe(true);
    expect(api.applyChanges(changes).operationCount).toBe(2);
    expect(api.getGraph().nodes).toHaveLength(2);
    expect(api.getGraph().links).toHaveLength(1);
    expect(api.verifyIntegrity().valid).toBe(true);
  });

  it("rolls back all changes when a link references a missing node", () => {
    const api = setup();
    const before = api.getGraph();
    expect(() => api.applyChanges([
      { type: "addNode", node: { id: "new" } },
      { type: "addLink", link: { id: "broken", sourceId: "new", targetId: "absent", relationType: "related_to" } }
    ])).toThrow();
    expect(api.getGraph()).toEqual(before);
  });

  it("rejects duplicate IDs and unsupported operations atomically", () => {
    const api = setup();
    const before = api.getGraph();
    expect(() => api.applyChanges([
      { type: "addNode", node: { id: "new" } },
      { type: "addNode", node: { id: "new" } }
    ])).toThrow("already exists");
    expect(() => api.applyChanges([{ type: "deleteEverything" }])).toThrow("Unsupported");
    expect(api.getGraph()).toEqual(before);
  });

  it("supports updating and deleting nodes with link cascade", () => {
    const api = setup();
    api.applyChanges([
      { type: "addNode", node: { id: "new" } },
      { type: "addLink", link: { id: "edge", sourceId: "existing", targetId: "new", relationType: "related_to" } }
    ]);
    api.applyChanges([
      { type: "updateNode", id: "existing", updates: { label: "Updated" } },
      { type: "removeNode", id: "new" }
    ]);
    expect(api.getNode("existing").label).toBe("Updated");
    expect(api.getLink("edge")).toBeNull();
    expect(api.verifyIntegrity().valid).toBe(true);
  });

  it("rejects empty and oversized transactions", () => {
    const api = setup();
    expect(() => api.applyChanges([])).toThrow("1 to 1000");
    expect(() => api.applyChanges(Array.from({ length: 1001 }, () => ({ type: "noop" })))).toThrow("1 to 1000");
    expect(() => api.previewChanges(null)).toThrow("1 to 1000");
  });

  it("rejects all operations after closure", () => {
    const api = setup();
    api.close();
    expect(() => api.previewChanges([{ type: "addNode", node: { id: "x" } }])).toThrow("closed");
    expect(() => api.applyChanges([{ type: "addNode", node: { id: "x" } }])).toThrow("closed");
  });
});
