import { describe, expect, test } from "vitest";

import {
  searchKnowledge,
  registerKnowledgeSource
} from "../../src/knowledge/knowledge-service.js";

describe("XSUS Knowledge Ranking", () => {
  test("rendit përputhjen e saktë të titullit më lart", async () => {
    const sourceName = "ranking-exact-title-test";

    const removeSource = registerKnowledgeSource(
      sourceName,
      async () => [
        {
          title: "Informacion i përgjithshëm",
          content: "JavaScript përdoret për zhvillim."
        },
        {
          title: "JavaScript",
          content: "JavaScript është gjuhë programimi."
        }
      ]
    );

    try {
      const result = await searchKnowledge("JavaScript", {
        language: "en",
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].title).toBe("JavaScript");
    } finally {
      removeSource();
    }
  });

  test("heq rezultatet identike", async () => {
    const sourceName = "ranking-duplicate-test";

    const removeSource = registerKnowledgeSource(
      sourceName,
      async () => [
        {
          title: "XSUS test",
          content: "Përmbajtje unike për testin."
        },
        {
          title: "XSUS test",
          content: "Përmbajtje unike për testin."
        }
      ]
    );

    try {
      const result = await searchKnowledge("XSUS test", {
        limit: 50
      });

      const duplicates = result.results.filter(
        item =>
          item.title === "XSUS test" &&
          item.content === "Përmbajtje unike për testin."
      );

      expect(duplicates).toHaveLength(1);
    } finally {
      removeSource();
    }
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
});
