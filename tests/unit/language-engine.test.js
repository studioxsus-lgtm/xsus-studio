
import { describe, expect, test } from "vitest";

import {
  detectLanguage,
  analyzeLanguage,
  getLanguageInfo,
  getSupportedLanguages
} from "../../src/language/language-engine.js";

describe("XSUS Language Engine", () => {
  describe("detectLanguage()", () => {
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

    test("kthen und për tekst që nuk mund ta identifikojë", () => {
      expect(detectLanguage("123456789")).toBe("und");
    });
  });

  describe("analyzeLanguage()", () => {
    test("analizon tekstin në gjuhën e zbuluar", () => {
      const result = analyzeLanguage("Përshëndetje, si jeni?");

      expect(result.detectedLanguage).toBe("sq");
      expect(result.language).toBe("sq");
      expect(result.isEmpty).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    test("respekton gjuhën e kërkuar për analizë", () => {
      const result = analyzeLanguage("This is a test.", {
        language: "en"
      });

      expect(result.language).toBe("en");
      expect(result.detectedLanguage).toBe("en");
      expect(result.requestedLanguage).toBe("en");
      expect(result.isEmpty).toBe(false);
      expect(result.isSupported).toBe(true);
      expect(result.grammar).not.toBeNull();
    });

    test("ndan gjuhën e pyetjes nga gjuha e kërkuar", () => {
      const result = analyzeLanguage("Përshëndetje, si jeni?", {
        language: "en"
      });

      expect(result.detectedLanguage).toBe("sq");
      expect(result.requestedLanguage).toBe("en");
      expect(result.language).toBe("en");
    });

    test("mbështet kodin rajonal en-US", () => {
      const result = analyzeLanguage("Hello, how are you?", {
        language: "en-US"
      });

      expect(result.language).toBe("en");
      expect(result.requestedLanguage).toBe("en");
      expect(result.isSupported).toBe(true);
    });

    test("trajton tekstin bosh pa analizë gramatikore", () => {
      const result = analyzeLanguage("");

      expect(result.isEmpty).toBe(true);
      expect(result.detectedLanguage).toBe("und");
      expect(result.grammar).toBeNull();
    });
  });

  describe("getLanguageInfo()", () => {
    test("kthen informacion për shqipen", () => {
      const result = getLanguageInfo("sq");

      expect(result.code).toBe("sq");
      expect(result.baseLanguage).toBe("sq");
      expect(result.name).toBeTruthy();
    });

    test("kthen informacion për anglishten", () => {
      const result = getLanguageInfo("en");

      expect(result.code).toBe("en");
      expect(result.name).toBeTruthy();
    });
  });

  describe("getSupportedLanguages()", () => {
    test("përfshin 13 gjuhët e deklaruara", () => {
      const languages = getSupportedLanguages();

      expect(languages).toHaveLength(13);
      expect(languages).toContain("sq");
      expect(languages).toContain("en");
      expect(languages).toContain("fr");
    });

    test("kthen kopje të listës dhe jo referencën origjinale", () => {
      const first = getSupportedLanguages();
      const second = getSupportedLanguages();

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });
  });
});
