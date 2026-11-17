import { describe, expect, it } from "vitest";
import { createFiveEngineExecutionSupervisor } from "../../src/hyper-xsus-core/cross-cutting/five-engine-execution-supervisor.js";
const input = { query: "private" };
const make = run => createFiveEngineExecutionSupervisor({ workflow: { run } });
describe("Hyper XSUS Core — supervisor recovery and failure attribution", () => {
  it("does not mistake a forged capacity error from a workflow for admission rejection", async () => {
    const s = make(async () => {
      const error = new Error("private");
      error.code = "HYPER_WORKFLOW_CAPACITY_EXCEEDED";
      throw error;
    });
    await expect(s.run(input)).rejects.toMatchObject({
      code: "HYPER_WORKFLOW_CAPACITY_EXCEEDED"
    });
    expect(s.stats()).toMatchObject({
      accepted: 1, rejected: 0, capacityRejected: 0,
      executionFailed: 1, failed: 1, active: 0
    });
  });
  it("recovers after repeated synchronous workflow exceptions", async () => {
    let calls = 0;
    const s = make(() => {
      calls++;
      if (calls < 10) throw Error("private");
      return {
        status: "quality-rejected",
        semantic: { ranked: [] },
        reasoning: { facts: [], steps: [] },
        plan: { steps: [] },
        quality: { accepted: false },
        coordination: null,
        executionAttempted: false
      };
    });
    for (let i = 0; i < 9; i++) await expect(s.run(input)).rejects.toThrow("private");
    const recovered = await s.run(input);
    expect(recovered.result.status).toBe("quality-rejected");
    expect(s.stats()).toMatchObject({
      active: 0, accepted: 10, failed: 9, executionFailed: 9, verified: 1
    });
  });
  it("keeps failure counters consistent across admission, execution and integrity failures", async () => {
    const s = make(async () => { throw Error("private"); });
    await expect(s.run({ query: 17 })).rejects.toThrow();
    await expect(s.run(input)).rejects.toThrow("private");
    const stats = s.stats();
    expect(stats.failed).toBe(
      stats.resourceRejected + stats.capacityRejected +
      stats.integrityRejected + stats.executionFailed
    );
    expect(stats).toMatchObject({
      resourceRejected: 1, executionFailed: 1, failed: 2, active: 0
    });
    expect(JSON.stringify(stats)).not.toContain("private");
  });
});
