import { describe, expect, it } from "vitest";
import { createFiveEngineConcurrencyGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-concurrency-gate.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
import { createMultiStepReasoningEngine } from "../../src/hyper-xsus-core/cross-cutting/multi-step-reasoning-engine.js";
import { createIntelligentTaskPlanner } from "../../src/hyper-xsus-core/cross-cutting/intelligent-task-planner.js";
import { createSemanticEvidenceAnalyzer } from "../../src/hyper-xsus-core/cross-cutting/semantic-evidence-analyzer.js";
import { createResponseEvaluationEngine } from "../../src/hyper-xsus-core/cross-cutting/response-evaluation-engine.js";
import { createSpecializedEngineCoordinator } from "../../src/hyper-xsus-core/cross-cutting/specialized-engine-coordinator.js";
const qualityChecks = ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
describe("Hyper XSUS Core — concurrency and five-domain stress", () => {
  it("admits only configured simultaneous work and frees capacity on success", async () => {
    const hold = deferred();
    let calls = 0;
    const gate = createFiveEngineConcurrencyGate({ maxConcurrent: 2, workflow: {
      async run() { calls++; await hold.promise; return { status: "completed" }; }
    } });
    const a = gate.run({}), b = gate.run({});
    expect(gate.stats()).toMatchObject({ active: 2, accepted: 2, rejected: 0 });
    await expect(gate.run({})).rejects.toMatchObject({ code: "HYPER_WORKFLOW_CAPACITY_EXCEEDED" });
    expect(calls).toBe(2);
    hold.resolve();
    await Promise.all([a,b]);
    expect(gate.stats()).toMatchObject({ active: 0, accepted: 2, rejected: 1 });
    await expect(gate.run({})).resolves.toMatchObject({ status: "completed" });
  });
  it("releases capacity after an exception", async () => {
    const gate = createFiveEngineConcurrencyGate({ maxConcurrent: 1, workflow: {
      async run() { throw new Error("private failure"); }
    } });
    await expect(gate.run({})).rejects.toThrow("private failure");
    expect(gate.stats().active).toBe(0);
    await expect(gate.run({})).rejects.toThrow("private failure");
    expect(gate.stats().accepted).toBe(2);
  });
  it("rejects invalid concurrency configuration", () => {
    expect(() => createFiveEngineConcurrencyGate({ workflow: { run() {} }, maxConcurrent: 0 })).toThrow("configuration");
    expect(() => createFiveEngineConcurrencyGate({ workflow: {}, maxConcurrent: 1 })).toThrow("configuration");
  });
  it("keeps lexical ranking deterministic under repeated inputs", () => {
    const engine = createSemanticEvidenceAnalyzer();
    const input = { query: "alpha beta", evidence: [
      { id: "b", text: "alpha" }, { id: "a", text: "alpha beta" }
    ] };
    const baseline = JSON.stringify(engine.analyze(input));
    for (let i = 0; i < 100; i++) expect(JSON.stringify(engine.analyze(input))).toBe(baseline);
  });
  it("bounds reasoning on a long dependency chain", () => {
    const engine = createMultiStepReasoningEngine({ maxRounds: 2 });
    const rules = Array.from({ length: 20 }, (_, i) => ({
      id: "r" + i, premises: ["f" + i], conclusion: "f" + (i+1)
    })).reverse();
    const result = engine.reason({ facts: ["f0"], rules });
    expect(result.incomplete).toBe(true);
    expect(result.rounds).toBe(2);
  });
  it("computes long task chain critical path without altering input", () => {
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: "t" + i, title: "Task " + i, cost: 2,
      dependsOn: i ? ["t" + (i-1)] : []
    }));
    const result = createIntelligentTaskPlanner().plan(tasks);
    expect(result.steps).toHaveLength(100);
    expect(result.criticalPathCost).toBe(200);
    expect(tasks[99].dependsOn).toEqual(["t98"]);
  });
  it("refuses unsafe quality evidence despite passing numeric scores", () => {
    const result = createResponseEvaluationEngine().evaluate({
      checks: qualityChecks, findings: [{ code: "RISK", severity: "error" }]
    });
    expect(result.accepted).toBe(false);
    expect(result.errorCount).toBe(1);
  });
  it("isolates specialist failure while preserving successful outputs", async () => {
    const coordinator = createSpecializedEngineCoordinator({ engines: [
      { name: "ok", execute: async () => ({ valid: true }) },
      { name: "bad", execute: async () => { throw new Error("secret"); } }
    ] });
    const result = await coordinator.coordinate({ requests: [
      { engine: "ok", payload: {} }, { engine: "bad", payload: {} }
    ] });
    expect(result).toMatchObject({ completed: 1, failed: 1 });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
  it("enforces concurrency around an integrated five-engine workflow", async () => {
    const hold = deferred();
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => { await hold.promise; return { ok: true }; } }
    ] });
    const gate = createFiveEngineConcurrencyGate({ workflow, maxConcurrent: 1 });
    const input = { query: "alpha", requests: [{ engine: "worker", payload: {} }], qualityChecks };
    const first = gate.run(input);
    await expect(gate.run(input)).rejects.toMatchObject({ code: "HYPER_WORKFLOW_CAPACITY_EXCEEDED" });
    hold.resolve();
    await expect(first).resolves.toMatchObject({ status: "completed" });
    expect(gate.stats().active).toBe(0);
  });
});
