import { describe, expect, it } from "vitest";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const checks = [
  { name: "coherence", score: 0.95 },
  { name: "completeness", score: 0.95 },
  { name: "safety", score: 0.95 }
];
const input = {
  query: "language quality",
  evidence: [{ id: "doc", text: "language quality" }],
  facts: ["known"],
  rules: [{ id: "r1", premises: ["known"], conclusion: "ready" }],
  tasks: [{ id: "draft", title: "Draft", cost: 1, dependsOn: [] }],
  qualityChecks: checks,
  requests: [{ engine: "specialist", payload: { approved: true } }]
};
const make = execute => createFiveEngineWorkflow({
  engines: [{ name: "specialist", execute }]
});
describe("Hyper XSUS Core — specialist output workflow contract", () => {
  it("completes with valid specialist output", async () => {
    const result = await make(async () => ({ approved: true })).run(input);
    expect(result.status).toBe("completed");
    expect(result.coordination).toMatchObject({ completed: 1, failed: 0 });
    expect(result.coordination.results[0].output).toEqual({ approved: true });
  });
  it("degrades when specialist returns undefined without exposing output", async () => {
    const result = await make(async () => undefined).run(input);
    expect(result.status).toBe("degraded");
    expect(result.coordination).toMatchObject({ completed: 0, failed: 1 });
    expect(result.coordination.results[0]).toMatchObject({ status: "failed", output: null });
  });
  it("degrades when specialist output contains accessor without invoking it", async () => {
    let reads = 0;
    const result = await make(async () => {
      const output = {};
      Object.defineProperty(output, "secret", {
        enumerable: true,
        get() { reads++; return "secret"; }
      });
      return output;
    }).run(input);
    expect(reads).toBe(0);
    expect(result.status).toBe("degraded");
    expect(result.coordination.results[0].output).toBe(null);
  });
  it("does not run specialists if the quality gate rejects", async () => {
    let calls = 0;
    const result = await make(async () => { calls++; return {}; }).run({
      ...input, qualityChecks: []
    });
    expect(result.status).toBe("quality-rejected");
    expect(result.executionAttempted).toBe(false);
    expect(calls).toBe(0);
  });
});
