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

  test("krijon kërkesë përmes API-së publike", () => {
    const request = XSUSAI.createAIRequest({
      query: "Përshëndetje",
      language: "sq"
    });

    expect(request.query).toBe("Përshëndetje");
    expect(request.language).toBe("sq");
    expect(request.id).toBeTruthy();
  });

  test("ekspozon informacionin e gjuhëve", () => {
    expect(XSUSAI.getSupportedLanguages()).toContain("sq");
    expect(XSUSAI.getSupportedLanguages()).toContain("en");
    expect(XSUSAI.getSupportedLanguages()).toContain("fr");
  });
});
