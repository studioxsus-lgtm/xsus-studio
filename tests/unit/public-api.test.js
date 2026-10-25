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
    expect(XSUSAI.XSUS_CORE_VERSION).toBe("1.0.0");
    expect(typeof XSUSAI.AI_CORE_VERSION).toBe("string");
  });

  test("krijon një kërkesë të vlefshme", () => {
    const request = XSUSAI.createAIRequest({
      query: "Përshëndetje",
      language: "sq",
    });

    expect(request.query).toBe("Përshëndetje");
    expect(request.language).toBe("sq");
    expect(request.id).toBeTruthy();
  });

  test("krijon një përgjigje të strukturuar", () => {
    const response = XSUSAI.createAIResponse({
      answer: "Përshëndetje!",
      language: "sq",
    });

    expect(response.answer).toBe("Përshëndetje!");
    expect(response.language).toBe("sq");
    expect(response.version).toBe(XSUSAI.XSUS_CORE_VERSION);
  });

  test("kthen një listë të qëndrueshme gjuhësh", () => {
    const first = XSUSAI.getSupportedLanguages();
    const second = XSUSAI.getSupportedLanguages();

    expect(Array.isArray(first)).toBe(true);
    expect(first).toEqual(second);
    expect(first).toEqual(
      expect.arrayContaining(["sq", "en", "fr"]),
    );
    expect(first.length).toBeGreaterThanOrEqual(
      XSUSAI.SUPPORTED_LANGUAGES.length,
    );
    expect(new Set(first).size).toBe(first.length);
  });

  test("lista publike përmban vetëm kode tekstuale jo bosh", () => {
    for (const language of XSUSAI.getSupportedLanguages()) {
      expect(typeof language).toBe("string");
      expect(language.length).toBeGreaterThan(0);
    }
  });

  test("ekspozon listën bazë të gjuhëve", () => {
    expect(Array.isArray(XSUSAI.SUPPORTED_LANGUAGES)).toBe(true);
    expect(XSUSAI.SUPPORTED_LANGUAGES).toEqual(
      expect.arrayContaining(["sq", "en", "fr"]),
    );
  });

  test("proceson një kërkesë të vlefshme", async () => {
    const result = await XSUSAI.processAIRequest({
      query: "Përshëndetje",
      language: "sq",
    });

    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("version");
  });

  test("trajton kërkesën bosh sipas kontratës", async () => {
    const result = await XSUSAI.processAIRequest({
      query: "   ",
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("error");
  });

  test("ekspozon shërbimin e kërkimit të njohurive", async () => {
    const result = await XSUSAI.searchKnowledge("JavaScript");

    expect(result).toBeDefined();
    expect(
      Array.isArray(result) || typeof result === "object",
    ).toBe(true);
  });

  test("ekspozon Response Quality Pipeline", () => {
    expect(typeof XSUSAI.createResponseQualityPipeline).toBe("function");
    expect(typeof XSUSAI.evaluateResponseQualityPipeline).toBe("function");
    expect(typeof XSUSAI.createResponseQualityPipelineAPI).toBe("function");
    expect(typeof XSUSAI.getResponseQualityPipelineInfo).toBe("function");
  });

  test("ekspozon Response Quality Engine dhe Report", () => {
    expect(typeof XSUSAI.evaluateResponseQuality).toBe("function");
    expect(typeof XSUSAI.createResponseQualityReport).toBe("function");
    expect(typeof XSUSAI.verifyResponseSource).toBe("function");
    expect(typeof XSUSAI.verifyResponseSources).toBe("function");
  });

  test("ekspozon versionet e moduleve të cilësisë", () => {
    expect(XSUSAI.RESPONSE_QUALITY_PIPELINE_VERSION).toBeTruthy();
    expect(XSUSAI.RESPONSE_QUALITY_PIPELINE_API_VERSION).toBeTruthy();
    expect(XSUSAI.RESPONSE_QUALITY_VERSION).toBeTruthy();
    expect(XSUSAI.RESPONSE_QUALITY_REPORT_VERSION).toBeTruthy();
    expect(XSUSAI.SOURCE_VERIFICATION_VERSION).toBeTruthy();
  });

  test("ekspozon objektin kryesor XSUSAI", () => {
    expect(XSUSAI.XSUSAI).toBeDefined();
    expect(typeof XSUSAI.XSUSAI.processAIRequest).toBe("function");
    expect(XSUSAI.XSUSAI.version).toBe(XSUSAI.AI_CORE_VERSION);
    expect(XSUSAI.XSUSAI.coreVersion).toBe(XSUSAI.XSUS_CORE_VERSION);
    expect(Object.isFrozen(XSUSAI.XSUSAI)).toBe(true);
  });
});
