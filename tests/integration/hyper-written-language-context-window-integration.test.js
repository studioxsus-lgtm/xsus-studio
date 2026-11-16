import { describe, it, expect } from "vitest";
import { createWrittenLanguagePipeline } from "../../src/hyper-xsus-core/cross-cutting/written-language-pipeline.js";
const engines = [{ name: "language", supports: () => true,
  process: async ({ context }) => ({ history: context.map(item => item.content) }) }];
describe("Hyper XSUS Core — integrated recent context window", () => {
  it("keeps only newest messages and reports omissions", async () => {
    const pipeline = createWrittenLanguagePipeline({
      engines, contextMode: "recent", maxContextMessages: 2
    });
    const result = await pipeline.process({ text: "Hello.", context: [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
      { role: "user", content: "third" }
    ] });
    expect(result.sentences[0].result.history).toEqual(["second", "third"]);
    expect(result.contextMessages).toBe(2);
    expect(result.omittedContextMessages).toBe(1);
  });
  it("enforces Unicode aggregate budget and keeps complete messages", async () => {
    const pipeline = createWrittenLanguagePipeline({
      engines, contextMode: "recent", maxTotalContextCodePoints: 3
    });
    const result = await pipeline.process({ text: "Hello.", context: [
      { role: "user", content: "older" }, { role: "assistant", content: "😀ok" }
    ] });
    expect(result.sentences[0].result.history).toEqual(["😀ok"]);
    expect(result.omittedContextMessages).toBe(1);
  });
  it("retains strict mode behavior for oversized histories", async () => {
    const pipeline = createWrittenLanguagePipeline({ engines, maxContextMessages: 1 });
    await expect(pipeline.process({ text: "Hello.", context: [
      { role: "user", content: "one" }, { role: "assistant", content: "two" }
    ] })).rejects.toThrow("Invalid written language context");
  });
  it("rejects invalid modes and unsafe roles before engine dispatch", async () => {
    expect(() => createWrittenLanguagePipeline({ engines, contextMode: "all" }))
      .toThrow("context mode");
    const pipeline = createWrittenLanguagePipeline({ engines, contextMode: "recent" });
    await expect(pipeline.process({ text: "Hello.", context: [
      { role: "system", content: "unsafe" }
    ] })).rejects.toThrow("role");
  });
});
