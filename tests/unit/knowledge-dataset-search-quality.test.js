import { describe, expect, test } from "vitest";

import {
  createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

import {
  createKnowledgeDatasetSearchAdapter
} from "../../src/knowledge/knowledge-dataset-search-adapter.js";

function createEntry(overrides = {}) {
  return {
    id: "xsus-entry",
    title: "XSUS AI dhe programimi",
    content: "XSUS AI mbështet zhvillimin e softuerit.",
    domain: "programming",
    topic: "XSUS AI",
    language: "sq",
    difficulty: "beginner",
    status: "verified",
    keywords: ["XSUS", "AI", "programim"],
    tags: ["technology"],
    ...overrides
  };
}

function createRegistry() {
  const registry = createKnowledgeDatasetRegistry();

  const first = registry.registerDataset("sq-knowledge", [
    createEntry({
      id: "sq-programming",
      language: "sq",
      domain: "programming"
    }),
    createEntry({
      id: "sq-science",
      title: "XSUS AI dhe shkenca",
      content: "XSUS AI dhe njohuritë shkencore.",
      id: "sq-science",
      language: "sq",
      domain: "science"
    })
  ]);

  const second = registry.registerDataset("en-knowledge", [
    createEntry({
      id: "en-programming",
      title: "XSUS AI and programming",
      content: "XSUS AI supports software development.",
      language: "en",
      domain: "programming",
      keywords: ["XSUS", "AI", "programming"]
    })
  ]);

  if (!first.success || !second.success) {
    throw new Error("Dataset-et testuese nuk u regjistruan.");
  }

  return registry;
}

describe("Knowledge Dataset Search — Quality", () => {
  test("gjen rezultat me shkronja të mëdha ose të vogla", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry()
    });

    const upper = adapter.search("XSUS AI", {
      language: "sq"
    });

    const lower = adapter.search("xsus ai", {
      language: "sq"
    });

    expect(upper.success).toBe(true);
    expect(lower.success).toBe(true);
    expect(upper.results.length).toBeGreaterThan(0);
    expect(lower.results.map((item) => item.id)).toEqual(
      upper.results.map((item) => item.id)
    );
  });

  test("kombinon saktë filtrat e gjuhës dhe domenit", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry()
    });

    const result = adapter.search("XSUS AI", {
      language: "sq",
      domain: "programming"
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);

    expect(
      result.results.every(
        (item) =>
          item.language === "sq" &&
          item.domain === "programming"
      )
    ).toBe(true);
  });

  test("kërkon në dataset-e të shumta", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry()
    });

    const result = adapter.search("XSUS AI");

    expect(result.success).toBe(true);

    expect(
      result.results.some(
        (item) => item.datasetId === "sq-knowledge"
      )
    ).toBe(true);

    expect(
      result.results.some(
        (item) => item.datasetId === "en-knowledge"
      )
    ).toBe(true);

    expect(result.metadata.datasetCount).toBe(2);
  });

  test("përjashton rezultatet e një domeni tjetër", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry()
    });

    const result = adapter.search("XSUS AI", {
      domain: "programming"
    });

    expect(result.success).toBe(true);

    expect(
      result.results.every(
        (item) => item.domain === "programming"
      )
    ).toBe(true);
  });

  test("kthen metadata të sakta për kërkimin shumëgjuhësh", () => {
    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: createRegistry()
    });

    const result = adapter.search("XSUS AI");

    expect(result.success).toBe(true);
    expect(result.metadata.query).toBe("xsus ai");
    expect(result.metadata.language).toBe(null);
    expect(result.metadata.domain).toBe(null);
    expect(result.metadata.datasetCount).toBe(2);
    expect(result.metadata.resultCount).toBe(
      result.results.length
    );
    expect(result.metadata.matchedCount).toBeGreaterThanOrEqual(
      result.metadata.resultCount
    );
  });
});
