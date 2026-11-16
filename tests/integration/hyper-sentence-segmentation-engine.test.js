import { describe, it, expect } from "vitest";
import { createSentenceSegmentationEngine } from "../../src/hyper-xsus-core/cross-cutting/sentence-segmentation-engine.js";
describe("Hyper sentence segmentation", () => {
  it("segments normalized multilingual punctuation", () => {
    const result = createSentenceSegmentationEngine().segment("Përshëndetje! Hello? Bonjour.");
    expect(result.sentences.map(s => s.text)).toEqual(["Përshëndetje!", "Hello?", "Bonjour."]);
    expect(result.sentences[0].start).toBe(0);
  });
  it("handles line boundaries and empty input", () => {
    const engine = createSentenceSegmentationEngine();
    expect(engine.segment("Një\nDy").sentences.map(s => s.text)).toEqual(["Një", "Dy"]);
    expect(engine.segment("").sentences).toEqual([]);
  });
  it("enforces bounds", () => {
    expect(() => createSentenceSegmentationEngine({ maxSentences: 1 }).segment("A. B.")).toThrow("limit");
  });
});
