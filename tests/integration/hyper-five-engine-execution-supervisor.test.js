import { describe, expect, it } from "vitest";
import { createFiveEngineExecutionSupervisor } from "../../src/hyper-xsus-core/cross-cutting/five-engine-execution-supervisor.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const checks = ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
const request = { query: "secret phrase", qualityChecks: checks,
  requests: [{ engine: "worker", payload: {} }] };
const workflow = execute => createFiveEngineWorkflow({ engines: [{ name: "worker", execute }] });
describe("Hyper XSUS Core — execution supervisor integration", () => {
  it("validates a successful workflow and emits private counters", async () => {
    const supervisor = createFiveEngineExecutionSupervisor({
      workflow: workflow(async () => ({ ok: true }))
    });
    const output = await supervisor.run(request);
    expect(output.result.status).toBe("completed");
    expect(output.diagnostics).toMatchObject({ status: "completed", enginesCompleted: 1 });
    expect(JSON.stringify(output.diagnostics)).not.toContain("secret phrase");
    expect(supervisor.stats()).toMatchObject({ verified: 1, failed: 0, active: 0, retriesPerformed: 0 });
  });
  it("admits a degraded result with isolated engine failure", async () => {
    const supervisor = createFiveEngineExecutionSupervisor({
      workflow: workflow(async () => { throw Error("private-secret"); })
    });
    const output = await supervisor.run(request);
    expect(output.result.status).toBe("degraded");
    expect(output.diagnostics.enginesFailed).toBe(1);
    expect(JSON.stringify(output.diagnostics)).not.toContain("private-secret");
  });
  it("rejects an over-budget request before specialist execution", async () => {
    let calls = 0;
    const supervisor = createFiveEngineExecutionSupervisor({
      workflow: workflow(async () => { calls++; return {}; }),
      budget: { maxRequests: 0 }
    });
    await expect(supervisor.run(request)).rejects.toThrow("requests");
    expect(calls).toBe(0);
    expect(supervisor.stats().accepted).toBe(0);
  });
  it("rejects forged result state and records failure", async () => {
    const supervisor = createFiveEngineExecutionSupervisor({ workflow: {
      async run() { return { status: "completed", semantic: { ranked: [] },
        reasoning: { facts: [], steps: [] }, plan: { steps: [] },
        quality: { accepted: true }, coordination: {
          results: [{ status: "failed" }], completed: 0, failed: 1
        }, executionAttempted: true }; }
    } });
    await expect(supervisor.run({ query: "x" })).rejects.toMatchObject({
      code: "HYPER_SUPERVISOR_INTEGRITY_FAILED"
    });
    expect(supervisor.stats()).toMatchObject({ verified: 0, failed: 1, active: 0 });
  });
  it("limits simultaneous supervised workflows and recovers capacity", async () => {
    let release;
    const wait = new Promise(resolve => { release = resolve; });
    const supervisor = createFiveEngineExecutionSupervisor({
      maxConcurrent: 1, workflow: workflow(async () => { await wait; return {}; })
    });
    const first = supervisor.run(request);
    await expect(supervisor.run(request)).rejects.toMatchObject({
      code: "HYPER_WORKFLOW_CAPACITY_EXCEEDED"
    });
    release();
    await expect(first).resolves.toHaveProperty("diagnostics.status", "completed");
    expect(supervisor.stats()).toMatchObject({ active: 0, verified: 1, failed: 1, rejected: 1 });
  });
  it("preserves quality rejection without invoking specialist", async () => {
    let calls = 0;
    const supervisor = createFiveEngineExecutionSupervisor({
      workflow: workflow(async () => { calls++; return {}; })
    });
    const output = await supervisor.run({ ...request, qualityChecks: [] });
    expect(output.diagnostics.status).toBe("quality-rejected");
    expect(calls).toBe(0);
  });
  it("rejects invalid configuration", () => {
    expect(() => createFiveEngineExecutionSupervisor({ workflow: {} })).toThrow("configuration");
    expect(() => createFiveEngineExecutionSupervisor({
      workflow: { run() {} }, maxConcurrent: 0
    })).toThrow("configuration");
  });
});
