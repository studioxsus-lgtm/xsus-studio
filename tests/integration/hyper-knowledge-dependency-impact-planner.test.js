import { describe, it, expect } from "vitest";
import { createKnowledgeDependencyImpactPlanner } from "../../src/hyper-xsus-core/cross-cutting/knowledge-dependency-impact-planner.js";
const node = (id, revision) => ({ id, revision });
describe("Hyper Core knowledge dependency impact planner", () => {
  it("orders affected dependent nodes after revised dependencies", () => {
    const planner = createKnowledgeDependencyImpactPlanner();
    const result = planner.plan({
      before: [node("a", 1), node("b", 1), node("c", 1), node("d", 1)],
      after: [node("a", 2), node("b", 1), node("c", 1), node("d", 1)],
      dependencyNodes: [
        { id: "d", dependsOn: [] }, { id: "c", dependsOn: ["b"] },
        { id: "b", dependsOn: ["a"] }, { id: "a", dependsOn: [] }
      ]
    });
    expect(result.changeSet.revised).toEqual(["a"]);
    expect(result.rebuildOrder).toEqual(["a", "b", "c"]);
    expect(result.affectedCount).toBe(3);
    expect(result.automaticExecution).toBe(false);
  });
  it("reports removed nodes without scheduling nonexistent nodes", () => {
    const result = createKnowledgeDependencyImpactPlanner().plan({
      before: [node("a", 1), node("b", 1)],
      after: [node("a", 1)],
      dependencyNodes: [{ id: "a", dependsOn: [] }]
    });
    expect(result.removed).toEqual(["b"]);
    expect(result.rebuildOrder).toEqual([]);
  });
  it("rejects mismatched dependency graphs", () => {
    expect(() => createKnowledgeDependencyImpactPlanner().plan({
      before: [], after: [node("a", 1)], dependencyNodes: []
    })).toThrow("must match");
  });
  it("rejects cycles", () => {
    expect(() => createKnowledgeDependencyImpactPlanner().plan({
      before: [], after: [node("a", 1)],
      dependencyNodes: [{ id: "a", dependsOn: ["a"] }]
    })).toThrow("cycle");
  });
});
