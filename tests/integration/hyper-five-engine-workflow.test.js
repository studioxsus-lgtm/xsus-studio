import { describe, it, expect } from "vitest";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const checks = [
  { name: "coherence", score: 0.95 },
  { name: "completeness", score: 0.9 },
  { name: "safety", score: 1 }
];
const input = {
  query: "language quality", evidence: [{ id: "doc", text: "language quality guide" }],
  facts: ["verified"], rules: [{ id: "r1", premises: ["verified"], conclusion: "ready" }],
  tasks: [
    { id: "draft", title: "Draft", cost: 2, dependsOn: [] },
    { id: "review", title: "Review", cost: 3, dependsOn: ["draft"] }
  ],
  requests: [{ engine: "specialist", payload: { approved: true } }],
  qualityChecks: checks
};
describe("Hyper XSUS Core — five engine workflow integration", () => {
  it("executes all five stages with explicit quality evidence", async () => {
    let calls = 0;
    const flow = createFiveEngineWorkflow({ engines: [
      { name: "specialist", execute: async payload => { calls++; return { approved: payload.approved }; } }
    ] });
    const result = await flow.run(input);
    expect(result.status).toBe("completed");
    expect(result.semantic.ranked[0].id).toBe("doc");
    expect(result.reasoning.facts).toContain("ready");
    expect(result.plan.steps.map(x => x.id)).toEqual(["draft", "review"]);
    expect(result.coordination.completed).toBe(1);
    expect(result.quality.accepted).toBe(true);
    expect(calls).toBe(1);
    expect(Object.isFrozen(result)).toBe(true);
  });
  it("fails closed on missing quality evidence without executing specialists", async () => {
    let calls = 0;
    const flow = createFiveEngineWorkflow({ engines: [
      { name: "specialist", execute: async () => { calls++; return {}; } }
    ] });
    const result = await flow.run({ ...input, qualityChecks: [] });
    expect(result.status).toBe("quality-rejected");
    expect(result.coordination).toBe(null);
    expect(result.executionAttempted).toBe(false);
    expect(calls).toBe(0);
  });
  it("does not execute specialists if task dependencies are cyclic", async () => {
    let calls = 0;
    const flow = createFiveEngineWorkflow({ engines: [
      { name: "specialist", execute: async () => { calls++; return {}; } }
    ] });
    await expect(flow.run({ ...input, tasks: [
      { id: "a", title: "A", cost: 1, dependsOn: ["b"] },
      { id: "b", title: "B", cost: 1, dependsOn: ["a"] }
    ] })).rejects.toThrow("cycle");
    expect(calls).toBe(0);
  });
  it("reports degraded status without exposing private specialist errors", async () => {
    const flow = createFiveEngineWorkflow({ engines: [
      { name: "specialist", execute: async () => { throw Error("private-token-123"); } }
    ] });
    const result = await flow.run(input);
    expect(result.status).toBe("degraded");
    expect(result.coordination.failed).toBe(1);
    expect(JSON.stringify(result)).not.toContain("private-token-123");
  });
  it("does not claim lexical overlap proves semantic truth", async () => {
    const flow = createFiveEngineWorkflow({ engines: [
      { name: "specialist", execute: async () => ({ ok: true }) }
    ] });
    const result = await flow.run(input);
    expect(result.semantic.semanticTruthVerified).toBe(false);
    expect(result.quality.factualAccuracyVerified).toBe(false);
  });
});
