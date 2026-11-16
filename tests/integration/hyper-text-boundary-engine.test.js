import { describe, it, expect } from "vitest";
import { createTextBoundaryEngine } from "../../src/hyper-xsus-core/cross-cutting/text-boundary-engine.js";
describe("Hyper Core text boundary", () => {
  it("normalizes composed Unicode and line endings", () => {
    expect(createTextBoundaryEngine().normalize("e\u0308\r\nshqip").text).toBe("ë\nshqip");
  });
  it("counts supplementary Unicode code points", () => {
    expect(createTextBoundaryEngine({ maxCodePoints: 1 }).normalize("😀").codePoints).toBe(1);
  });
  it("rejects prohibited controls and invalid surrogates", () => {
    const e = createTextBoundaryEngine();
    expect(() => e.normalize("x\u0000")).toThrow("control");
    expect(() => e.normalize("\ud800")).toThrow("surrogate");
  });
  it("enforces code point limits", () => {
    expect(() => createTextBoundaryEngine({ maxCodePoints: 1 }).normalize("ab")).toThrow("limit");
  });
});
