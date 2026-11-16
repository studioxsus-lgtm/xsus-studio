import { describe, it, expect } from "vitest";
import { createSemanticEvidenceAnalyzer } from "../../src/hyper-xsus-core/cross-cutting/semantic-evidence-analyzer.js";
import { createMultiStepReasoningEngine } from "../../src/hyper-xsus-core/cross-cutting/multi-step-reasoning-engine.js";
import { createIntelligentTaskPlanner } from "../../src/hyper-xsus-core/cross-cutting/intelligent-task-planner.js";
import { createResponseEvaluationEngine } from "../../src/hyper-xsus-core/cross-cutting/response-evaluation-engine.js";
import { createSpecializedEngineCoordinator } from "../../src/hyper-xsus-core/cross-cutting/specialized-engine-coordinator.js";
describe("Hyper XSUS Core — five independent engines", () => {
  it("ranks lexical evidence deterministically", () => {
    const a = createSemanticEvidenceAnalyzer().analyze({ query: "hello world",
      evidence: [{ id: "b", text: "hello" }, { id: "a", text: "hello world" }] });
    expect(a.ranked.map(r => r.id)).toEqual(["a", "b"]);
    expect(a.ranked[0].score).toBe(1);
    expect(a.semanticTruthVerified).toBe(false);
  });
  it("rejects duplicated evidence ids", () => {
    expect(() => createSemanticEvidenceAnalyzer().analyze({ query: "a",
      evidence: [{ id: "x", text: "a" }, { id: "x", text: "b" }] })).toThrow("identifier");
  });
  it("derives multiple inference steps from supplied rules", () => {
    const result = createMultiStepReasoningEngine().reason({
      facts: ["a"], rules: [
        { id: "r2", premises: ["b"], conclusion: "c" },
        { id: "r1", premises: ["a"], conclusion: "b" }
      ]
    });
    expect(result.facts).toEqual(["a","b","c"]);
    expect(result.steps.map(s => s.ruleId)).toEqual(["r1","r2"]);
    expect(result.incomplete).toBe(false);
  });
  it("rejects invalid inference rules", () => {
    expect(() => createMultiStepReasoningEngine().reason({
      rules: [{ id: "r", premises: ["x","x"], conclusion: "y" }]
    })).toThrow("rule");
  });
  it("orders tasks by dependencies and preserves costs", () => {
    const result = createIntelligentTaskPlanner().plan([
      { id: "b", title: "Build", cost: 3, dependsOn: ["a"] },
      { id: "a", title: "Design", cost: 2, dependsOn: [] }
    ]);
    expect(result.steps.map(s => s.id)).toEqual(["a","b"]);
    expect(result.totalCost).toBe(5);
    expect(result.executable).toBe(false);
  });
  it("rejects cyclic task dependencies", () => {
    expect(() => createIntelligentTaskPlanner().plan([
      { id: "a", title: "A", cost: 1, dependsOn: ["b"] },
      { id: "b", title: "B", cost: 1, dependsOn: ["a"] }
    ])).toThrow("cycle");
  });
  it("accepts complete response quality evidence", () => {
    const result = createResponseEvaluationEngine().evaluate({ checks: [
      { name: "coherence", score: 0.9 },
      { name: "completeness", score: 0.8 },
      { name: "safety", score: 1 }
    ] });
    expect(result.accepted).toBe(true);
    expect(result.factualAccuracyVerified).toBe(false);
  });
  it("rejects response with missing safety evidence", () => {
    const result = createResponseEvaluationEngine().evaluate({ checks: [
      { name: "coherence", score: 1 }, { name: "completeness", score: 1 }
    ] });
    expect(result.accepted).toBe(false);
    expect(result.missingChecks).toContain("safety");
  });
  it("coordinates isolated engine outputs and counts failures", async () => {
    const coordinator = createSpecializedEngineCoordinator({ engines: [
      { name: "semantic", execute: async payload => ({ value: payload.value }) },
      { name: "reasoning", execute: async () => { throw Error("private secret"); } }
    ] });
    const result = await coordinator.coordinate({ requests: [
      { engine: "semantic", payload: { value: 1 } },
      { engine: "reasoning", payload: {} }
    ] });
    expect(result).toMatchObject({ completed: 1, failed: 1 });
    expect(result.results[0].output.value).toBe(1);
    expect(JSON.stringify(result)).not.toContain("private secret");
  });
  it("rejects duplicate engine requests before execution", async () => {
    let calls = 0;
    const coordinator = createSpecializedEngineCoordinator({ engines: [
      { name: "one", execute: async () => { calls++; return { ok: true }; } }
    ] });
    await expect(coordinator.coordinate({ requests: [
      { engine: "one", payload: {} }, { engine: "one", payload: {} }
    ] })).rejects.toThrow("request");
    expect(calls).toBe(1);
  });
});
