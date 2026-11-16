import { describe, expect, it } from "vitest";
import { createKnowledgeGraphEngine } from "../../src/hyper-xsus-core/knowledge-graph/engines/knowledge-graph.engine.js";

function setup() {
  const engine = createKnowledgeGraphEngine({ id: "neighborhood-test" });
  engine.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]);
  engine.addLinks([
    { id: "ab1", sourceId: "a", targetId: "b", relationType: "related_to" },
    { id: "ab2", sourceId: "a", targetId: "b", relationType: "supports" },
    { id: "ca", sourceId: "c", targetId: "a", relationType: "related_to" }
  ]);
  return engine;
}
describe("Hyper Knowledge Graph — neighborhood inspection", () => {
  it("preserves parallel links but deduplicates neighbors", () => {
    const engine = setup();
    const result = engine.getNeighborhood("a");
    expect(result.degree).toBe(3);
    expect(result.neighborIds).toEqual(["b", "c"]);
    expect(result.links.map(x => x.id)).toEqual(["ab1", "ab2", "ca"]);
    expect(engine.getStatus().linkCount).toBe(3);
  });
  it("filters incoming and outgoing edges correctly", () => {
    const engine = setup();
    expect(engine.getNeighborhood("a", { direction: "outgoing" }).links.map(x => x.id))
      .toEqual(["ab1", "ab2"]);
    expect(engine.getNeighborhood("a", { direction: "incoming" }).links.map(x => x.id))
      .toEqual(["ca"]);
    expect(engine.getNeighborhood("d").degree).toBe(0);
  });
  it("returns deeply immutable snapshots without exposing engine internals", () => {
    const engine = setup();
    const result = engine.getNeighborhood("a");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.links)).toBe(true);
    expect(Object.isFrozen(result.links[0].metadata)).toBe(true);
    expect(() => { result.links[0].id = "tampered"; }).toThrow();
    expect(engine.getLink("ab1").id).toBe("ab1");
  });
  it.each([
    ["missing", {}, "Node not found"],
    ["a", { direction: "sideways" }, "direction"],
    ["a", null, "plain object"],
    [" ", {}, "non-empty"]
  ])("rejects invalid neighborhood requests", (node, options, message) => {
    expect(() => setup().getNeighborhood(node, options)).toThrow(message);
  });
  it("honors engine closure", () => {
    const engine = setup();
    engine.close();
    expect(() => engine.getNeighborhood("a")).toThrow("closed");
  });
});
