import { describe, expect, it } from "vitest";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
const gate = createFiveEngineResultIntegrityGate();
const input = steps => ({
  status: "quality-rejected",
  semantic: { ranked: [] },
  reasoning: { facts: [], steps: [] },
  plan: { steps },
  quality: { accepted: false },
  coordination: null,
  executionAttempted: false
});
describe("Hyper XSUS Core — bounded plan result verification", () => {
  it("rejects oversized plan without reading its elements", () => {
    const steps = new Array(10001);
    let reads = 0;
    Object.defineProperty(steps, "0", { get() { reads++; return { id: "a" }; } });
    const verdict = gate.verify(input(steps));
    expect(verdict.valid).toBe(false);
    expect(verdict.errors).toContain("PLAN_STEPS_INCONSISTENT");
    expect(reads).toBe(0);
  });
  it("accepts normal bounded plan", () => {
    expect(gate.verify(input([{ id: "a" }, { id: "b" }])).valid).toBe(true);
  });
  it("rejects sparse plan within bound", () => {
    const verdict = gate.verify(input(new Array(3)));
    expect(verdict.errors).toContain("PLAN_STEPS_INCONSISTENT");
  });
});
