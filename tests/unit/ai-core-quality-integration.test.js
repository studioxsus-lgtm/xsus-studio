import { describe, expect, test } from "vitest";
import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Response Quality Integration", () => {
  test("përgjigjja përmban metadata të cilësisë", async () => {
    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result).toHaveProperty("answer");
    expect(typeof result.answer).toBe("string");
    expect(result.answer.length).toBeGreaterThan(0);

    expect(result.metadata).toHaveProperty("responseQuality");
    expect(result.metadata.responseQuality).not.toBeNull();
  });

  test("metadata e cilësisë përmban strukturën e pritshme", async () => {
    const result = await processAIRequest({
      query: "What is programming?",
      language: "en"
    });

    const quality = result.metadata?.responseQuality;

    expect(quality).not.toBeNull();
    expect(quality).toEqual(
      expect.objectContaining({
        version: expect.any(String),
        score: expect.any(Number),
        dimensions: expect.anything(),
        sourceCount: expect.any(Number),
        valid: expect.any(Boolean),
        errors: expect.anything()
      })
    );
  });

  test.each([
    ["sq", "Çfarë është programimi?"],
    ["en", "What is programming?"],
    ["fr", "Qu'est-ce que la programmation?"]
  ])(
    "ruan metadata të cilësisë për gjuhën %s",
    async (language, query) => {
      const result = await processAIRequest({
        query,
        language
      });

      expect(result.answer).toBeTruthy();
      expect(result.language).toBe(language);
      expect(result.metadata?.responseQuality).not.toBeNull();
      expect(result.metadata.responseQuality).toHaveProperty("score");
      expect(result.metadata.responseQuality).toHaveProperty("dimensions");
    }
  );

  test("dështimi i vlerësimit nuk duhet të prishë përgjigjen normale", async () => {
    const result = await processAIRequest({
      query: "Shpjego çfarë është JavaScript.",
      language: "sq"
    });

    expect(result).toHaveProperty("answer");
    expect(typeof result.answer).toBe("string");
    expect(result.answer.length).toBeGreaterThan(0);

    expect(result.metadata).toBeDefined();
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
  });

  test("vlerësimi i cilësisë nuk zëvendëson përgjigjen", async () => {
    const result = await processAIRequest({
      query: "What is an algorithm?",
      language: "en"
    });

    expect(typeof result.answer).toBe("string");
    expect(result.answer.trim().length).toBeGreaterThan(0);
    expect(result.metadata.responseQuality).not.toBeNull();
    expect(result.metadata.responseEngine).toBeDefined();
  });
});
