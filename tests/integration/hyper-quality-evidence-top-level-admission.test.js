import { describe, expect, it } from "vitest";
import { createLanguageQualityGate } from "../../src/hyper-xsus-core/cross-cutting/language-quality-gate.js";
import { createResponseEvaluationEngine } from "../../src/hyper-xsus-core/cross-cutting/response-evaluation-engine.js";
const checks = () => ["coherence", "completeness", "safety"].map(name => ({ name, score: 1 }));
describe("Hyper XSUS Core — quality evidence top-level admission", () => {
  it("does not invoke top-level checks accessor", () => {
    let reads = 0;
    const input = {};
    Object.defineProperty(input, "checks", { get() { reads++; return checks(); } });
    expect(() => createResponseEvaluationEngine().evaluate(input)).toThrow("accessor");
    expect(reads).toBe(0);
  });
  it("does not invoke top-level findings accessor", () => {
    let reads = 0;
    const input = { checks: checks() };
    Object.defineProperty(input, "findings", { get() { reads++; return []; } });
    expect(() => createResponseEvaluationEngine().evaluate(input)).toThrow("accessor");
    expect(reads).toBe(0);
  });
  it("rejects inherited and array-shaped top-level evidence", () => {
    const gate = createLanguageQualityGate({ requiredChecks: ["safety"] });
    expect(() => gate.evaluate(Object.create({ checks: [{ name: "safety", score: 1 }] }))).toThrow("evidence");
    expect(() => gate.evaluate([])).toThrow("evidence");
    expect(() => gate.evaluate(null)).toThrow("evidence");
  });
  it("accepts own data fields on null-prototype input", () => {
    const input = Object.assign(Object.create(null), { checks: checks(), findings: [] });
    const result = createResponseEvaluationEngine().evaluate(input);
    expect(result).toMatchObject({ accepted: true, overallScore: 1 });
  });
  it("continues to reject missing required checks without inventing scores", () => {
    const result = createResponseEvaluationEngine().evaluate({ checks: [
      { name: "coherence", score: 1 }, { name: "completeness", score: 1 }
    ] });
    expect(result.accepted).toBe(false);
    expect(result.missingChecks).toContain("safety");
  });
});
