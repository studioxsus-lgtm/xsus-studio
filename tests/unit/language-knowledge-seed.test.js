import { describe, it, expect } from "vitest";

import {
  LANGUAGE_KNOWLEDGE_SEED_VERSION,
  LANGUAGE_KNOWLEDGE_SEED,
  getLanguageKnowledgeSeed,
  getLanguageKnowledgeByLanguage,
  getLanguageKnowledgeSeedStats,
} from "../../src/core/language-knowledge-seed.js";

describe("XSUS AI Core — Language Knowledge Seed", () => {
  describe("Version and exported dataset", () => {
    it("exposes the expected seed version", () => {
      expect(LANGUAGE_KNOWLEDGE_SEED_VERSION).toBe("1.0.0");
    });

    it("exports a non-empty frozen dataset", () => {
      expect(Array.isArray(LANGUAGE_KNOWLEDGE_SEED)).toBe(true);
      expect(LANGUAGE_KNOWLEDGE_SEED.length).toBe(38);
      expect(Object.isFrozen(LANGUAGE_KNOWLEDGE_SEED)).toBe(true);
    });

    it("contains unique entry identifiers", () => {
      const ids = LANGUAGE_KNOWLEDGE_SEED.map(
        (entry) => entry.id
      );

      expect(new Set(ids).size).toBe(ids.length);
    });

    it("contains valid language and entry types", () => {
      for (const entry of LANGUAGE_KNOWLEDGE_SEED) {
        expect(["sq", "en"]).toContain(entry.language);
        expect(["word", "expression", "concept"]).toContain(
          entry.type
        );
      }
    });

    it("contains the required fields in every entry", () => {
      for (const entry of LANGUAGE_KNOWLEDGE_SEED) {
        expect(entry.id).toEqual(expect.any(String));
        expect(entry.lemma).toEqual(expect.any(String));
        expect(entry.definitions.length).toBeGreaterThan(0);
        expect(entry.translations).toEqual(expect.any(Object));
        expect(Array.isArray(entry.synonyms)).toBe(true);
        expect(Array.isArray(entry.examples)).toBe(true);
      }
    });
  });

  describe("getLanguageKnowledgeSeed", () => {
    it("returns all seed entries", () => {
      const result = getLanguageKnowledgeSeed();

      expect(result).toHaveLength(38);
    });

    it("returns a new array on every call", () => {
      const first = getLanguageKnowledgeSeed();
      const second = getLanguageKnowledgeSeed();

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    it("returns independent entry objects", () => {
      const first = getLanguageKnowledgeSeed();
      const second = getLanguageKnowledgeSeed();

      expect(first[0]).not.toBe(second[0]);
    });

    it("returns independent definitions arrays", () => {
      const first = getLanguageKnowledgeSeed();
      const second = getLanguageKnowledgeSeed();

      expect(first[0].definitions).not.toBe(
        second[0].definitions
      );
    });

    it("returns independent translations and nested arrays", () => {
      const first = getLanguageKnowledgeSeed();
      const second = getLanguageKnowledgeSeed();

      expect(first[0].translations).not.toBe(
        second[0].translations
      );

      expect(first[0].translations.en).not.toBe(
        second[0].translations.en
      );
    });

    it("returns independent synonyms and examples arrays", () => {
      const first = getLanguageKnowledgeSeed();
      const second = getLanguageKnowledgeSeed();

      expect(first[0].synonyms).not.toBe(
        second[0].synonyms
      );

      expect(first[0].examples).not.toBe(
        second[0].examples
      );
    });

    it("does not allow mutations of a returned copy to affect the source", () => {
      const result = getLanguageKnowledgeSeed();
      const originalLemma = LANGUAGE_KNOWLEDGE_SEED[0].lemma;

      result[0].lemma = "modified";
      result[0].definitions.push("modified definition");
      result[0].translations.en.push("modified translation");
      result[0].synonyms.push("modified synonym");
      result[0].examples.push("modified example");

      expect(LANGUAGE_KNOWLEDGE_SEED[0].lemma).toBe(
        originalLemma
      );

      expect(
        LANGUAGE_KNOWLEDGE_SEED[0].definitions
      ).not.toContain("modified definition");

      expect(
        LANGUAGE_KNOWLEDGE_SEED[0].translations.en
      ).not.toContain("modified translation");

      expect(
        LANGUAGE_KNOWLEDGE_SEED[0].synonyms
      ).not.toContain("modified synonym");

      expect(
        LANGUAGE_KNOWLEDGE_SEED[0].examples
      ).not.toContain("modified example");
    });
  });

  describe("getLanguageKnowledgeByLanguage", () => {
    it("returns only Albanian entries", () => {
      const result = getLanguageKnowledgeByLanguage("sq");

      expect(result.length).toBe(22);
      expect(
        result.every((entry) => entry.language === "sq")
      ).toBe(true);
    });

    it("returns only English entries", () => {
      const result = getLanguageKnowledgeByLanguage("en");

      expect(result.length).toBe(16);
      expect(
        result.every((entry) => entry.language === "en")
      ).toBe(true);
    });

    it("normalizes uppercase language codes", () => {
      expect(
        getLanguageKnowledgeByLanguage("SQ")
      ).toEqual(getLanguageKnowledgeByLanguage("sq"));
    });

    it("normalizes whitespace around language codes", () => {
      expect(
        getLanguageKnowledgeByLanguage(" en ")
      ).toEqual(getLanguageKnowledgeByLanguage("en"));
    });

    it("supports regional language codes with hyphens", () => {
      expect(
        getLanguageKnowledgeByLanguage("en-US")
      ).toEqual(getLanguageKnowledgeByLanguage("en"));
    });

    it("supports regional language codes with underscores", () => {
      expect(
        getLanguageKnowledgeByLanguage("sq_AL")
      ).toEqual(getLanguageKnowledgeByLanguage("sq"));
    });

    it("returns an empty array for unsupported languages", () => {
      expect(
        getLanguageKnowledgeByLanguage("de")
      ).toEqual([]);
    });

    it("returns an empty array for an empty language code", () => {
      expect(
        getLanguageKnowledgeByLanguage("")
      ).toEqual([]);
    });

    it("returns an empty array for whitespace-only language codes", () => {
      expect(
        getLanguageKnowledgeByLanguage("   ")
      ).toEqual([]);
    });

    it("returns an empty array for non-string input", () => {
      expect(getLanguageKnowledgeByLanguage(null)).toEqual([]);
      expect(getLanguageKnowledgeByLanguage(undefined)).toEqual([]);
      expect(getLanguageKnowledgeByLanguage(123)).toEqual([]);
      expect(getLanguageKnowledgeByLanguage({})).toEqual([]);
      expect(getLanguageKnowledgeByLanguage([])).toEqual([]);
    });

    it("returns independent copies of language entries", () => {
      const first = getLanguageKnowledgeByLanguage("sq");
      const second = getLanguageKnowledgeByLanguage("sq");

      expect(first).not.toBe(second);
      expect(first[0]).not.toBe(second[0]);
      expect(first[0].translations).not.toBe(
        second[0].translations
      );
    });
  });

  describe("getLanguageKnowledgeSeedStats", () => {
    it("returns the expected version and total entry count", () => {
      const stats = getLanguageKnowledgeSeedStats();

      expect(stats.version).toBe("1.0.0");
      expect(stats.totalEntries).toBe(38);
    });

    it("returns the expected language distribution", () => {
      const stats = getLanguageKnowledgeSeedStats();

      expect(stats.languageCounts).toEqual({
        sq: 22,
        en: 16,
      });
    });

    it("returns the supported languages", () => {
      const stats = getLanguageKnowledgeSeedStats();

      expect(stats.languages).toEqual(["sq", "en"]);
    });

    it("returns independent statistics objects", () => {
      const first = getLanguageKnowledgeSeedStats();
      const second = getLanguageKnowledgeSeedStats();

      expect(first).not.toBe(second);
      expect(first.languageCounts).not.toBe(
        second.languageCounts
      );
      expect(first.languages).not.toBe(second.languages);
    });

    it("does not expose mutable references to the source dataset", () => {
      const stats = getLanguageKnowledgeSeedStats();

      stats.languageCounts.sq = 0;
      stats.languages.push("de");

      const freshStats = getLanguageKnowledgeSeedStats();

      expect(freshStats.languageCounts.sq).toBe(22);
      expect(freshStats.languages).toEqual(["sq", "en"]);
    });
  });
});
