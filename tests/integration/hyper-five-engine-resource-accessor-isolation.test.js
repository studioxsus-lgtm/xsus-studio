import { describe, expect, it } from "vitest";
import { createFiveEngineResourceBudget } from "../../src/hyper-xsus-core/cross-cutting/five-engine-resource-budget.js";
import { createFiveEngineExecutionSupervisor } from "../../src/hyper-xsus-core/cross-cutting/five-engine-execution-supervisor.js";
const budget = createFiveEngineResourceBudget();
describe("Hyper XSUS Core — resource admission accessor isolation", () => {
  it("does not invoke query getters", () => {
    let reads = 0;
    const input = {};
    Object.defineProperty(input, "query", { get() { reads++; return "secret"; } });
    expect(() => budget.check(input)).toThrow("accessor");
    expect(reads).toBe(0);
  });
  it("does not invoke resource collection getters", () => {
    for (const name of ["evidence","facts","rules","tasks","requests"]) {
      let reads = 0;
      const input = { query: "hello" };
      Object.defineProperty(input, name, { get() { reads++; return []; } });
      expect(() => budget.check(input)).toThrow("accessor");
      expect(reads).toBe(0);
    }
  });
  it("does not read inherited resource fields", () => {
    const input = Object.create({ evidence: Array.from({ length: 100 }, () => ({})) });
    input.query = "hello";
    expect(budget.check(input).counts.evidence).toBe(0);
  });
  it("accepts ordinary valid requests and preserves counts", () => {
    const result = budget.check({ query: "hello", evidence: [{}], facts: ["a"], requests: [{}] });
    expect(result).toMatchObject({
      accepted: true, totalItems: 3, queryCodePoints: 5,
      counts: { evidence: 1, facts: 1, rules: 0, tasks: 0, requests: 1 }
    });
  });
  it("prevents a supervisor from invoking a workflow on accessor-bearing input", async () => {
    let calls = 0, reads = 0;
    const supervisor = createFiveEngineExecutionSupervisor({ workflow: {
      async run() { calls++; return {}; }
    } });
    const input = { query: "hello" };
    Object.defineProperty(input, "requests", { get() { reads++; return []; } });
    await expect(supervisor.run(input)).rejects.toThrow("accessor");
    expect(reads).toBe(0);
    expect(calls).toBe(0);
    expect(supervisor.stats()).toMatchObject({
      accepted: 0, resourceRejected: 1, failed: 1
    });
  });
});
