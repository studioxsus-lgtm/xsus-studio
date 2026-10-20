import { describe, expect, test } from "vitest";
import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core", () => {
  test("kthen gabim kur pyetja është bosh", async () => {
    const result = await processAIRequest({
      query: "   "
    });

    expect(result).toHaveProperty("error");
    expect(result.error).toContain("pyetje");
    expect(result.answer).toBe("");
  });

  test("përpunon një pyetje në shqip", async () => {
    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("sq");
    expect(result.source).toBe("xsus-knowledge-service");
    expect(result.metadata.engine).toBe("xsus-ai-core");
  });

  test("përpunon një pyetje në anglisht", async () => {
    const result = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("en");
    expect(result.metadata).toHaveProperty("knowledgeResults");
  });

  test("përpunon një pyetje në frëngjisht", async () => {
    const result = await processAIRequest({
      query: "Qu'est-ce que JavaScript?",
      language: "fr"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("fr");
    expect(result.source).toBe("xsus-knowledge-service");
  });

  test("përgjigjja ka strukturën e pritshme", async () => {
    const result = await processAIRequest({
      query: "JavaScript",
      language: "en"
    });

    expect(result).toHaveProperty("requestId");
    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("language");
    expect(result).toHaveProperty("source");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("version");
  });
});
