import { describe, it, expect } from "vitest";
import { createGraphChangeSetEngine } from "../../src/hyper-xsus-core/cross-cutting/graph-change-set-engine.js";
describe("Hyper Core graph change sets", () => {
  it("classifies changes deterministically without mutating snapshots", () => {
    const before = [{ id: "a", revision: 1 }, { id: "b", revision: 2 }, { id: "d", revision: 1 }];
    const after = [{ id: "c", revision: 1 }, { id: "b", revision: 3 }, { id: "d", revision: 1 }];
    const result = createGraphChangeSetEngine().compare(before, after);
    expect(result).toMatchObject({ added: ["c"], removed: ["a"], revised: ["b"], unchanged: ["d"] });
    expect(before[0].id).toBe("a");
    expect(Object.isFrozen(result.revised)).toBe(true);
  });
  it("rejects duplicate identifiers", () => {
    expect(() => createGraphChangeSetEngine().compare(
      [{ id: "a", revision: 1 }, { id: "a", revision: 2 }], []
    )).toThrow("node");
  });
  it("rejects excessive snapshots", () => {
    expect(() => createGraphChangeSetEngine({ maxNodes: 1 }).compare(
      [{ id: "a", revision: 1 }, { id: "b", revision: 1 }], []
    )).toThrow("snapshot");
  });
});
