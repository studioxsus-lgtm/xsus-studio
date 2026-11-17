import { describe, expect, it } from "vitest";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
const gate = createFiveEngineResultIntegrityGate();
const make = entry => ({
  status: "completed",
  semantic: { ranked: [] },
  reasoning: { facts: [], steps: [] },
  plan: { steps: [] },
  quality: { accepted: true },
  coordination: { completed: 1, failed: 0, results: [entry] },
  executionAttempted: true
});
const valid = () => ({ engine: "semantic", status: "completed", output: { ok: true } });
describe("Hyper XSUS Core — specialist result descriptor integrity", () => {
  it("rejects specialist field getters without invoking them", () => {
    for (const field of ["engine", "status", "output"]) {
      let reads = 0;
      const entry = valid();
      Object.defineProperty(entry, field, { get() { reads++; return "completed"; } });
      const verdict = gate.verify(make(entry));
      expect(verdict.valid).toBe(false);
      expect(verdict.errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
      expect(reads).toBe(0);
    }
  });
  it("rejects specialist result array getters without invoking them", () => {
    let reads = 0;
    const input = make(valid());
    Object.defineProperty(input.coordination.results, "0", {
      get() { reads++; return valid(); }
    });
    const verdict = gate.verify(input);
    expect(verdict.valid).toBe(false);
    expect(verdict.errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
    expect(reads).toBe(0);
  });
  it("rejects inherited specialist result fields", () => {
    const verdict = gate.verify(make(Object.create(valid())));
    expect(verdict.valid).toBe(false);
    expect(verdict.errors).toContain("COORDINATION_RESULTS_INCONSISTENT");
  });
  it("accepts null-prototype specialist results", () => {
    const verdict = gate.verify(make(Object.assign(Object.create(null), valid())));
    expect(verdict.valid).toBe(true);
  });
  it("preserves valid result and failed result contracts", () => {
    expect(gate.verify(make(valid())).valid).toBe(true);
    const input = make({ engine: "semantic", status: "failed", output: null });
    input.status = "degraded";
    input.coordination.completed = 0;
    input.coordination.failed = 1;
    expect(gate.verify(input).valid).toBe(true);
  });
});
