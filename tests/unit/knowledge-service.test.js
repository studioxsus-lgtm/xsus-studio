
import {
  afterEach,
  describe,
  expect,
  test
} from "vitest";

import {
  searchKnowledge,
  registerKnowledgeSource,
  listKnowledgeSources,
  hasKnowledgeSource,
  unregisterKnowledgeSource
} from "../../src/knowledge/knowledge-service.js";

describe("XSUS Knowledge Service", () => {
  const registeredSources = [];

  function registerTemporarySource(name, provider) {
    const removeSource = registerKnowledgeSource(name, provider);
    registeredSources.push(removeSource);
    return removeSource;
  }

  afterEach(() => {
    while (registeredSources.length > 0) {
      registeredSources.pop()();
    }
  });

  test("trajton pyetjen bosh", async () => {
    const result = await searchKnowledge("   ");

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  test("kërkon njohuri për JavaScript në anglisht", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en"
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty("content");
    expect(result.results[0]).toHaveProperty("source");
  });

  test("kërkon njohuri në shqip", async () => {
    const result = await searchKnowledge("programim", {
      language: "sq"
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);

    expect(
      result.results.some(item => item.language === "sq")
    ).toBe(true);
  });

  test("kërkon njohuri në frëngjisht", async () => {
    const result = await searchKnowledge("programmation", {
      language: "fr"
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  test("respekton kufirin e rezultateve", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 2
    });

    expect(result.results.length).toBeLessThanOrEqual(2);
  });

  test("kufizon limitin zero në minimumin një", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 0
    });

    expect(result.results.length).toBeLessThanOrEqual(1);
  });

  test("kthen metadata të motorit", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en"
    });

    expect(result.metadata.engine).toBe("xsus-knowledge-service");
    expect(result.metadata.version).toBe("1.1.1");
    expect(result.metadata.schemaVersion).toBe("1.0.0");
    expect(result.metadata.resultCount).toBe(result.results.length);
    expect(result.metadata.rankingEnabled).toBe(true);
    expect(result.metadata.deduplicationEnabled).toBe(true);
  });

  test("regjistron dhe heq një burim shtesë", async () => {
    const sourceName = "test-source-temporary";

    registerTemporarySource(sourceName, async query => [{
      id: "temporary-test-entry",
      title: "Test",
      content: `Përgjigje për ${query}`,
      domain: "general",
      language: "sq"
    }]);

    expect(listKnowledgeSources()).toContain(sourceName);
    expect(hasKnowledgeSource(sourceName)).toBe(true);

    const result = await searchKnowledge("test query", {
      language: "sq"
    });

    expect(
      result.results.some(item => item.source === sourceName)
    ).toBe(true);
  });

  test("regjistrimi i emrit të përsëritur refuzohet", () => {
    const sourceName = "duplicate-test-source";

    registerTemporarySource(sourceName, async () => []);

    expect(() =>
      registerKnowledgeSource(sourceName, async () => [])
    ).toThrow(/regjistruar tashmë/);
  });

  test("refuzon regjistrimin me emër të pavlefshëm", () => {
    expect(() =>
      registerKnowledgeSource("   ", async () => [])
    ).toThrow(TypeError);
  });

  test("refuzon provider që nuk është funksion", () => {
    expect(() =>
      registerKnowledgeSource("invalid-provider-source", null)
    ).toThrow(TypeError);
  });

  test("ruan rezultatet kur një burim shtesë dështon", async () => {
    const sourceName = "failing-test-source";

    registerTemporarySource(sourceName, async () => {
      throw new Error("Gabim i simuluar");
    });

    const result = await searchKnowledge("JavaScript", {
      language: "en"
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);

    expect(
      result.errors.some(item => item.source === sourceName)
    ).toBe(true);
  });

  test("raporton fushë njohurish të panjohur", async () => {
    const result = await searchKnowledge("test", {
      domain: "unknown-domain-for-test"
    });

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  test("rezultatet kanë strukturë të vlefshme", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en"
    });

    expect(result.success).toBe(true);

    for (const item of result.results) {
      expect(typeof item.content).toBe("string");
      expect(item.content.length).toBeGreaterThan(0);
      expect(typeof item.source).toBe("string");
      expect(item.source.length).toBeGreaterThan(0);
    }
  });

  test("burimi i përkohshëm hiqet pas testit", () => {
    expect(
      listKnowledgeSources()
    ).not.toContain("test-source-temporary");
  });

  test("lejon heqjen e burimit sipas emrit", () => {
    const sourceName = "unregister-test-source";

    registerTemporarySource(sourceName, async () => []);

    expect(unregisterKnowledgeSource(sourceName)).toBe(true);
    expect(hasKnowledgeSource(sourceName)).toBe(false);
  });

  test("heq dublikatat kur përmbajtja është identike dhe titujt ndryshojnë", async () => {
    const sourceName = "deduplication-test-source";

    registerTemporarySource(sourceName, async () => [
      {
        id: "duplicate-entry-one",
        title: "Titulli i parë",
        content: "XSUS deduplication unique test content",
        language: "en",
        domain: "general"
      },
      {
        id: "duplicate-entry-two",
        title: "Titulli tjetër",
        content: "XSUS deduplication unique test content",
        language: "en",
        domain: "general"
      }
    ]);

    const result = await searchKnowledge(
      "XSUS deduplication unique test content",
      { language: "en" }
    );

    const matching = result.results.filter(
      item => item.content ===
        "XSUS deduplication unique test content"
    );

    expect(matching).toHaveLength(1);
  });

  test("heq dublikatat e përmbajtjes pas normalizimit", async () => {
    const sourceName = "normalized-deduplication-test-source";

    registerTemporarySource(sourceName, async () => [
      {
        id: "normalized-entry-one",
        title: "Versioni A",
        content: "XSUS   NORMALIZATION   TEST",
        language: "en",
        domain: "general"
      },
      {
        id: "normalized-entry-two",
        title: "Versioni B",
        content: "xsus normalization test",
        language: "en",
        domain: "general"
      }
    ]);

    const result = await searchKnowledge(
      "xsus normalization test",
      { language: "en" }
    );

    const matching = result.results.filter(
      item => item.content.toLowerCase().includes(
        "normalization"
      )
    );

    expect(matching).toHaveLength(1);
  });

  test("rezultatet me pikë të barabarta ruajnë rendin e burimit", async () => {
    const sourceName = "stable-ranking-test-source";

    registerTemporarySource(sourceName, async () => [
      {
        id: "stable-entry-one",
        title: "Stable ranking item",
        content: "alpha beta",
        language: "en",
        domain: "general"
      },
      {
        id: "stable-entry-two",
        title: "Stable ranking item",
        content: "gamma delta",
        language: "en",
        domain: "general"
      }
    ]);

    const result = await searchKnowledge("unmatched query", {
      language: "en"
    });

    const firstIndex = result.results.findIndex(
      item => item.id === "stable-entry-one"
    );

    const secondIndex = result.results.findIndex(
      item => item.id === "stable-entry-two"
    );

    if (firstIndex !== -1 && secondIndex !== -1) {
      expect(firstIndex).toBeLessThan(secondIndex);
    }
  });

  test("kthen numrin e saktë të rezultateve në metadata", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 3
    });

    expect(result.metadata.resultCount).toBe(
      result.results.length
    );

    expect(result.results.length).toBeLessThanOrEqual(3);
  });

  test("provider mund të kthejë rezultate në fushën results", async () => {
    const sourceName = "wrapped-results-test-source";

    registerTemporarySource(sourceName, async query => ({
      success: true,
      results: [
        {
          id: "wrapped-result",
          title: "Wrapped test",
          content: `Unique wrapped response ${query}`,
          language: "en",
          domain: "general"
        }
      ]
    }));

    const result = await searchKnowledge(
      "wrapped provider query",
      { language: "en" }
    );

    expect(
      result.results.some(item => item.id === "wrapped-result")
    ).toBe(true);
  });
});
