import { afterEach, describe, expect, test } from "vitest";

import {
  searchKnowledge,
  registerKnowledgeSource,
  listKnowledgeSources
} from "../../src/knowledge/knowledge-service.js";

describe("XSUS Knowledge Service", () => {
  const registeredSources = [];

  afterEach(() => {
    while (registeredSources.length > 0) {
      const removeSource = registeredSources.pop();
      removeSource();
    }
  });

  test("trajton pyetjen bosh", async () => {
    const result = await searchKnowledge("   ");

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
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

  test("regjistron dhe heq një burim shtesë", async () => {
    const sourceName = "test-source-temporary";

    const removeSource = registerKnowledgeSource(
      sourceName,
      async query => [{
        id: "temporary-test-entry",
        title: "Test",
        content: `Përgjigje për ${query}`,
        domain: "general",
        language: "sq"
      }]
    );

    registeredSources.push(removeSource);

    expect(listKnowledgeSources()).toContain(sourceName);

    const result = await searchKnowledge("test query", {
      language: "sq"
    });

    expect(result.results.some(
      item => item.source === sourceName
    )).toBe(true);
  });

  test("kthen burimin dhe përmbajtjen e rezultateve", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 5
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty("content");
    expect(result.results[0]).toHaveProperty("source");
  });

  test("respekton kufirin e rezultateve", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 2
    });

    expect(result.results.length).toBeLessThanOrEqual(2);
  });

  test("rezultatet kanë strukturë të vlefshme", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en"
    });

    expect(result.success).toBe(true);

    for (const item of result.results) {
      expect(item).toHaveProperty("content");
      expect(item).toHaveProperty("source");
      expect(typeof item.content).toBe("string");
      expect(typeof item.source).toBe("string");
    }
  });

  test("burimi i përkohshëm hiqet pas testit", () => {
    expect(listKnowledgeSources()).not.toContain(
      "test-source-temporary"
    );
  });
});
