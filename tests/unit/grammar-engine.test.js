import { describe, it, expect } from "vitest";

import {
  analyzeGrammar,
  isGrammarEngineSupported,
} from "../../src/language/grammar-engine.js";

describe("XSUS AI — Grammar Engine", () => {
  describe("analyzeGrammar()", () => {
    it("analizon tekst të vlefshëm", () => {
      const result = analyzeGrammar("Përshëndetje botë.");

      expect(result.valid).toBe(true);
      expect(result.text).toBe("Përshëndetje botë.");
      expect(result.wordCount).toBe(2);
      expect(result.sentenceCount).toBe(1);
      expect(result.issues).toEqual([]);
      expect(result.analysisLevel).toBe("basic");
      expect(result.requiresLanguageSpecificRules).toBe(true);
    });

    it("trajton tekst bosh", () => {
      const result = analyzeGrammar("");

      expect(result.valid).toBe(false);
      expect(result.text).toBe("");
      expect(result.wordCount).toBe(0);
      expect(result.sentenceCount).toBe(0);
      expect(result.issues).toContain(
        "Teksti është bosh ose i pavlefshëm."
      );
    });

    it("trajton tekst që përmban vetëm hapësira", () => {
      const result = analyzeGrammar("   \n\t  ");

      expect(result.valid).toBe(false);
      expect(result.wordCount).toBe(0);
      expect(result.sentenceCount).toBe(0);
    });

    it.each([null, undefined, 123, true, {}, []])(
      "refuzon input të pavlefshëm: %s",
      (input) => {
        const result = analyzeGrammar(input);

        expect(result.valid).toBe(false);
        expect(result.text).toBe("");
        expect(result.wordCount).toBe(0);
        expect(result.sentenceCount).toBe(0);
        expect(result.issues).toContain(
          "Teksti është bosh ose i pavlefshëm."
        );
      }
    );

    it("normalizon gjuhën e dhënë", () => {
      const result = analyzeGrammar("Hello world.", "EN");

      expect(result.language).toBe("en");
    });

    it("përdor gjuhën auto si parazgjedhje", () => {
      const result = analyzeGrammar("Hello world.");

      expect(result.language).toBe("auto");
    });

    it("numëron fjalët me apostrof", () => {
      const result = analyzeGrammar(
        "I'm learning today's technology."
      );

      expect(result.wordCount).toBe(4);
    });

    it("numëron fjalët me vizë lidhëse", () => {
      const result = analyzeGrammar(
        "This is a state-of-the-art system."
      );

      expect(result.wordCount).toBe(5);
    });

    it("njeh shkronjat Unicode dhe shenjat diakritike", () => {
      const result = analyzeGrammar(
        "Çështja është zgjidhur."
      );

      expect(result.wordCount).toBe(3);
      expect(result.valid).toBe(true);
    });

    it("numëron fjalët që përmbajnë numra", () => {
      const result = analyzeGrammar(
        "XSUS AI 2026 version 12."
      );

      expect(result.wordCount).toBe(5);
    });

    it("numëron fjalitë me pikë, pikëpyetje dhe pikëçuditje", () => {
      const result = analyzeGrammar(
        "Hello. How are you? Excellent!"
      );

      expect(result.sentenceCount).toBe(3);
    });

    it("mbështet shenjat ndërkombëtare të pikësimit", () => {
      const result = analyzeGrammar(
        "你好。你好吗？太好了！"
      );

      expect(result.sentenceCount).toBe(3);
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it("mbështet pikëpyetjen arabe", () => {
      const result = analyzeGrammar(
        "مرحبا؟ كيف حالك؟",
        "ar"
      );

      expect(result.sentenceCount).toBe(2);
      expect(result.language).toBe("ar");
    });

    it("identifikon tekst pa fjalë të dallueshme", () => {
      const result = analyzeGrammar(
        "!!! ... ؟؟؟"
      );

      expect(result.valid).toBe(false);
      expect(result.wordCount).toBe(0);
      expect(result.issues).toContain(
        "Nuk u gjetën فjalë të dallueshme."
      );
    });

    it("ruan një fjali për tekst jo bosh pa ndarës fjalish", () => {
      const result = analyzeGrammar("Hello world");

      expect(result.sentenceCount).toBe(1);
    });

    it("nuk ndryshon tekstin origjinal të input-it", () => {
      const input = "  Hello   world.  ";

      analyzeGrammar(input);

      expect(input).toBe("  Hello   world.  ");
    });

    it("kthen strukturë të qëndrueshme për tekstin e analizuar", () => {
      const result = analyzeGrammar("XSUS Studio.");

      expect(result).toEqual({
        valid: true,
        language: "auto",
        text: "XSUS Studio.",
        wordCount: 2,
        sentenceCount: 1,
        issues: [],
        analysisLevel: "basic",
        requiresLanguageSpecificRules: true,
      });
    });
  });

  describe("isGrammarEngineSupported()", () => {
    it("konfirmon se Grammar Engine mbështetet", () => {
      expect(isGrammarEngineSupported()).toBe(true);
    });
  });
});
