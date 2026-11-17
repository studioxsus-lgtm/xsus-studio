import { describe, expect, it } from "vitest";
import { createFiveEngineExecutionSupervisor } from "../../src/hyper-xsus-core/cross-cutting/five-engine-execution-supervisor.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const checks = ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
const input = { query: "PRIVATE_QUERY", qualityChecks: checks, requests: [{ engine: "worker", payload: {} }] };
const workflow = execute => createFiveEngineWorkflow({ engines: [{ name: "worker", execute }] });
describe("Hyper XSUS Core — classified supervisor failure accounting", () => {
  it("classifies resource admission rejections", async () => {
    const s = createFiveEngineExecutionSupervisor({
      workflow: workflow(async () => ({})), budget: { maxRequests: 0 }
    });
    await expect(s.run(input)).rejects.toThrow("requests");
    expect(s.stats()).toMatchObject({ failed: 1, resourceRejected: 1,
      capacityRejected: 0, integrityRejected: 0, executionFailed: 0, active: 0 });
  });
  it("classifies capacity rejections and recovers after release", async () => {
    let release;
    const wait = new Promise(resolve => { release = resolve; });
    const s = createFiveEngineExecutionSupervisor({
      maxConcurrent: 1, workflow: workflow(async () => { await wait; return {}; })
    });
    const running = s.run(input);
    await expect(s.run(input)).rejects.toMatchObject({ code: "HYPER_WORKFLOW_CAPACITY_EXCEEDED" });
    release();
    await running;
    expect(s.stats()).toMatchObject({ failed: 1, capacityRejected: 1,
      resourceRejected: 0, integrityRejected: 0, executionFailed: 0, active: 0 });
  });
  it("classifies integrity failures without returning fabricated results", async () => {
    const s = createFiveEngineExecutionSupervisor({ workflow: {
      async run() { return { status: "completed", semantic: { ranked: [] },
        reasoning: { facts: [], steps: [] }, plan: { steps: [] },
        quality: { accepted: true }, coordination: {
          completed: 0, failed: 1, results: [{ status: "failed" }]
        }, executionAttempted: true }; }
    } });
    await expect(s.run({ query: "x" })).rejects.toMatchObject({
      code: "HYPER_SUPERVISOR_INTEGRITY_FAILED"
    });
    expect(s.stats()).toMatchObject({ failed: 1, integrityRejected: 1,
      resourceRejected: 0, capacityRejected: 0, executionFailed: 0 });
  });
  it("classifies workflow exceptions without exposing private messages", async () => {
    const s = createFiveEngineExecutionSupervisor({ workflow: {
      async run() { throw Error("PRIVATE_EXCEPTION"); }
    } });
    await expect(s.run({ query: "x" })).rejects.toThrow("PRIVATE_EXCEPTION");
    expect(s.stats()).toMatchObject({ failed: 1, executionFailed: 1,
      resourceRejected: 0, capacityRejected: 0, integrityRejected: 0, active: 0 });
    expect(JSON.stringify(s.stats())).not.toContain("PRIVATE_EXCEPTION");
  });
  it("preserves counters across successful and degraded workflows", async () => {
    const s = createFiveEngineExecutionSupervisor({
      workflow: workflow(async () => { throw Error("PRIVATE_SPECIALIST"); })
    });
    const result = await s.run(input);
    expect(result.result.status).toBe("degraded");
    expect(s.stats()).toMatchObject({ verified: 1, failed: 0,
      resourceRejected: 0, capacityRejected: 0, integrityRejected: 0, executionFailed: 0 });
    expect(JSON.stringify(s.stats())).not.toContain("PRIVATE_SPECIALIST");
  });
});
