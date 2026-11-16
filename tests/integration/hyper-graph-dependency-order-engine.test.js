import { describe, it, expect } from "vitest";
import { createGraphDependencyOrderEngine } from "../../src/hyper-xsus-core/cross-cutting/graph-dependency-order-engine.js";
describe("Hyper dependency order", () => {
  it("sorts dependencies before dependents deterministically", () => {
    const result = createGraphDependencyOrderEngine().order([
      { id: "app", dependsOn: ["auth", "api"] }, { id: "auth", dependsOn: [] },
      { id: "api", dependsOn: ["auth"] }
    ]);
    expect(result.order).toEqual(["auth", "api", "app"]);
    expect(Object.isFrozen(result.order)).toBe(true);
  });
  it("rejects cycles and missing dependencies", () => {
    const engine = createGraphDependencyOrderEngine();
    expect(() => engine.order([{ id: "a", dependsOn: ["b"] }, { id: "b", dependsOn: ["a"] }])).toThrow("cycle");
    expect(() => engine.order([{ id: "a", dependsOn: ["missing"] }])).toThrow("Unknown");
  });
  it("rejects duplicate nodes", () => {
    expect(() => createGraphDependencyOrderEngine().order([
      { id: "a", dependsOn: [] }, { id: "a", dependsOn: [] }
    ])).toThrow("node");
  });
});
