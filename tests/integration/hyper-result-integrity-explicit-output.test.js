import { describe, expect, it } from "vitest";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
const gate = createFiveEngineResultIntegrityGate();
const result = (entry) => ({
  status: "completed",
  semantic: { ranked: [] },
  reasoning: { facts: [], steps: [] },
  plan: { steps: [] },
  quality: { accepted: true },
  coordination: { completed: 1, failed: 0, results: [entry] },
  executionAttempted: true
});
describe("Hyper XSUS Core — result integrity explicit output contract", () => {
  it("rejects completed specialist result with absent output", () => {
    const verdict = gate.verify(result({ engine: "semantic", status: "completed" }));
    expect(verdict.valid).toBe(false);
    expect(verdict.errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
  });
  it("rejects completed specialist result with undefined output", () => {
    const verdict = gate.verify(result({ engine: "semantic", status: "completed", output: undefined }));
    expect(verdict.valid).toBe(false);
    expect(verdict.errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
  });
  it("accepts completed specialist result with explicit null output", () => {
    const verdict = gate.verify(result({ engine: "semantic", status: "completed", output: null }));
    expect(verdict.valid).toBe(true);
  });
  it("accepts completed specialist result with structured output", () => {
    const verdict = gate.verify(result({ engine: "semantic", status: "completed", output: { ok: true } }));
    expect(verdict.valid).toBe(true);
  });
  it("rejects failed specialist result with non-null output", () => {
    const input = result({ engine: "semantic", status: "failed", output: { ok: false } });
    input.status = "degraded";
    input.coordination.completed = 0;
    input.coordination.failed = 1;
    const verdict = gate.verify(input);
    expect(verdict.valid).toBe(false);
    expect(verdict.errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
  });
  it("accepts failed specialist result with null output", () => {
    const input = result({ engine: "semantic", status: "failed", output: null });
    input.status = "degraded";
    input.coordination.completed = 0;
    input.coordination.failed = 1;
    expect(gate.verify(input).valid).toBe(true);
  });
});
