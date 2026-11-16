import { describe, expect, it } from "vitest";
import { createIntelligentTaskPlanner } from "../../src/hyper-xsus-core/cross-cutting/intelligent-task-planner.js";
import { createMultiStepReasoningEngine } from "../../src/hyper-xsus-core/cross-cutting/multi-step-reasoning-engine.js";
describe("Hyper XSUS Core — planning and reasoning traceability", () => {
  it("calculates critical path through dependencies, not summed parallel tasks", () => {
    const result = createIntelligentTaskPlanner().plan([
      { id: "a", title: "Base", cost: 2, dependsOn: [] },
      { id: "b", title: "Parallel", cost: 5, dependsOn: [] },
      { id: "c", title: "Join", cost: 3, dependsOn: ["a","b"] }
    ]);
    expect(result.totalCost).toBe(10);
    expect(result.criticalPathCost).toBe(8);
    expect(result.steps.find(t => t.id === "c")).toMatchObject({
      earliestStart: 5, earliestFinish: 8
    });
  });
  it("returns zero critical-path cost for empty plans", () => {
    const result = createIntelligentTaskPlanner().plan([]);
    expect(result.criticalPathCost).toBe(0);
    expect(result.steps).toEqual([]);
  });
  it("identifies original versus inferred facts without duplicating source text", () => {
    const result = createMultiStepReasoningEngine().reason({
      facts: ["initial"], rules: [
        { id: "derive", premises: ["initial"], conclusion: "conclusion" }
      ]
    });
    expect(result.provenance).toEqual([
      { fact: "conclusion", source: "derived", ruleId: "derive" },
      { fact: "initial", source: "input", ruleId: null }
    ]);
    expect(Object.isFrozen(result.provenance)).toBe(true);
    expect(Object.isFrozen(result.provenance[0])).toBe(true);
  });
});
