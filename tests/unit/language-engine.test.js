import { describe, expect, test } from "vitest";

import {
  detectLanguage,
  analyzeLanguage,
  getLanguageInfo
} from "../../src/language/language-engine.js";

describe("XSUS Language Engine", () => {
  test("identifikon një fjali në shqip", () => {
    expect(detectLanguage("Përshëndetje, si jeni?")).toBe("sq");
  });

  test("identifikon një fjali në anglisht", () => {
    expect(detectLanguage("What is JavaScript?")).toBe("en");
  });

  test("identifikon një fjali në frëngjisht", () => {
    expect(detectLanguage("Bonjour, comment allez-vous?")).toBe("fr");
  });

  test("kthen und për tekst bosh", () => {
    expect(detectLanguage("")).toBe("und");
  });

  test("analizon tekstin në gjuhën e kërkuar", () => {
    const result = analyzeLanguage(
      "This is a test.",
      { language: "en" }
    );

    expect(result.language).toBe("en");
    expect(result.isEmpty).toBe(false);
    expect(result.grammar).toBeDefined();
  });

  test("kthen informacion për gjuhën", () => {
    const result = getLanguageInfo("sq");

    expect(result.code).toBe("sq");
    expect(result.baseLanguage).toBe("sq");
    expect(result.name).toBeTruthy();
  });
});
