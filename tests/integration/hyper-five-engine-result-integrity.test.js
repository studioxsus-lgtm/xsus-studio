import { describe, expect, it } from "vitest";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
import { createFiveEngineWorkflow } from "../../src/hyper-xsus-core/cross-cutting/five-engine-workflow.js";
const qualityChecks = ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
const input = { query: "alpha", requests: [{ engine: "worker", payload: {} }], qualityChecks };
const make = execute => createFiveEngineWorkflow({ engines: [{ name: "worker", execute }] });
describe("Hyper XSUS Core — five-engine result integrity", () => {
  it("accepts a completed five-engine workflow", async () => {
    const result = await make(async () => ({ ok: true })).run(input);
    expect(createFiveEngineResultIntegrityGate().verify(result)).toMatchObject({
      valid: true, errors: [], factualTruthVerified: false, provenanceAuthenticated: false
    });
  });
  it("accepts a degraded workflow with isolated specialist failure", async () => {
    const result = await make(async () => { throw Error("secret"); }).run(input);
    expect(result.status).toBe("degraded");
    expect(createFiveEngineResultIntegrityGate().verify(result).valid).toBe(true);
  });
  it("accepts a quality-rejected workflow with no execution", async () => {
    const result = await make(async () => ({ ok: true })).run({
      ...input, qualityChecks: []
    });
    expect(createFiveEngineResultIntegrityGate().verify(result).valid).toBe(true);
  });
  it("rejects forged success with failed specialist", async () => {
    const result = await make(async () => { throw Error("secret"); }).run(input);
    const forged = { ...result, status: "completed" };
    expect(createFiveEngineResultIntegrityGate().verify(forged).errors).toContain("STATUS_INCONSISTENT");
  });
  it("rejects fabricated coordination counts", async () => {
    const result = await make(async () => ({ ok: true })).run(input);
    const forged = { ...result, coordination: { ...result.coordination, completed: 10 } };
    expect(createFiveEngineResultIntegrityGate().verify(forged).errors).toContain("COORDINATION_INCONSISTENT");
  });
  it("rejects quality rejection with a claimed execution", async () => {
    const result = await make(async () => ({ ok: true })).run({ ...input, qualityChecks: [] });
    expect(createFiveEngineResultIntegrityGate().verify({
      ...result, executionAttempted: true
    }).errors).toContain("QUALITY_REJECTION_INCONSISTENT");
  });
  it("rejects duplicate plan step IDs", async () => {
    const result = await make(async () => ({ ok: true })).run(input);
    const forged = { ...result, plan: { steps: [{ id: "same" }, { id: "same" }] } };
    expect(createFiveEngineResultIntegrityGate().verify(forged).errors).toContain("PLAN_STEPS_INCONSISTENT");
  });
  it("rejects invalid input and invalid configuration", () => {
    expect(() => createFiveEngineResultIntegrityGate().verify(null)).toThrow("result");
    expect(() => createFiveEngineResultIntegrityGate({ maxResults: 0 })).toThrow("configuration");
  });
});
