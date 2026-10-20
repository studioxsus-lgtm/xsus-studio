import { afterEach, describe, expect, test } from "vitest";

import {
  searchKnowledge,
  registerKnowledgeSource
} from "../../src/knowledge/knowledge-service.js";

describe("XSUS Knowledge Ranking", () => {
  const cleanupFunctions = [];

  afterEach(() => {
    while (cleanupFunctions.length > 0) {
      cleanupFunctions.pop()();
    }
  });

  function registerTestSource(name, provider) {
    const removeSource = registerKnowledgeSource(name, provider);
    cleanupFunctions.push(removeSource);
    return removeSource;
  }

  test("rendit përputhjen e saktë të titullit më lart", async () => {
    registerTestSource(
      "ranking-exact-title-test",
      async () => [
        {
          id: "general-info",
          title: "Informacion i përgjithshëm",
          content: "JavaScript përdoret për zhvillim.",
          domain: "programming",
          language: "en"
        },
        {
          id: "javascript-exact",
          title: "JavaScript",
          content: "JavaScript është gjuhë programimi.",
          domain: "programming",
          language: "en"
        }
      ]
    );

    const result = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 10
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].title).toBe("JavaScript");
  });

  test("heq rezultatet identike", async () => {
    registerTestSource(
      "ranking-duplicate-test",
      async () => [
        {
          id: "duplicate-a",
          title: "XSUS test",
          content: "Përmbajtje unike për testin.",
          domain: "general",
          language: "sq"
        },
        {
          id: "duplicate-b",
          title: "XSUS test",
          content: "Përmbajtje unike për testin.",
          domain: "general",
          language: "sq"
        }
      ]
    );

    const result = await searchKnowledge("XSUS test", {
      language: "sq",
      limit: 50
    });

    const duplicates = result.results.filter(
      item =>
        item.title === "XSUS test" &&
        item.content === "Përmbajtje unike për testin."
    );

    expect(duplicates).toHaveLength(1);
  });

  test("kufizon numrin e rezultateve", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 2
    });

    expect(result.results.length).toBeLessThanOrEqual(2);
  });

  test("raporton metadata të renditjes", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en"
    });

    expect(result.success).toBe(true);
    expect(result.metadata.rankingEnabled).toBe(true);
    expect(result.metadata.deduplicationEnabled).toBe(true);
    expect(result.metadata.resultCount).toBe(result.results.length);
  });

  test("jep renditje të përsëritshme për të njëjtën pyetje", async () => {
    const first = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 10
    });

    const second = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 10
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    expect(
      first.results.map(item => ({
        title: item.title,
        content: item.content,
        source: item.source
      }))
    ).toEqual(
      second.results.map(item => ({
        title: item.title,
        content: item.content,
        source: item.source
      }))
    );
  });

  test("nuk tejkalon kufirin maksimal të rezultateve", async () => {
    const result = await searchKnowledge("JavaScript", {
      language: "en",
      limit: 1000
    });

    expect(result.results.length).toBeLessThanOrEqual(50);
  });
});
