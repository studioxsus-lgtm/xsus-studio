import { describe, expect, it } from "vitest";
import { createSemanticEvidenceAnalyzer } from "../../src/hyper-xsus-core/cross-cutting/semantic-evidence-analyzer.js";
const analyzer = createSemanticEvidenceAnalyzer();
describe("Hyper XSUS Core — semantic evidence descriptor isolation", () => {
  it("rejects evidence identifier getters without invoking them", () => {
    let reads = 0;
    const item = { text: "hello" };
    Object.defineProperty(item, "id", { get() { reads++; return "doc"; } });
    expect(() => analyzer.analyze({ query: "hello", evidence: [item] })).toThrow("entry");
    expect(reads).toBe(0);
  });
  it("rejects evidence text getters without invoking them", () => {
    let reads = 0;
    const item = { id: "doc" };
    Object.defineProperty(item, "text", { get() { reads++; return "hello"; } });
    expect(() => analyzer.analyze({ query: "hello", evidence: [item] })).toThrow("entry");
    expect(reads).toBe(0);
  });
  it("rejects evidence array element getters without invoking them", () => {
    let reads = 0;
    const evidence = [{ id: "doc", text: "hello" }];
    Object.defineProperty(evidence, "0", { get() { reads++; return {}; } });
    expect(() => analyzer.analyze({ query: "hello", evidence })).toThrow("entry");
    expect(reads).toBe(0);
  });
  it("rejects inherited evidence fields", () => {
    const item = Object.create({ id: "doc", text: "hello" });
    expect(() => analyzer.analyze({ query: "hello", evidence: [item] })).toThrow("entry");
  });
  it("accepts null-prototype evidence objects", () => {
    const item = Object.assign(Object.create(null), { id: "doc", text: "hello world" });
    const result = analyzer.analyze({ query: "hello", evidence: [item] });
    expect(result.ranked[0]).toMatchObject({ id: "doc", score: 1 });
    expect(result.semanticTruthVerified).toBe(false);
  });
  it("preserves deterministic ranking with multiple valid entries", () => {
    const result = analyzer.analyze({
      query: "hello world",
      evidence: [
        { id: "z", text: "hello" },
        { id: "a", text: "hello world" },
        { id: "b", text: "world" }
      ]
    });
    expect(result.ranked.map(entry => entry.id)).toEqual(["a","b","z"]);
  });
});
