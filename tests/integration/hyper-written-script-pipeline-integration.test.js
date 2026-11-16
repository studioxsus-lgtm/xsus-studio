import { describe, it, expect } from "vitest";
import { createWrittenLanguagePipeline } from "../../src/hyper-xsus-core/cross-cutting/written-language-pipeline.js";
describe("Hyper XSUS Core — script profile integration", () => {
  it("reports script composition without overriding explicitly selected language", async () => {
    const pipeline = createWrittenLanguagePipeline({ engines: [
      { name: "generic", supports: () => true, process: async () => ({ ok: true }) }
    ] });
    const result = await pipeline.process({ text: "Përshëndetje. Привет!", language: "sq" });
    expect(result.language).toBe("sq");
    expect(result.scriptProfile.languageDetected).toBe(false);
    expect(result.scriptProfile.distribution.map(x => x.script)).toEqual(["Latin", "Cyrillic"]);
    expect(result.sentences).toHaveLength(2);
  });
});
