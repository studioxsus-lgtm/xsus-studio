import { describe, expect, it } from "vitest";
import { createMultiStepReasoningEngine } from "../../src/hyper-xsus-core/cross-cutting/multi-step-reasoning-engine.js";
const engine = createMultiStepReasoningEngine();
const rule = () => ({ id: "r1", conclusion: "ready", premises: ["base"] });
describe("Hyper XSUS Core — reasoning input descriptor isolation", () => {
  it("rejects fact array accessors without invoking them", () => {
    let reads = 0;
    const facts = ["base"];
    Object.defineProperty(facts, "0", { get() { reads++; return "base"; } });
    expect(() => engine.reason({ facts })).toThrow("fact");
    expect(reads).toBe(0);
  });
  it("rejects rule array accessors without invoking them", () => {
    let reads = 0;
    const rules = [rule()];
    Object.defineProperty(rules, "0", { get() { reads++; return rule(); } });
    expect(() => engine.reason({ facts: ["base"], rules })).toThrow("rule");
    expect(reads).toBe(0);
  });
  it("rejects rule field accessors without invoking them", () => {
    for (const field of ["id", "conclusion", "premises"]) {
      let reads = 0;
      const item = rule();
      Object.defineProperty(item, field, { get() { reads++; return null; } });
      expect(() => engine.reason({ facts: ["base"], rules: [item] })).toThrow("rule");
      expect(reads).toBe(0);
    }
  });
  it("rejects premise array accessors without invoking them", () => {
    let reads = 0;
    const item = rule();
    Object.defineProperty(item.premises, "0", { get() { reads++; return "base"; } });
    expect(() => engine.reason({ facts: ["base"], rules: [item] })).toThrow("premise");
    expect(reads).toBe(0);
  });
  it("rejects inherited rule fields", () => {
    expect(() => engine.reason({
      facts: ["base"], rules: [Object.create(rule())]
    })).toThrow("rule");
  });
  it("preserves fixed-round inference and provenance", () => {
    const result = engine.reason({ facts: ["base"], rules: [rule()] });
    expect(result.facts).toEqual(["base", "ready"]);
    expect(result.steps).toEqual([{ ruleId: "r1", conclusion: "ready", premises: ["base"] }]);
    expect(result.provenance).toContainEqual({
      fact: "ready", source: "derived", ruleId: "r1"
    });
  });
  it("accepts null-prototype rules with own data fields", () => {
    const item = Object.assign(Object.create(null), rule());
    const result = engine.reason({ facts: ["base"], rules: [item] });
    expect(result.facts).toContain("ready");
  });
});
