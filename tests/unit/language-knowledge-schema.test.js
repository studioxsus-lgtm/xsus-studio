import { describe, expect, test } from "vitest";

import {
  LANGUAGE_KNOWLEDGE_SCHEMA_VERSION,
  SUPPORTED_KNOWLEDGE_LANGUAGES,
  createLanguageKnowledgeEntry,
  validateLanguageKnowledgeEntry,
  createLanguageKnowledgeCollection
} from "../../src/core/language-knowledge-schema.js";

describe("Language Knowledge Schema", () => {
  test("versioni i skemës është 1.0.0", () => {
    expect(LANGUAGE_KNOWLEDGE_SCHEMA_VERSION).toBe("1.0.0");
  });

  test("mbështet tetë gjuhë", () => {
    expect(SUPPORTED_KNOWLEDGE_LANGUAGES).toHaveLength(8);
    expect(SUPPORTED_KNOWLEDGE_LANGUAGES).toContain("sq");
    expect(SUPPORTED_KNOWLEDGE_LANGUAGES).toContain("en");
  });

  test("krijon një hyrje të vlefshme në shqip", () => {
    const result = createLanguageKnowledgeEntry({
      id: "sq-greeting-001",
      language: "sq",
      lemma: "përshëndetje",
      type: "word",
      partOfSpeech: "noun",
      definitions: ["Shprehje që përdoret për të përshëndetur."],
      translations: {
        en: ["greeting"],
        fr: ["salutation"]
      },
      synonyms: ["tungjatjeta"],
      examples: ["Përshëndetje, si je?"],
      confidence: "high"
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.entry.language).toBe("sq");
    expect(result.entry.translations.en).toContain("greeting");
  });

  test("normalizon hapësirat dhe shkronjat e kodit të gjuhës", () => {
    const result = createLanguageKnowledgeEntry({
      id: "en-word-001",
      language: " EN ",
      lemma: " hello ",
      type: "word"
    });

    expect(result.valid).toBe(true);
    expect(result.entry.language).toBe("en");
    expect(result.entry.lemma).toBe("hello");
  });

  test("refuzon një hyrje pa ID", () => {
    const result = createLanguageKnowledgeEntry({
      language: "sq",
      lemma: "libër",
      type: "word"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Entry id is required.");
  });

  test("refuzon një gjuhë të pambështetur", () => {
    const result = createLanguageKnowledgeEntry({
      id: "xx-word-001",
      language: "xx",
      lemma: "example",
      type: "word"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "A supported language code is required."
    );
  });

  test("refuzon një lloj hyrjeje të panjohur", () => {
    const result = createLanguageKnowledgeEntry({
      id: "sq-word-002",
      language: "sq",
      lemma: "libër",
      type: "unknown-type"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "A supported entry type is required."
    );
  });

  test("refuzon një pjesë të panjohur të ligjëratës", () => {
    const result = createLanguageKnowledgeEntry({
      id: "sq-word-003",
      language: "sq",
      lemma: "libër",
      type: "word",
      partOfSpeech: "made-up-category"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Unsupported part of speech."
    );
  });

  test("refuzon nivelin e panjohur të besueshmërisë", () => {
    const result = createLanguageKnowledgeEntry({
      id: "sq-word-004",
      language: "sq",
      lemma: "libër",
      type: "word",
      confidence: "certain"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Unsupported confidence level."
    );
  });

  test("jep paralajmërime kur mungojnë përkufizimet dhe shembujt", () => {
    const result = createLanguageKnowledgeEntry({
      id: "sq-word-005",
      language: "sq",
      lemma: "libër",
      type: "word"
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "The entry has no definitions."
    );
    expect(result.warnings).toContain(
      "The entry has no examples."
    );
  });

  test("validon një hyrje ekzistuese", () => {
    const result = validateLanguageKnowledgeEntry({
      id: "fr-word-001",
      language: "fr",
      lemma: "bonjour",
      type: "word"
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("refuzon koleksionin që nuk është array", () => {
    const result = createLanguageKnowledgeCollection({});

    expect(result.valid).toBe(false);
    expect(result.entries).toEqual([]);
    expect(result.errors).toContain(
      "Entries must be an array."
    );
  });

  test("krijon një koleksion me hyrje të vlefshme", () => {
    const result = createLanguageKnowledgeCollection([
      {
        id: "sq-word-010",
        language: "sq",
        lemma: "shtëpi",
        type: "word"
      },
      {
        id: "en-word-010",
        language: "en",
        lemma: "house",
        type: "word"
      }
    ]);

    expect(result.valid).toBe(true);
    expect(result.entries).toHaveLength(2);
    expect(result.errors).toEqual([]);
  });

  test("refuzon ID-të e përsëritura brenda koleksionit", () => {
    const result = createLanguageKnowledgeCollection([
      {
        id: "sq-word-011",
        language: "sq",
        lemma: "shtëpi",
        type: "word"
      },
      {
        id: "sq-word-011",
        language: "sq",
        lemma: "banesë",
        type: "word"
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.entries).toHaveLength(1);
    expect(result.errors).toContain(
      'Entry 1: duplicate id "sq-word-011".'
    );
  });

  test("normalizon listat dhe heq dublikatat", () => {
    const result = createLanguageKnowledgeEntry({
      id: "sq-word-012",
      language: "sq",
      lemma: "i bukur",
      type: "word",
      synonyms: ["i hijshëm", " i hijshëm ", "", "i mirë"]
    });

    expect(result.valid).toBe(true);
    expect(result.entry.synonyms).toEqual([
      "i hijshëm",
      "i mirë"
    ]);
  });

  test("nuk lejon që një hyrje e pavlefshme të hyjë në koleksion", () => {
    const result = createLanguageKnowledgeCollection([
      {
        id: "sq-word-013",
        language: "sq",
        lemma: "libër",
        type: "word"
      },
      {
        id: "",
        language: "sq",
        lemma: "shkollë",
        type: "word"
      }
    ]);

    expect(result.valid).toBe(false);
    expect(result.entries).toHaveLength(1);
    expect(result.errors).toContain(
      "Entry 1: Entry id is required."
    );
  });
});
