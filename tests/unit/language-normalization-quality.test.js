import { describe, expect, test } from "vitest";

import {
  normalizeText,
  normalizeForSearch,
  tokenizeText,
  normalizeLanguageCode,
  getBaseLanguage,
  areTextsEqual,
  getUniqueTokens
} from "../../src/language/normalization.js";

describe("XSUS AI — Language Normalization Quality", () => {
  test("normalizon tekstin pa humbur karakteret shqipe", () => {
    expect(
      normalizeText("  Përshëndetje,   Shqipëri!  ")
    ).toBe("Përshëndetje, Shqipëri!");
  });

  test("normalizon shkronjat e mëdha dhe të vogla për kërkim", () => {
    expect(
      normalizeForSearch("JAVASCRIPT ProgramIM")
    ).toBe("javascript programim");
  });

  test("ruan ë dhe ç gjatë normalizimit për kërkim", () => {
    expect(
      normalizeForSearch("Është Çështje Shqiptare")
    ).toBe("është çështje shqiptare");
  });

  test("normalizon format Unicode ekuivalente", () => {
    const composed = "çështje";
    const decomposed = "c\u0327ështje";

    expect(normalizeForSearch(composed)).toBe(
      normalizeForSearch(decomposed)
    );

    expect(areTextsEqual(composed, decomposed)).toBe(true);
  });

  test("normalizon hapësirat dhe shenjat e pikësimit", () => {
    expect(
      normalizeForSearch("AI—Engine   XSUS!")
    ).toBe("ai-engine xsus");
  });

  test("ndan tekstin në token-e Unicode", () => {
    expect(
      tokenizeText("Përshëndetje Shqipëri 2026")
    ).toEqual(["përshëndetje", "shqipëri", "2026"]);
  });

  test("kthen listën e token-eve unike", () => {
    expect(
      getUniqueTokens("AI ai XSUS xsus")
    ).toEqual(["ai", "xsus"]);
  });

  test("normalizon kodin rajonal duke ruajtur formatin kanonik", () => {
    expect(normalizeLanguageCode("sq-AL")).toBe("sq-AL");
    expect(getBaseLanguage("sq-AL")).toBe("sq");
  });

  test("kthen auto për kodin e pavlefshëm të gjuhës", () => {
    expect(
      normalizeLanguageCode("invalid_language_123")
    ).toBe("auto");

    expect(
      getBaseLanguage("invalid_language_123")
    ).toBe("auto");
  });

  test("krahason tekstet pa dallim të shkronjave të mëdha", () => {
    expect(
      areTextsEqual("XSUS AI", "xsus ai")
    ).toBe(true);
  });

  test("kthen vlera të sigurta për hyrje jo tekstuale", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(123)).toBe("");
    expect(tokenizeText(null)).toEqual([]);
    expect(getUniqueTokens(null)).toEqual([]);
  });
});
