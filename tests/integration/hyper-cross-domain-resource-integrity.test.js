import { describe, it, expect } from "vitest";
import { createEngineExecutionBudget } from "../../src/hyper-xsus-core/cross-cutting/engine-execution-budget.js";
import { createWrittenLanguagePipeline } from "../../src/hyper-xsus-core/cross-cutting/written-language-pipeline.js";
import { createKnowledgeDependencyImpactPlanner } from "../../src/hyper-xsus-core/cross-cutting/knowledge-dependency-impact-planner.js";
const engine = (name, process) => ({ name, supports: () => true, process });
describe("Hyper XSUS Core — cross-domain resource and integrity gates", () => {
  it("counts attempts and outputs independently and fails closed", () => {
    const budget = createEngineExecutionBudget({ maxAttempts: 2, maxOutputs: 1 });
    expect(budget.claimAttempt()).toBe(1);
    expect(budget.claimAttempt()).toBe(2);
    expect(budget.claimOutput()).toBe(1);
    expect(() => budget.claimAttempt()).toThrow("budget exhausted");
    expect(() => budget.claimOutput()).toThrow("budget exhausted");
    expect(budget.snapshot()).toEqual({
      attempts: 2, outputs: 1, remainingAttempts: 0, remainingOutputs: 0
    });
  });
  it("bounds total context before dispatch", async () => {
    let called = false;
    const pipeline = createWrittenLanguagePipeline({
      maxContextCodePoints: 10, maxTotalContextCodePoints: 3,
      engines: [engine("en", async () => { called = true; return { answer: "ok" }; })]
    });
    await expect(pipeline.process({ text: "Hello.", context: [
      { role: "user", content: "ab" }, { role: "assistant", content: "cd" }
    ] })).rejects.toThrow("Total written language context limit");
    expect(called).toBe(false);
  });
  it("accounts for failover attempts", async () => {
    const pipeline = createWrittenLanguagePipeline({ engines: [
      engine("broken", async () => { throw Error("offline"); }),
      engine("healthy", async () => ({ answer: "ok" }))
    ] });
    const result = await pipeline.process({ text: "Hello." });
    expect(result.execution).toMatchObject({ attempts: 2, outputs: 1 });
    expect(result.sentences[0].engine).toBe("healthy");
  });
  it("stops dispatch when total attempt budget is exhausted", async () => {
    let backupCalls = 0;
    const pipeline = createWrittenLanguagePipeline({
      maxEngineAttempts: 1, engines: [
        engine("broken", async () => { throw Error("offline"); }),
        engine("backup", async () => { backupCalls++; return { answer: "ok" }; })
      ]
    });
    await expect(pipeline.process({ text: "Hello." }))
      .rejects.toMatchObject({ code: "HYPER_ENGINE_BUDGET_EXCEEDED" });
    expect(backupCalls).toBe(0);
  });
  it("rejects a current dependency on a removed node", () => {
    const planner = createKnowledgeDependencyImpactPlanner();
    expect(() => planner.plan({
      before: [{ id: "old", revision: 1 }, { id: "live", revision: 1 }],
      after: [{ id: "live", revision: 2 }],
      dependencyNodes: [{ id: "live", dependsOn: ["old"] }]
    })).toThrow("removed nodes");
  });
  it("does not alter unchanged knowledge nodes", () => {
    const planner = createKnowledgeDependencyImpactPlanner();
    const result = planner.plan({
      before: [{ id: "a", revision: 1 }],
      after: [{ id: "a", revision: 1 }],
      dependencyNodes: [{ id: "a", dependsOn: [] }]
    });
    expect(result.rebuildOrder).toEqual([]);
    expect(result.automaticExecution).toBe(false);
  });
});
