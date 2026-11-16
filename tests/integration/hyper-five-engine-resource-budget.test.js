import { describe, expect, it } from "vitest";
import { createFiveEngineResourceBudget } from "../../src/hyper-xsus-core/cross-cutting/five-engine-resource-budget.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const checks = [{ name: "coherence", score: 1 }, { name: "completeness", score: 1 },
  { name: "safety", score: 1 }];
describe("Hyper XSUS Core — five engine resource admission", () => {
  it("reports bounded resource counts without returning source text", () => {
    const result = createFiveEngineResourceBudget().check({
      query: "private phrase", evidence: [{ id: "a" }], facts: ["x"],
      rules: [], tasks: [], requests: []
    });
    expect(result).toMatchObject({ accepted: true, totalItems: 2, queryCodePoints: 14 });
    expect(JSON.stringify(result)).not.toContain("private phrase");
    expect(Object.isFrozen(result.counts)).toBe(true);
  });
  it("counts Unicode code points rather than UTF-16 units", () => {
    const gate = createFiveEngineResourceBudget({ maxTextCodePoints: 2 });
    expect(gate.check({ query: "😀a" }).queryCodePoints).toBe(2);
    expect(() => gate.check({ query: "😀ab" })).toThrow("query");
  });
  it("rejects oversized evidence and total item budgets", () => {
    expect(() => createFiveEngineResourceBudget({ maxEvidence: 1 })
      .check({ query: "a", evidence: [{}, {}] })).toThrow("evidence");
    expect(() => createFiveEngineResourceBudget({ maxTotalItems: 1 })
      .check({ query: "a", facts: ["a"], rules: [{}] })).toThrow("total");
  });
  it("rejects malformed resource fields and configuration", () => {
    expect(() => createFiveEngineResourceBudget({ maxTasks: -1 })).toThrow("budget");
    expect(() => createFiveEngineResourceBudget().check({
      query: "a", tasks: "not-an-array"
    })).toThrow("tasks");
  });
  it("rejects oversized workflow input before any specialist executes", async () => {
    let calls = 0;
    const workflow = createFiveEngineWorkflow({ maxEvidence: 1, engines: [
      { name: "worker", execute: async () => { calls++; return { ok: true }; } }
    ] });
    await expect(workflow.run({
      query: "a", evidence: [{ id: "a", text: "a" }, { id: "b", text: "b" }],
      requests: [{ engine: "worker", payload: {} }], qualityChecks: checks
    })).rejects.toThrow("evidence");
    expect(calls).toBe(0);
  });
  it("allows valid workflow input through to specialist execution", async () => {
    let calls = 0;
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => { calls++; return { ok: true }; } }
    ] });
    const result = await workflow.run({ query: "a",
      requests: [{ engine: "worker", payload: {} }], qualityChecks: checks });
    expect(result.status).toBe("completed");
    expect(calls).toBe(1);
  });
});
