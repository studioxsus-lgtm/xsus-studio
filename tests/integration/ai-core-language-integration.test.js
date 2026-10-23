
import { afterEach, describe, expect, test } from "vitest";

import { processAIRequest } from "../../src/core/ai-core.js";
import { clearAllMemory } from "../../src/core/memory-engine.js";
import { analyzeLanguage } from "../../src/language/language-engine.js";

describe("XSUS AI Core — Language Engine Integration", () => {
  afterEach(() => {
    clearAllMemory();
  });

  test("identifikon gjuhën e pyetjes dhe ruan gjuhën e kërkuar të përgjigjes", async () => {
    const query = "Përshëndetje, dua të mësoj programim.";

    const languageAnalysis = analyzeLanguage(query);

    expect(languageAnalysis.detectedLanguage).toBe("sq");

    const result = await processAIRequest({
      query,
      language: "en",
      conversationId: "language-integration-sq-en"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("en");
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
  });

  test("ruan shqipen si gjuhë përgjigjeje kur ajo kërkohet", async () => {
    const query = "What is programming?";

    const languageAnalysis = analyzeLanguage(query);

    expect(languageAnalysis.detectedLanguage).toBe("en");

    const result = await processAIRequest({
      query,
      language: "sq",
      conversationId: "language-integration-en-sq"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("sq");
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
  });
});
