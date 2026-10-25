import { describe, expect, test } from "vitest";

import {
  LANGUAGE_KNOWLEDGE_ENGINE_VERSION,
  createLanguageKnowledgeEngine,
  createDefaultLanguageKnowledgeEngine
} from "../../src/core/language-knowledge-engine.js";

function createEntry(overrides = {}) {
  return {
    id: "sq-greeting-001",
    language: "sq",
    lemma: "përshëndetje",
    type: "word",
    definitions: ["Shprehje që përdoret për të përshëndetur."],
    translations: {
      en: ["greeting"],
      fr: ["salutation"]
    },
    synonyms: ["tungjatjeta"],
    examples: ["Përshëndetje, si je?"],
    ...overrides
  };
}

describe("Language Knowledge Engine", () => {
  test("versioni i motorit është 1.0.0", () => {
    expect(LANGUAGE_KNOWLEDGE_ENGINE_VERSION).toBe("1.0.0");
  });

  test("krijon një motor të ri", () => {
    const engine = createLanguageKnowledgeEngine();

    expect(engine.version).toBe("1.0.0");
    expect(engine.getStats().totalEntries).toBe(0);
  });

  test("krijon motorin e parazgjedhur", () => {
    const engine = createDefaultLanguageKnowledgeEngine();

    expect(engine.version).toBe("1.0.0");
    expect(engine.getStats().totalEntries).toBe(0);
  });

  test("regjistron një hyrje të vlefshme", () => {
    const engine = createLanguageKnowledgeEngine();
    const result = engine.register(createEntry());

    expect(result.success).toBe(true);
    expect(result.entry.id).toBe("sq-greeting-001");
    expect(engine.getStats().totalEntries).toBe(1);
  });

  test("refuzon një hyrje të pavlefshme", () => {
    const engine = createLanguageKnowledgeEngine();
    const result = engine.register({
      language: "sq",
      lemma: "libër",
      type: "word"
    });

    expect(result.success).toBe(false);
    expect(result.entry).toBeNull();
    expect(result.errors).toContain("Entry id is required.");
    expect(engine.getStats().totalEntries).toBe(0);
  });

  test("refuzon ID-të e përsëritura", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.register(
      createEntry({
        lemma: "tungjatjeta"
      })
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Entry id "sq-greeting-001" already exists.'
    );
    expect(engine.getStats().totalEntries).toBe(1);
  });

  test("merr një hyrje sipas ID-së", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.getById("sq-greeting-001");

    expect(result.lemma).toBe("përshëndetje");
    expect(result.language).toBe("sq");
  });

  test("kthen null për një ID që nuk ekziston", () => {
    const engine = createLanguageKnowledgeEngine();

    expect(engine.getById("missing-entry")).toBeNull();
  });

  test("kërkon sipas fjalës", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.search({
      query: "përshëndetje",
      language: "sq"
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.results[0].id).toBe("sq-greeting-001");
  });

  test("kërkon sipas sinonimit", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.search({
      query: "tungjatjeta",
      language: "sq"
    });

    expect(result.total).toBe(1);
    expect(result.results[0].lemma).toBe("përshëndetje");
  });

  test("kërkon sipas përkufizimit", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.search({
      query: "përshëndetur",
      language: "sq"
    });

    expect(result.total).toBe(1);
  });

  test("filtron rezultatet sipas gjuhës", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    engine.register(
      createEntry({
        id: "en-greeting-001",
        language: "en",
        lemma: "greeting",
        translations: {
          sq: ["përshëndetje"]
        }
      })
    );

    const result = engine.search({
      query: "greeting",
      language: "en"
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].language).toBe("en");
  });

  test("refuzon një kërkim bosh", () => {
    const engine = createLanguageKnowledgeEngine();

    const result = engine.search({
      query: "   "
    });

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.errors).toContain(
      "Search query must not be empty."
    );
  });

  test("refuzon një filtër gjuhe të pambështetur", () => {
    const engine = createLanguageKnowledgeEngine();

    const result = engine.search({
      query: "hello",
      language: "xx"
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      "Unsupported language filter."
    );
  });

  test("gjen përkthimet ndërmjet gjuhëve", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.getTranslations({
      query: "përshëndetje",
      sourceLanguage: "sq",
      targetLanguage: "en",
      exact: true
    });

    expect(result.success).toBe(true);
    expect(result.translations).toHaveLength(1);
    expect(result.translations[0].text).toBe("greeting");
    expect(result.translations[0].targetLanguage).toBe("en");
  });

  test("kthen listë bosh kur nuk ka përkthim të regjistruar", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.getTranslations({
      query: "përshëndetje",
      sourceLanguage: "sq",
      targetLanguage: "de",
      exact: true
    });

    expect(result.success).toBe(true);
    expect(result.translations).toEqual([]);
  });

  test("regjistron disa hyrje", () => {
    const engine = createLanguageKnowledgeEngine();

    const result = engine.registerMany([
      createEntry(),
      createEntry({
        id: "sq-book-001",
        lemma: "libër",
        translations: {
          en: ["book"]
        }
      })
    ]);

    expect(result.success).toBe(true);
    expect(result.registered).toHaveLength(2);
    expect(engine.getStats().totalEntries).toBe(2);
  });

  test("raporton hyrjet e pasuksesshme gjatë regjistrimit masiv", () => {
    const engine = createLanguageKnowledgeEngine();

    const result = engine.registerMany([
      createEntry(),
      {
        language: "sq",
        lemma: "libër",
        type: "word"
      }
    ]);

    expect(result.success).toBe(false);
    expect(result.registered).toHaveLength(1);
    expect(result.errors).toContain(
      "Entry id is required."
    );
  });

  test("heq një hyrje dhe përditëson numrin total", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.remove("sq-greeting-001");

    expect(result.success).toBe(true);
    expect(result.removed).toBe(true);
    expect(engine.getById("sq-greeting-001")).toBeNull();
    expect(engine.getStats().totalEntries).toBe(0);
  });

  test("refuzon heqjen e një ID-je që nuk ekziston", () => {
    const engine = createLanguageKnowledgeEngine();

    const result = engine.remove("missing-entry");

    expect(result.success).toBe(false);
    expect(result.removed).toBe(false);
  });

  test("përditëson statistikat sipas gjuhës", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    engine.register(
      createEntry({
        id: "en-greeting-002",
        language: "en",
        lemma: "greeting"
      })
    );

    const stats = engine.getStats();

    expect(stats.totalEntries).toBe(2);
    expect(stats.languageCounts.sq).toBe(1);
    expect(stats.languageCounts.en).toBe(1);
  });

  test("pastron të gjitha hyrjet", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());
    engine.register(
      createEntry({
        id: "en-greeting-003",
        language: "en",
        lemma: "greeting"
      })
    );

    const result = engine.clear();

    expect(result.success).toBe(true);
    expect(result.removedCount).toBe(2);
    expect(engine.getStats().totalEntries).toBe(0);
  });

  test("ndryshimet te rezultati nuk ndryshojnë hyrjen e ruajtur", () => {
    const engine = createLanguageKnowledgeEngine();

    engine.register(createEntry());

    const result = engine.getById("sq-greeting-001");

    result.synonyms.push("ndryshim i jashtëm");
    result.translations.en.push("external change");

    const stored = engine.getById("sq-greeting-001");

    expect(stored.synonyms).not.toContain("ndryshim i jashtëm");
    expect(stored.translations.en).not.toContain("external change");
  });

  test("motorët e veçantë kanë koleksione të izoluara", () => {
    const firstEngine = createLanguageKnowledgeEngine();
    const secondEngine = createLanguageKnowledgeEngine();

    firstEngine.register(createEntry());

    expect(firstEngine.getStats().totalEntries).toBe(1);
    expect(secondEngine.getStats().totalEntries).toBe(0);
  });
});
