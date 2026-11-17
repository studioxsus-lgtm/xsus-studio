import { describe, it, expect } from "vitest";
import { createFiveEngineResourceBudget } from "../../src/hyper-xsus-core/cross-cutting/five-engine-resource-budget.js";

describe("Hyper workflow resource budget — Unicode boundary", () => {
  const budget = createFiveEngineResourceBudget({ maxTextCodePoints: 3 });

  it("counts astral Unicode symbols as one code point", () => {
    const result = budget.check({ query: "A😀B" });
    expect(result.queryCodePoints).toBe(3);
    expect(result.accepted).toBe(true);
  });

  it("rejects the first code point beyond the limit", () => {
    expect(() => budget.check({ query: "A😀BC" }))
      .toThrow("Workflow query resource budget exceeded.");
  });

  it("rejects long text without changing its input", () => {
    const query = "😀".repeat(100000);
    expect(() => budget.check({ query }))
      .toThrow(RangeError);
    expect(query.length).toBe(200000);
  });

  it("accepts the zero-length boundary when configured", () => {
    const zero = createFiveEngineResourceBudget({ maxTextCodePoints: 0 });
    expect(zero.check({ query: "" }).queryCodePoints).toBe(0);
    expect(() => zero.check({ query: "x" })).toThrow(RangeError);
  });
});
