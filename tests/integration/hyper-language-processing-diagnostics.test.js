import { describe, expect, it } from "vitest";
import { createLanguageProcessingDiagnostics } from "../../src/hyper-xsus-core/cross-cutting/language-processing-diagnostics.js";
import { createWrittenLanguagePipeline } from "../../src/hyper-xsus-core/cross-cutting/written-language-pipeline.js";
describe("Hyper XSUS Core — privacy-minimized processing diagnostics", () => {
  it("summarizes engine usage without retaining source text", async () => {
    const pipeline = createWrittenLanguagePipeline({ engines: [
      { name: "primary", supports: () => true, process: async () => ({ answer: "private" }) }
    ] });
    const result = await pipeline.process({ text: "Sensitive example. Another sentence!" });
    const report = createLanguageProcessingDiagnostics().summarize(result);
    expect(report).toMatchObject({ sentenceCount: 2, degradedSentences: 0,
      engineAttempts: 2, engineUsage: [{ engine: "primary", count: 2 }] });
    expect(JSON.stringify(report)).not.toContain("Sensitive");
    expect(JSON.stringify(report)).not.toContain("private");
    expect(Object.isFrozen(report.engineUsage)).toBe(true);
  });
  it("rejects inconsistent execution accounting", () => {
    expect(() => createLanguageProcessingDiagnostics().summarize({
      sentences: [{ engine: "en", degraded: false }],
      tokenCount: 1, execution: { attempts: 1, outputs: 0 }
    })).toThrow("execution");
  });
  it("rejects invalid engine identifiers", () => {
    expect(() => createLanguageProcessingDiagnostics().summarize({
      sentences: [{ engine: "../unsafe", degraded: false }],
      tokenCount: 1, execution: { attempts: 1, outputs: 1 }
    })).toThrow("sentence");
  });
});
