import { describe, expect, it } from "vitest";
import { createUnicodeTokenizationEngine } from "../../src/hyper-xsus-core/cross-cutting/unicode-tokenization-engine.js";
import { createWrittenLanguagePipeline } from "../../src/hyper-xsus-core/cross-cutting/written-language-pipeline.js";
describe("Hyper XSUS Core — Unicode tokenizer integration", () => {
  it("tokenizes Albanian apostrophes, numbers and punctuation with offsets", () => {
    const result = createUnicodeTokenizationEngine().tokenize("S'ka 12,50 €!");
    expect(result.tokens.map(t => [t.value, t.kind])).toEqual([
      ["S'ka", "word"], ["12,50", "number"], ["€", "symbol"], ["!", "symbol"]
    ]);
    for (const token of result.tokens)
      expect(result.normalizedText.slice(token.start, token.end)).toBe(token.value);
  });
  it("supports Unicode supplementary symbols with UTF-16 offsets", () => {
    const result = createUnicodeTokenizationEngine().tokenize("Hi 😀!");
    expect(result.tokens.map(t => t.value)).toEqual(["Hi", "😀", "!"]);
    expect(result.tokens[1]).toMatchObject({ start: 3, end: 5 });
  });
  it("rejects excessive tokens without partial success", () => {
    expect(() => createUnicodeTokenizationEngine({ maxTokens: 2 })
      .tokenize("one two three")).toThrow("token limit");
  });
  it("integrates tokens into written-language pipeline output", async () => {
    const pipeline = createWrittenLanguagePipeline({ engines: [
      { name: "en", supports: () => true, process: async () => ({ ok: true }) }
    ] });
    const result = await pipeline.process({ text: "Hello, world!" });
    expect(result.tokens.map(t => t.value)).toEqual(["Hello", ",", "world", "!"]);
    expect(result.tokenCount).toBe(4);
    expect(Object.isFrozen(result.tokens)).toBe(true);
  });
  it("prevents engine dispatch when token limit is exceeded", async () => {
    let calls = 0;
    const pipeline = createWrittenLanguagePipeline({ maxTokens: 1, engines: [
      { name: "en", supports: () => true, process: async () => { calls++; return { ok: true }; } }
    ] });
    await expect(pipeline.process({ text: "Hello world" })).rejects.toThrow("token limit");
    expect(calls).toBe(0);
  });
});
