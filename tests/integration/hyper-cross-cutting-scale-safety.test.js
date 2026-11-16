import { describe, it, expect } from "vitest";
import { createGraphDependencyOrderEngine } from "../../src/hyper-xsus-core/cross-cutting/graph-dependency-order-engine.js";
import { createRequestReplayGuard } from "../../src/hyper-xsus-core/cross-cutting/request-replay-guard.js";
describe("Hyper Core — graph and replay boundary hardening", () => {
  it("orders a deep dependency chain without recursive stack overflow", () => {
    const count = 3000;
    const nodes = Array.from({ length: count }, (_, i) => ({
      id: "node-" + i, dependsOn: i === 0 ? [] : ["node-" + (i - 1)]
    })).reverse();
    const ordered = createGraphDependencyOrderEngine().order(nodes).order;
    expect(ordered).toHaveLength(count);
    expect(ordered[0]).toBe("node-0");
    expect(ordered.at(-1)).toBe("node-2999");
  });
  it("orders independent nodes deterministically", () => {
    const nodes = [{ id: "z", dependsOn: [] }, { id: "a", dependsOn: [] }];
    expect(createGraphDependencyOrderEngine().order(nodes).order).toEqual(["a", "z"]);
  });
  it("rejects timestamp overflow before reserving replay claim", () => {
    const guard = createRequestReplayGuard({ ttlMs: 10, clock: () => Number.MAX_SAFE_INTEGER - 5 });
    expect(() => guard.claim({ actorId: "a", requestId: "r" })).toThrow("overflow");
    expect(guard.size()).toBe(0);
  });
  it("rejects a self dependency", () => {
    expect(() => createGraphDependencyOrderEngine().order([
      { id: "loop", dependsOn: ["loop"] }
    ])).toThrow("cycle");
  });
});
