import { describe, expect, it } from "vitest";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
const checks = ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
const input = { query: "alpha", qualityChecks: checks, requests: [{ engine: "worker", payload: {} }] };
describe("Hyper XSUS Core — mandatory result integrity on workflow exit", () => {
  it("returns a verified completed result", async () => {
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => ({ ok: true }) }
    ] });
    const result = await workflow.run(input);
    expect(result.status).toBe("completed");
    expect(createFiveEngineResultIntegrityGate().verify(result).valid).toBe(true);
  });
  it("returns a verified degraded result after isolated specialist failure", async () => {
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => { throw Error("private"); } }
    ] });
    const result = await workflow.run(input);
    expect(result.status).toBe("degraded");
    expect(createFiveEngineResultIntegrityGate().verify(result).valid).toBe(true);
  });
  it("returns a verified quality-rejected result without specialist execution", async () => {
    let calls = 0;
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => { calls++; return {}; } }
    ] });
    const result = await workflow.run({ ...input, qualityChecks: [] });
    expect(result.status).toBe("quality-rejected");
    expect(calls).toBe(0);
    expect(createFiveEngineResultIntegrityGate().verify(result).valid).toBe(true);
  });
  it("returns verified empty coordination when no specialist was requested", async () => {
    const workflow = createFiveEngineWorkflow({ engines: [
      { name: "worker", execute: async () => ({ ok: true }) }
    ] });
    const result = await workflow.run({ ...input, requests: [] });
    expect(result.status).toBe("completed");
    expect(result.executionAttempted).toBe(false);
    expect(createFiveEngineResultIntegrityGate().verify(result).valid).toBe(true);
  });
});
