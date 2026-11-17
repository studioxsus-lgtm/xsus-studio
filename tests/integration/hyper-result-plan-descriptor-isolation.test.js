import { describe, expect, it } from "vitest";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
const gate = createFiveEngineResultIntegrityGate();
const make = steps => ({
  status: "quality-rejected",
  semantic: { ranked: [] },
  reasoning: { facts: [], steps: [] },
  plan: { steps },
  quality: { accepted: false },
  coordination: null,
  executionAttempted: false
});
describe("Hyper XSUS Core — plan result descriptor isolation", () => {
  it("rejects plan step slot getter without invocation", () => {
    let reads = 0;
    const steps = [{ id: "first" }];
    Object.defineProperty(steps, "0", { get() { reads++; return { id: "first" }; } });
    const verdict = gate.verify(make(steps));
    expect(verdict.valid).toBe(false);
    expect(verdict.errors).toContain("PLAN_STEPS_INCONSISTENT");
    expect(reads).toBe(0);
  });
  it("rejects step id getter without invocation", () => {
    let reads = 0;
    const step = {};
    Object.defineProperty(step, "id", { get() { reads++; return "first"; } });
    const verdict = gate.verify(make([step]));
    expect(verdict.valid).toBe(false);
    expect(verdict.errors).toContain("PLAN_STEPS_INCONSISTENT");
    expect(reads).toBe(0);
  });
  it("rejects inherited step id", () => {
    const verdict = gate.verify(make([Object.create({ id: "first" })]));
    expect(verdict.errors).toContain("PLAN_STEPS_INCONSISTENT");
  });
  it("rejects duplicate step ids", () => {
    const verdict = gate.verify(make([{ id: "first" }, { id: "first" }]));
    expect(verdict.errors).toContain("PLAN_STEPS_INCONSISTENT");
  });
  it("accepts null-prototype step with own id", () => {
    const step = Object.assign(Object.create(null), { id: "first" });
    expect(gate.verify(make([step])).valid).toBe(true);
  });
  it("accepts ordinary distinct plan steps", () => {
    expect(gate.verify(make([{ id: "first" }, { id: "second" }])).valid).toBe(true);
  });
});
