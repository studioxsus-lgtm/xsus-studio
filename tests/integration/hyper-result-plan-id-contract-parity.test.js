import { describe, expect, it } from "vitest";
import { createFiveEngineResultIntegrityGate } from "../../src/hyper-xsus-core/cross-cutting/five-engine-result-integrity-gate.js";
const gate = createFiveEngineResultIntegrityGate();
const result = id => ({
  status: "quality-rejected",
  semantic: { ranked: [] },
  reasoning: { facts: [], steps: [] },
  plan: { steps: [{ id }] },
  quality: { accepted: false },
  coordination: null,
  executionAttempted: false
});
describe("Hyper XSUS Core — plan step ID contract parity", () => {
  it.each(["", " ", "-leading", "_leading", "with spaces", "unicode-ë", "x".repeat(129)])(
    "rejects invalid plan step ID %j", id => {
      const verdict = gate.verify(result(id));
      expect(verdict.valid).toBe(false);
      expect(verdict.errors).toContain("PLAN_STEPS_INCONSISTENT");
    }
  );
  it.each(["a", "A_1", "task:stage-2", "x".repeat(128)])(
    "accepts valid plan step ID %j", id => {
      expect(gate.verify(result(id)).valid).toBe(true);
    }
  );
});
