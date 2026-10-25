import { describe, expect, test } from "vitest";
import { processAIRequest } from "../../src/core/ai-core.js";

describe("XSUS AI Core — Response Quality Edge Cases", () => {
  test("refuzon pyetjen bosh me përgjigje të standardizuar", async () => {
    const result = await processAIRequest({
      query: "   ",
      language: "sq"
    });

    expect(result).toHaveProperty("error");
    expect(result.error).toContain("pyetje");
    expect(result.answer).toBe("");
  });

  test("ruan strukturën standarde të gabimit", async () => {
    const result = await processAIRequest({
      query: "",
      language: "en"
    });

    expect(result).toHaveProperty("error");
    expect(result.answer).toBe("");
    expect(result).toHaveProperty("version", "1.2.0");
    expect(result.metadata).toBeDefined();
  });

  test("refuzon pyetjet që tejkalojnë kufirin e lejuar", async () => {
    const result = await processAIRequest({
      query: "a".repeat(8001),
      language: "sq"
    });

    expect(result).toHaveProperty("error");
    expect(result.answer).toBe("");
    expect(result.error).toContain("8000");
  });

  test.each([
    ["sq", "Çfarë është programimi?"],
    ["en", "What is programming?"],
    ["fr", "Qu'est-ce que la programmation?"]
  ])(
    "ruan gjuhën dhe metadata për kërkesën %s",
    async (language, query) => {
      const result = await processAIRequest({
        query,
        language
      });

      expect(result.language).toBe(language);
      expect(result.metadata.language).toBe(language);
      expect(result.metadata.engine).toBe("xsus-ai-core");
      expect(result.metadata.version).toBe("1.2.0");
    }
  );

  test("kthen përgjigje edhe kur pyetja nuk ka përgjigje të njohur", async () => {
    const result = await processAIRequest({
      query: "Cili është rezultati i një ngjarjeje të panjohur në të ardhmen?",
      language: "sq"
    });

    expect(result).toHaveProperty("answer");
    expect(typeof result.answer).toBe("string");
    expect(result.answer.trim().length).toBeGreaterThan(0);
    expect(result.metadata.engine).toBe("xsus-ai-core");
  });

  test("metadata e cilësisë ka strukturë të sigurt kur është e disponueshme", async () => {
    const result = await processAIRequest({
      query: "Shpjego konceptin e algoritmit.",
      language: "sq"
    });

    expect(result.answer.trim().length).toBeGreaterThan(0);

    const quality = result.metadata.responseQuality;

    if (quality !== null) {
      expect(quality).toEqual(
        expect.objectContaining({
          version: expect.any(String),
          score: expect.any(Number),
          sourceCount: expect.any(Number),
          valid: expect.any(Boolean)
        })
      );

      expect(quality.score).toBeGreaterThanOrEqual(0);
      expect(quality.score).toBeLessThanOrEqual(100);
      expect(quality.sourceCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("ruan strukturën e përgjigjes edhe kur metadata e cilësisë mungon", async () => {
    const result = await processAIRequest({
      query: "What is an algorithm?",
      language: "en"
    });

    expect(result).toHaveProperty("answer");
    expect(result).toHaveProperty("requestId");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("version", "1.2.0");
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.responseEngine).toBeDefined();
  });
});
