import { describe, expect, it } from "vitest";
import { createResponseEvaluationEngine } from "../../src/hyper-xsus-core/cross-cutting/response-evaluation-engine.js";
const evaluator = createResponseEvaluationEngine();
const checks = () => ["coherence","completeness","safety"].map(name => ({ name, score: 1 }));
describe("Hyper XSUS Core — response quality descriptor isolation", () => {
  it("rejects check field getters without invoking them", () => {
    for (const field of ["name","score"]) {
      let reads = 0;
      const input = checks();
      Object.defineProperty(input[0], field, { get() { reads++; return null; } });
      expect(() => evaluator.evaluate({ checks: input })).toThrow("check");
      expect(reads).toBe(0);
    }
  });
  it("rejects check array element getters without invoking them", () => {
    let reads = 0;
    const input = checks();
    Object.defineProperty(input, "0", { get() { reads++; return {}; } });
    expect(() => evaluator.evaluate({ checks: input })).toThrow("check");
    expect(reads).toBe(0);
  });
  it("rejects finding field getters without invoking them", () => {
    for (const field of ["code","severity"]) {
      let reads = 0;
      const finding = { code: "WARN", severity: "warning" };
      Object.defineProperty(finding, field, { get() { reads++; return "warning"; } });
      expect(() => evaluator.evaluate({ checks: checks(), findings: [finding] })).toThrow("finding");
      expect(reads).toBe(0);
    }
  });
  it("rejects finding array element getters without invoking them", () => {
    let reads = 0;
    const findings = [{ code: "WARN", severity: "warning" }];
    Object.defineProperty(findings, "0", { get() { reads++; return {}; } });
    expect(() => evaluator.evaluate({ checks: checks(), findings })).toThrow("finding");
    expect(reads).toBe(0);
  });
  it("rejects inherited check and finding fields", () => {
    expect(() => evaluator.evaluate({ checks: [
      Object.create({ name: "coherence", score: 1 }), ...checks().slice(1)
    ] })).toThrow("check");
    expect(() => evaluator.evaluate({ checks: checks(), findings: [
      Object.create({ code: "WARN", severity: "warning" })
    ] })).toThrow("finding");
  });
  it("preserves valid quality scores and error rejection", () => {
    const accepted = evaluator.evaluate({ checks: checks() });
    expect(accepted).toMatchObject({ accepted: true, overallScore: 1, factualAccuracyVerified: false });
    const rejected = evaluator.evaluate({ checks: checks(), findings: [
      { code: "ERROR", severity: "error" }
    ] });
    expect(rejected).toMatchObject({ accepted: false, errorCount: 1 });
  });
  it("accepts null-prototype quality records", () => {
    const input = checks().map(c => Object.assign(Object.create(null), c));
    const result = evaluator.evaluate({ checks: input });
    expect(result.accepted).toBe(true);
  });
});
