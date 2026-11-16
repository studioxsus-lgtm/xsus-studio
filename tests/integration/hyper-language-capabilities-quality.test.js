import { describe, expect, it } from "vitest";
import { createLanguageCapabilityRegistry } from "../../src/hyper-xsus-core/cross-cutting/language-capability-registry.js";
import { createLanguageQualityGate } from "../../src/hyper-xsus-core/cross-cutting/language-quality-gate.js";
describe("Hyper XSUS Core — language capability registry", () => {
  const registry = createLanguageCapabilityRegistry({ registrations: [
    { language: "sq", engine: "sq-grammar", capabilities: ["grammar", "evaluation"] },
    { language: "en", engine: "en-grammar", capabilities: ["grammar", "syntax"] },
    { language: "sq", engine: "sq-syntax", capabilities: ["syntax"] }
  ] });
  it("resolves only declared capabilities and isolates languages", () => {
    expect(registry.resolve({ language: "sq", capability: "grammar" })).toEqual(["sq-grammar"]);
    expect(registry.resolve({ language: "sq", capability: "syntax" })).toEqual(["sq-syntax"]);
    expect(registry.resolve({ language: "fr", capability: "grammar" })).toEqual([]);
    expect(registry.supports({ language: "en", capability: "morphology" })).toBe(false);
  });
  it("returns frozen deterministic snapshots", () => {
    expect(registry.list().map(x => x.engine)).toEqual(["en-grammar", "sq-grammar", "sq-syntax"]);
    expect(Object.isFrozen(registry.list()[0].capabilities)).toBe(true);
  });
  it("rejects duplicates, invalid capabilities and malformed language codes", () => {
    expect(() => createLanguageCapabilityRegistry({ registrations: [
      { language: "sq", engine: "x", capabilities: ["grammar"] },
      { language: "sq", engine: "x", capabilities: ["syntax"] }
    ] })).toThrow("Duplicate");
    expect(() => createLanguageCapabilityRegistry({ registrations: [
      { language: "sq", engine: "x", capabilities: ["magic"] }
    ] })).toThrow("Invalid");
    expect(() => registry.resolve({ language: "../sq", capability: "grammar" })).toThrow("Invalid");
  });
});
describe("Hyper XSUS Core — evidence-based language quality gate", () => {
  const gate = createLanguageQualityGate();
  it("accepts complete threshold-satisfying evidence", () => {
    const result = gate.evaluate({ checks: [
      { name: "grammar", score: 0.9 }, { name: "syntax", score: 0.8 }
    ] });
    expect(result).toMatchObject({ passed: true, status: "accepted", linguisticAccuracyVerified: false });
    expect(Object.isFrozen(result.scores)).toBe(true);
  });
  it("rejects missing and low-score required checks", () => {
    const result = gate.evaluate({ checks: [{ name: "grammar", score: 0.5 }] });
    expect(result.passed).toBe(false);
    expect(result.missingChecks).toEqual(["syntax"]);
    expect(result.belowThreshold).toEqual(["grammar"]);
  });
  it("rejects explicit error findings even when scores pass", () => {
    const result = gate.evaluate({ checks: [
      { name: "grammar", score: 1 }, { name: "syntax", score: 1 }
    ], findings: [{ code: "UNSAFE_OUTPUT", severity: "error" }] });
    expect(result.passed).toBe(false);
    expect(result.errorCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain("userText");
  });
  it("rejects malformed, duplicate or nonfinite evidence", () => {
    expect(() => gate.evaluate({ checks: [{ name: "grammar", score: NaN }] })).toThrow("Invalid");
    expect(() => gate.evaluate({ checks: [
      { name: "syntax", score: 1 }, { name: "syntax", score: 1 }
    ] })).toThrow("Invalid");
  });
});
