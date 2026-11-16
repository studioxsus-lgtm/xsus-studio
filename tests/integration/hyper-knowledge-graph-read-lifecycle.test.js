import { describe, expect, it } from "vitest";
import { createKnowledgeGraphEngine } from "../../src/hyper-xsus-core/knowledge-graph/engines/knowledge-graph.engine.js";
import { createKnowledgeGraphAPI } from "../../src/hyper-xsus-core/knowledge-graph/public/knowledge-graph.api.js";

describe("Hyper Knowledge Graph — read lifecycle regression", () => {
  it("allows node and link reads before close, rejects them after close", () => {
    const engine = createKnowledgeGraphEngine({ id: "read-lifecycle" });
    engine.addNodes([{ id: "a" }, { id: "b" }]);
    engine.addLink({ id: "ab", sourceId: "a", targetId: "b", relationType: "related_to" });
    expect(engine.getNode("a").id).toBe("a");
    expect(engine.getLink("ab").id).toBe("ab");
    expect(engine.getNode("missing")).toBeNull();
    expect(engine.getLink("missing")).toBeNull();
    expect(engine.close()).toBe(true);
    expect(engine.close()).toBe(false);
    expect(() => engine.getNode("a")).toThrow("closed");
    expect(() => engine.getLink("ab")).toThrow("closed");
    expect(() => engine.getNode("missing")).toThrow("closed");
    expect(() => engine.getLink("missing")).toThrow("closed");
  });
  it("public API continues enforcing its own lifecycle", () => {
    const api = createKnowledgeGraphAPI({ id: "public-read-lifecycle" });
    api.addNode({ id: "a" });
    expect(api.getNode("a").id).toBe("a");
    api.close();
    expect(() => api.getNode("a")).toThrow("closed");
    expect(() => api.getLink("missing")).toThrow("closed");
  });
});
