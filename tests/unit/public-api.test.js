
import { describe, expect, test } from "vitest";

import * as XSUSAI from "../../src/index.js";

describe("XSUS AI Public API", () => {
  test("ekspozon versionin dhe konfigurimin", () => {
    expect(XSUSAI.XSUS_CORE_VERSION).toBe("1.0.0");

    expect(XSUSAI.SUPPORTED_LANGUAGES).toEqual([
      "sq",
      "en",
      "fr"
    ]);

    expect(XSUSAI.REQUEST_TYPES.CHAT).toBe("chat");
    expect(XSUSAI.REQUEST_TYPES.KNOWLEDGE).toBe("knowledge");
    expect(XSUSAI.REQUEST_TYPES.TOOL).toBe("tool");
    expect(XSUSAI.REQUEST_TYPES.SYSTEM).toBe("system");
  });

  test("ekspozon funksionet kryesore", () => {
    expect(typeof XSUSAI.processAIRequest).toBe("function");
    expect(typeof XSUSAI.createAIRequest).toBe("function");
    expect(typeof XSUSAI.createAIResponse).toBe("function");
    expect(typeof XSUSAI.searchKnowledge).toBe("function");
    expect(typeof XSUSAI.detectLanguage).toBe("function");
    expect(typeof XSUSAI.normalizeText).toBe("function");
    expect(typeof XSUSAI.routeAIRequest).toBe("function");
  });

  test("ekspozon kontratat dhe kodet e gabimeve", () => {
    expect(XSUSAI.AI_ERROR_CODES).toBeDefined();

    expect(XSUSAI.AI_ERROR_CODES.INVALID_REQUEST)
      .toBe("INVALID_REQUEST");

    expect(XSUSAI.AI_ERROR_CODES.INVALID_QUERY)
      .toBe("INVALID_QUERY");

    expect(XSUSAI.AI_ERROR_CODES.KNOWLEDGE_SERVICE_ERROR)
      .toBe("KNOWLEDGE_SERVICE_ERROR");

    expect(XSUSAI.AI_ERROR_CODES.INTERNAL_ERROR)
      .toBe("INTERNAL_ERROR");

    expect(typeof XSUSAI.createAIErrorResponse).toBe("function");
  });

  test("krijon kërkesë përmes API-së publike", () => {
    const request = XSUSAI.createAIRequest({
      query: "Përshëndetje",
      language: "sq"
    });

    expect(request.query).toBe("Përshëndetje");
    expect(request.language).toBe("sq");
    expect(request.id).toBeTruthy();
    expect(request.type).toBe(XSUSAI.REQUEST_TYPES.CHAT);
    expect(request.version).toBe(XSUSAI.XSUS_CORE_VERSION);
    expect(Number.isNaN(Date.parse(request.timestamp))).toBe(false);
  });

  test("krijon përgjigje përmes API-së publike", () => {
    const response = XSUSAI.createAIResponse({
      requestId: "public-api-test-001",
      answer: "Përshëndetje!",
      language: "sq",
      confidence: 0.9
    });

    expect(response.requestId).toBe("public-api-test-001");
    expect(response.answer).toBe("Përshëndetje!");
    expect(response.language).toBe("sq");
    expect(response.confidence).toBe(0.9);
    expect(response.version).toBe(XSUSAI.XSUS_CORE_VERSION);
  });

  test("refuzon kërkesë të pavlefshme përmes API-së publike", () => {
    expect(() =>
      XSUSAI.createAIRequest({
        query: "   ",
        language: "sq"
      })
    ).toThrow("Query duhet të jetë tekst jo bosh.");
  });

  test("ekspozon informacionin e gjuhëve", () => {
    const languages = XSUSAI.getSupportedLanguages();

    expect(languages).toContain("sq");
    expect(languages).toContain("en");
    expect(languages).toContain("fr");
  });

  test("kthen informacion të qëndrueshëm për gjuhët", () => {
    const first = XSUSAI.getSupportedLanguages();
    const second = XSUSAI.getSupportedLanguages();

    expect(first).toEqual(second);
    expect(first).toEqual(XSUSAI.SUPPORTED_LANGUAGES);
  });

  test("ekspozon funksionin e përpunimit të kërkesave", () => {
    expect(XSUSAI.processAIRequest).toBeDefined();
    expect(typeof XSUSAI.processAIRequest).toBe("function");
  });

  test("ekspozon funksionin e kërkimit të njohurive", () => {
    expect(XSUSAI.searchKnowledge).toBeDefined();
    expect(typeof XSUSAI.searchKnowledge).toBe("function");
  });
});
