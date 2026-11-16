import { describe, expect, it } from "vitest";
import { createWrittenLanguagePipeline } from "../../src/hyper-xsus-core/cross-cutting/written-language-pipeline.js";
const engine = (name, supports, process) => ({ name, supports, process });
describe("Hyper XSUS Core — integrated written language pipeline", () => {
  it("normalizes and processes multiple sentences with bounded context", async () => {
    const seen = [];
    const pipeline = createWrittenLanguagePipeline({ engines: [
      engine("en", ({ language }) => language === "en", async request => {
        seen.push(request);
        return { answer: request.text.toUpperCase() };
      })
    ] });
    const result = await pipeline.process({
      text: "Hello!\r\nWorld?", language: "en",
      context: [{ role: "user", content: "Earlier question" }]
    });
    expect(result.sentences.map(x => x.result.answer)).toEqual(["HELLO!", "WORLD?"]);
    expect(result.contextMessages).toBe(1);
    expect(result.normalizedText).toBe("Hello!\nWorld?");
    expect(seen[0].context).toEqual([{ role: "user", content: "Earlier question" }]);
    expect(Object.isFrozen(result.sentences)).toBe(true);
    expect(Object.isFrozen(seen[0].context[0])).toBe(true);
  });
  it("falls back to a second engine and freezes output", async () => {
    const pipeline = createWrittenLanguagePipeline({ engines: [
      engine("primary", () => true, async () => { throw Error("private"); }),
      engine("backup", () => true, async () => ({ answer: "ok", nested: { safe: true } }))
    ] });
    const result = await pipeline.process({ text: "Bonjour.", language: "fr" });
    expect(result.sentences[0].engine).toBe("backup");
    expect(result.degraded).toBe(true);
    expect(Object.isFrozen(result.sentences[0].result.nested)).toBe(true);
  });
  it("rejects malformed context before calling an engine", async () => {
    let calls = 0;
    const pipeline = createWrittenLanguagePipeline({ engines: [
      engine("en", () => true, async () => { calls++; return { ok: true }; })
    ] });
    await expect(pipeline.process({ text: "Hi.", context: [{ role: "system", content: "unsafe" }] }))
      .rejects.toThrow("context message");
    expect(calls).toBe(0);
  });
  it("enforces sentence limits and rejects empty input", async () => {
    const pipeline = createWrittenLanguagePipeline({ maxSentences: 1, engines: [
      engine("en", () => true, async () => ({ ok: true }))
    ] });
    await expect(pipeline.process({ text: "One. Two." })).rejects.toThrow("Sentence limit");
    await expect(pipeline.process({ text: "   " })).rejects.toThrow("Empty");
  });
  it("rejects invalid language codes and oversized context", async () => {
    const pipeline = createWrittenLanguagePipeline({ maxContextMessages: 1, engines: [
      engine("en", () => true, async () => ({ ok: true }))
    ] });
    await expect(pipeline.process({ text: "Hello", language: "../en" })).rejects.toThrow("language code");
    await expect(pipeline.process({ text: "Hello", context: [
      { role: "user", content: "a" }, { role: "assistant", content: "b" }
    ] })).rejects.toThrow("context");
  });
  it("propagates a safe error code when no language engine is available", async () => {
    const pipeline = createWrittenLanguagePipeline({ engines: [
      engine("en", ({ language }) => language === "en", async () => ({ ok: true }))
    ] });
    await expect(pipeline.process({ text: "Bonjour", language: "fr" }))
      .rejects.toMatchObject({ code: "HYPER_ENGINE_UNAVAILABLE" });
  });
});
