import { describe, expect, it } from "vitest";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
const gate = createFiveEngineResultIntegrityGate();
const base = () => ({
  status: "quality-rejected",
  semantic: { ranked: [] },
  reasoning: { facts: [], steps: [] },
  plan: { steps: [] },
  quality: { accepted: false },
  coordination: null,
  executionAttempted: false
});
describe("Hyper XSUS Core — workflow result envelope descriptor admission", () => {
  it("rejects each top-level accessor without invoking it", () => {
    for (const name of Object.keys(base())) {
      let reads = 0;
      const input = base();
      Object.defineProperty(input, name, { get() { reads++; return null; } });
      expect(() => gate.verify(input)).toThrow("Invalid five-engine result");
      expect(reads).toBe(0);
    }
  });
  it("rejects nested stage accessors without invoking them", () => {
    for (const [stage, name] of [
      ["semantic", "ranked"], ["reasoning", "facts"],
      ["reasoning", "steps"], ["plan", "steps"], ["quality", "accepted"]
    ]) {
      let reads = 0;
      const input = base();
      Object.defineProperty(input[stage], name, { get() { reads++; return []; } });
      expect(() => gate.verify(input)).toThrow("Invalid five-engine result");
      expect(reads).toBe(0);
    }
  });
  it("rejects coordination accessors without invoking them", () => {
    for (const name of ["completed", "failed", "results"]) {
      let reads = 0;
      const input = base();
      input.status = "completed";
      input.quality.accepted = true;
      input.coordination = { completed: 0, failed: 0, results: [] };
      Object.defineProperty(input.coordination, name, { get() { reads++; return 0; } });
      expect(() => gate.verify(input)).toThrow("Invalid five-engine result");
      expect(reads).toBe(0);
    }
  });
  it("preserves valid quality rejection", () => {
    expect(gate.verify(base()).valid).toBe(true);
  });
  it("preserves coordination inconsistency verdict for null coordination", () => {
    const input = base();
    input.status = "completed";
    input.quality.accepted = true;
    expect(gate.verify(input).errors).toContain("COORDINATION_INCONSISTENT");
  });
});
