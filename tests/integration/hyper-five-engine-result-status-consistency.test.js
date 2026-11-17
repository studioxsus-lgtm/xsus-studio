import { describe, expect, it } from "vitest";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
const gate = createFiveEngineResultIntegrityGate();
const base = () => ({
  status: "completed",
  semantic: { ranked: [] },
  reasoning: { facts: [], steps: [] },
  plan: { steps: [] },
  quality: { accepted: true },
  coordination: { completed: 1, failed: 0, results: [
    { engine: "semantic", status: "completed", output: {} }
  ] },
  executionAttempted: true
});
describe("Hyper XSUS Core — specialist result integrity consistency", () => {
  it("accepts consistent completed results", () => {
    expect(gate.verify(base()).valid).toBe(true);
  });
  it("rejects inconsistent per-engine completed counts", () => {
    const result = base();
    result.coordination.results[0].status = "failed";
    result.coordination.results[0].output = null;
    expect(gate.verify(result).errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
  });
  it("rejects duplicate specialist result names", () => {
    const result = base();
    result.coordination = { completed: 2, failed: 0, results: [
      { engine: "semantic", status: "completed", output: {} },
      { engine: "semantic", status: "completed", output: {} }
    ] };
    expect(gate.verify(result).errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
  });
  it("rejects failed specialist result with non-null output", () => {
    const result = base();
    result.status = "degraded";
    result.coordination = { completed: 0, failed: 1, results: [
      { engine: "semantic", status: "failed", output: {} }
    ] };
    expect(gate.verify(result).errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
  });
  it("rejects false execution flag for nonempty results", () => {
    const result = base();
    result.executionAttempted = false;
    expect(gate.verify(result).errors).toContain("EXECUTION_FLAG_INCONSISTENT");
  });
  it("rejects true execution flag for empty results", () => {
    const result = base();
    result.coordination = { completed: 0, failed: 0, results: [] };
    expect(gate.verify(result).errors).toContain("EXECUTION_FLAG_INCONSISTENT");
  });
  it("accepts empty successful coordination with false execution flag", () => {
    const result = base();
    result.coordination = { completed: 0, failed: 0, results: [] };
    result.executionAttempted = false;
    expect(gate.verify(result).valid).toBe(true);
  });
});
