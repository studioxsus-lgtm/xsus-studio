import { describe, it, expect } from "vitest";
import { createStructuredOutputGuard } from "../../src/hyper-xsus-core/cross-cutting/structured-output-guard.js";
describe("Hyper structured output guard", () => {
  it("clones and freezes valid nested output", () => {
    const original = { answer: "ok", items: [{ score: 1 }] };
    const result = createStructuredOutputGuard().validate(original);
    expect(result.items[0].score).toBe(1);
    expect(Object.isFrozen(result.items[0])).toBe(true);
    original.items[0].score = 99;
    expect(result.items[0].score).toBe(1);
  });
  it("rejects cyclic values and unsafe keys", () => {
    const cyclic = {}; cyclic.self = cyclic;
    const guard = createStructuredOutputGuard();
    expect(() => guard.validate(cyclic)).toThrow("Invalid");
    const unsafe = JSON.parse('{"__proto__":{"admin":true}}');
    expect(() => guard.validate(unsafe)).toThrow("Unsafe");
  });
  it("rejects excessive depth and nonfinite numbers", () => {
    const guard = createStructuredOutputGuard({ maxDepth: 1 });
    expect(() => guard.validate({ a: { b: 1 } })).toThrow("limit");
    expect(() => guard.validate({ a: Infinity })).toThrow("Invalid");
  });
  it("rejects invalid configurations", () => {
    expect(() => createStructuredOutputGuard({ maxNodes: 0 })).toThrow("configuration");
  });
});
