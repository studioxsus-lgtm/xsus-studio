import { describe, expect, test } from "vitest";

import {
  createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

import {
  createKnowledgeDatasetSearchAdapter,
  createKnowledgeDatasetSearchProvider
} from "../../src/knowledge/knowledge-dataset-search-adapter.js";

function createEntry(overrides = {}) {
  return {
    id: "javascript-basics",
    title: "JavaScript Fundamentals",
    content: "JavaScript is a programming language.",
    domain: "programming",
    topic: "JavaScript",
    language: "en",
    difficulty: "beginner",
    status: "verified",
    keywords: ["JavaScript", "programming"],
    tags: ["web"],
    ...overrides
  };
}

function createRegistryWithEntries(
  entries,
  datasetId = "test-data"
) {
  const registry = createKnowledgeDatasetRegistry();

  const registration = registry.registerDataset(
    datasetId,
    entries
  );

  if (!registration.success) {
    throw new Error("Dataset-i testues nuk u regjistrua.");
  }

  return registry;
}

describe("Knowledge Dataset Search Adapter", () => {
  test("krijohet me një registry të vlefshëm", () => {
    const registry = createKnowledgeDatasetRegistry();

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    expect(adapter.getMetadata()).toEqual({
      engine: "xsus-knowledge-dataset-search-adapter",
      version: "1.0.0"
    });
  });

  test("refuzon një registry të pavlefshëm", () => {
    expect(() =>
      createKnowledgeDatasetSearchAdapter({
        registry: {}
      })
    ).toThrow(TypeError);
  });

  test("gjen një hyrje sipas titullit", () => {
    const registry = createRegistryWithEntries([
      createEntry()
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("JavaScript");

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("javascript-basics");
    expect(result.results[0].searchScore).toBeGreaterThan(0);
  });

  test("filtron rezultatet sipas gjuhës", () => {
    const registry = createRegistryWithEntries([
      createEntry({
        id: "js-en",
        language: "en"
      }),
      createEntry({
        id: "js-sq",
        title: "Bazat e JavaScript",
        content: "JavaScript është gjuhë programimi.",
        language: "sq"
      })
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("JavaScript", {
      language: "sq"
    });

    expect(result.success).toBe(true);
    expect(
      result.results.every((entry) => entry.language === "sq")
    ).toBe(true);
  });

  test("filtron rezultatet sipas domenit", () => {
    const registry = createRegistryWithEntries([
      createEntry({
        id: "programming-entry",
        domain: "programming"
      }),
      createEntry({
        id: "science-entry",
        domain: "science"
      })
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("JavaScript", {
      domain: "science"
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].domain).toBe("science");
  });

  test("respekton kufirin e rezultateve", () => {
    const registry = createRegistryWithEntries([
      createEntry({ id: "js-1" }),
      createEntry({ id: "js-2" }),
      createEntry({ id: "js-3" })
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("JavaScript", {
      limit: 2
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.metadata.matchedCount).toBe(3);
  });

  test("kthehet pa rezultate kur nuk ka përputhje", () => {
    const registry = createRegistryWithEntries([
      createEntry()
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("quantum astronomy");

    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.metadata.resultCount).toBe(0);
  });

  test("refuzon pyetjen bosh", () => {
    const registry = createKnowledgeDatasetRegistry();

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("   ");

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  test("refuzon pyetjet tepër të gjata", () => {
    const registry = createKnowledgeDatasetRegistry();

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("a".repeat(8001));

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
  });

  test("nuk ndryshon hyrjet origjinale", () => {
    const entry = createEntry();
    const originalTitle = entry.title;

    const registry = createRegistryWithEntries([entry]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    adapter.search("JavaScript");

    expect(entry.title).toBe(originalTitle);
    expect(entry).not.toHaveProperty("searchScore");
    expect(entry).not.toHaveProperty("datasetId");
  });

  test("kthen metadata dhe rezultate të ngrira", () => {
    const registry = createRegistryWithEntries([
      createEntry()
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("JavaScript");

    expect(result.metadata.engine).toBe(
      "xsus-knowledge-dataset-search-adapter"
    );

    expect(Object.isFrozen(result.results[0])).toBe(true);
    expect(Object.isFrozen(result.results[0].keywords)).toBe(true);
    expect(Object.isFrozen(result.results[0].tags)).toBe(true);
  });

  test("ofron funksionin e kërkimit për integrimin e ardhshëm", () => {
    const registry = createRegistryWithEntries([
      createEntry()
    ]);

    const provider = createKnowledgeDatasetSearchProvider({
      registry
    });

    const result = provider.searchKnowledgeDataset(
      "JavaScript",
      { language: "en" }
    );

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(provider.getMetadata().version).toBe("1.0.0");
  });

  test("rendit përputhjen e saktë të titullit mbi përputhjen në përmbajtje", () => {
    const registry = createRegistryWithEntries([
      createEntry({
        id: "content-match",
        title: "Web Development",
        content: "JavaScript is a programming language."
      }),
      createEntry({
        id: "title-match",
        title: "JavaScript",
        content: "A language used to build web applications."
      })
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("JavaScript");

    expect(result.success).toBe(true);
    expect(result.results.length).toBe(2);
    expect(result.results[0].id).toBe("title-match");
    expect(result.results[0].searchScore).toBeGreaterThan(
      result.results[1].searchScore
    );
  });

  test("mbështet kodin rajonal të gjuhës sq-AL", () => {
    const registry = createRegistryWithEntries([
      createEntry({
        id: "sq-entry",
        title: "Bazat e JavaScript",
        content: "JavaScript është gjuhë programimi.",
        language: "sq"
      }),
      createEntry({
        id: "en-entry",
        language: "en"
      })
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("JavaScript", {
      language: "sq-AL"
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("sq-entry");
    expect(result.metadata.language).toBe("sq-AL");
  });

  test("rendit rezultatet në mënyrë të qëndrueshme kur pikët janë të barabarta", () => {
    const registry = createRegistryWithEntries([
      createEntry({ id: "js-c" }),
      createEntry({ id: "js-a" }),
      createEntry({ id: "js-b" })
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const firstResult = adapter.search("JavaScript");
    const secondResult = adapter.search("JavaScript");

    const firstIds = firstResult.results.map(
      (entry) => entry.id
    );

    const secondIds = secondResult.results.map(
      (entry) => entry.id
    );

    expect(firstIds).toEqual(["js-a", "js-b", "js-c"]);
    expect(secondIds).toEqual(firstIds);
  });

  test("kthen metadata të sakta kur nuk gjenden rezultate", () => {
    const registry = createRegistryWithEntries([
      createEntry()
    ]);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("quantum astronomy");

    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.metadata.resultCount).toBe(0);
    expect(result.metadata.matchedCount).toBe(0);
    expect(result.metadata.limit).toBe(10);
    expect(result.metadata.datasetCount).toBe(1);
  });
});
