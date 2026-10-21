
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
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.version).toBe("1.2.0");
  });

  test("përpunon një pyetje në anglisht", async () => {
    const result = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("en");
    expect(result.metadata).toHaveProperty("knowledgeResults");
    expect(result.metadata.knowledgeResults).toBeGreaterThanOrEqual(0);
  });

  test("përpunon një pyetje në frëngjisht", async () => {
    const result = await processAIRequest({
      query: "Qu'est-ce que JavaScript?",
      language: "fr"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("fr");
    expect(result.source).toBe("xsus-knowledge-service");
    expect(result.metadata.engine).toBe("xsus-ai-core");
  });

  test("përgjigjja ka strukturën e pritshme", async () => {
    const result = await processAIRequest({
      query: "JavaScript",
      language: "en"
    });

    expect(result).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        answer: expect.any(String),
        language: "en",
        source: "xsus-knowledge-service",
        metadata: expect.any(Object),
        timestamp: expect.any(String),
        version: "1.2.0"
      })
    );

    expect(result).toHaveProperty("confidence");
    expect(result.metadata).toHaveProperty("engine", "xsus-ai-core");
    expect(result.metadata).toHaveProperty("version", "1.2.0");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  test("përgjigjja përmban metadata për njohuritë", async () => {
    const result = await processAIRequest({
      query: "What is programming?",
      language: "en"
    });

    expect(result.metadata).toHaveProperty("knowledgeResults");
    expect(result.metadata.knowledgeResults).toBeGreaterThanOrEqual(0);
    expect(result.metadata).toHaveProperty("sources");
    expect(Array.isArray(result.metadata.sources)).toBe(true);
  });

  test("përgjigjja përfshin metadata të kontekstit", async () => {
    const result = await processAIRequest({
      query: "Çfarë është JavaScript?",
      language: "sq",
      conversationId: "test-conversation",
      messages: [
        {
          role: "user",
          content: "Dua të mësoj programim."
        },
        {
          role: "assistant",
          content: "Mund të fillosh me JavaScript."
        }
      ]
    });

    expect(result.answer).toBeTruthy();
    expect(result.metadata.context).toBeDefined();
    expect(result.metadata.context.conversationId).toBe(
      "test-conversation"
    );
    expect(result.metadata.context.historyMessageCount).toBe(2);
    expect(result.metadata.context.hasPreviousContext).toBe(true);
  });
});
