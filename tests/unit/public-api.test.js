
import { describe, expect, test } from "vitest";
import * as XSUSAI from "../../src/index.js";

describe("XSUS AI Public API", () => {
  test("ekspozon funksionet kryesore publike", () => {
    expect(XSUSAI).toHaveProperty("processAIRequest");
    expect(XSUSAI).toHaveProperty("createAIRequest");
    expect(XSUSAI).toHaveProperty("createAIResponse");
    expect(XSUSAI).toHaveProperty("getSupportedLanguages");
    expect(XSUSAI).toHaveProperty("searchKnowledge");
  });

  test("ekspozon versionin e bërthamës", () => {
    expect(XSUSAI).toHaveProperty("XSUS_CORE_VERSION");
    expect(typeof XSUSAI.XSUS_CORE_VERSION).toBe("string");
    expect(XSUSAI.XSUS_CORE_VERSION.length).toBeGreaterThan(0);
  });

  test("krijon një kërkesë të vlefshme", () => {
    const request = XSUSAI.createAIRequest({
      query: "Përshëndetje",
      language: "sq"
    });

    expect(request).toBeDefined();
    expect(request.query).toBe("Përshëndetje");
    expect(request.language).toBe("sq");
  });

  test("krijon një përgjigje të strukturuar", () => {
    const response = XSUSAI.createAIResponse({
      answer: "Përshëndetje!",
      language: "sq"
    });

    expect(response).toBeDefined();
    expect(response).toHaveProperty("answer");
    expect(response.answer).toBe("Përshëndetje!");
  });

  test("kthen informacion të qëndrueshëm për gjuhët", () => {
    const first = XSUSAI.getSupportedLanguages();
    const second = XSUSAI.getSupportedLanguages();

    expect(Array.isArray(first)).toBe(true);
    expect(first).toEqual(second);
    expect(first).toEqual(
      expect.arrayContaining(["sq", "en", "fr"])
    );

    expect(first.length).toBeGreaterThanOrEqual(
      XSUSAI.SUPPORTED_LANGUAGES.length
    );

    expect(new Set(first).size).toBe(first.length);
  });

  test("lista e gjuhëve përmban kode tekstuale", () => {
    const languages = XSUSAI.getSupportedLanguages();

    for (const language of languages) {
      expect(typeof language).toBe("string");
      expect(language.length).toBeGreaterThan(0);
    }
  });

  test("ekspozon listën bazë të gjuhëve", () => {
    expect(Array.isArray(XSUSAI.SUPPORTED_LANGUAGES)).toBe(true);
    expect(XSUSAI.SUPPORTED_LANGUAGES).toEqual(
      expect.arrayContaining(["sq", "en", "fr"])
    );
  });

  test("proceson një kërkesë të vlefshme", async () => {
    const result = await XSUSAI.processAIRequest({
      query: "Përshëndetje",
      language: "sq"
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("version");
  });

  test("trajton kërkesën bosh sipas kontratës së API-së", async () => {
    const result = await XSUSAI.processAIRequest({
      query: "   "
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("error");
  });

  test("ekspozon shërbimin e kërkimit të njohurive", async () => {
    const result = await XSUSAI.searchKnowledge("JavaScript");

    expect(result).toBeDefined();
    expect(
      Array.isArray(result) || typeof result === "object"
    ).toBe(true);
  });
});
