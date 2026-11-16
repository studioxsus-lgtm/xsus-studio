import { describe, expect, it } from "vitest";
import { createKnowledgeGraphAPI } from "../../src/hyper-xsus-core/knowledge-graph/public/knowledge-graph.api.js";

describe("Hyper Knowledge Graph — public neighborhood API", () => {
  it("exposes directed neighborhood queries through the existing public API", () => {
    const api = createKnowledgeGraphAPI({ id: "public-neighborhood" });
    api.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    api.addLinks([
      { id: "ab", sourceId: "a", targetId: "b", relationType: "related_to" },
      { id: "ca", sourceId: "c", targetId: "a", relationType: "supports" }
    ]);
    expect(api.getNeighborhood("a", { direction: "outgoing" }).neighborIds).toEqual(["b"]);
    expect(api.getNeighborhood("a", { direction: "incoming" }).neighborIds).toEqual(["c"]);
    expect(api.getNeighborhood("a").degree).toBe(2);
    expect(api.verifyIntegrity().valid).toBe(true);
    api.close();
    expect(() => api.getNeighborhood("a")).toThrow("closed");
  });
  it("rejects invalid options at the public boundary", () => {
    const api = createKnowledgeGraphAPI({ id: "public-neighborhood-invalid" });
    api.addNode({ id: "a" });
    expect(() => api.getNeighborhood("a", null)).toThrow("plain object");
    expect(() => api.getNeighborhood("a", { direction: "sideways" })).toThrow("direction");
  });
});
