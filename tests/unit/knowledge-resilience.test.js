import { describe, expect, test } from "vitest";

import {
  searchKnowledge,
  registerKnowledgeSource,
  unregisterKnowledgeSource,
  hasKnowledgeSource
} from "../../src/knowledge/knowledge-service.js";

describe("XSUS Knowledge Resilience", () => {
  test("vazhdon kërkimin kur një burim dështon", async () => {
    const sourceName = "resilience-error-test";

    const removeSource = registerKnowledgeSource(
      sourceName,
      async () => {
        throw new Error("Gabim testimi");
      }
    );

    try {
      const result = await searchKnowledge("JavaScript", {
        language: "en"
      });

      expect(result.success).toBe(true);
      expect(result.errors.some(
        item =>
          item.source === sourceName &&
          item.error === "Gabim testimi"
      )).toBe(true);
    } finally {
      removeSource();
    }
  });

  test("injoron rezultatet e pavlefshme nga burimet shtesë", async () => {
    const sourceName = "resilience-invalid-test";

    const removeSource = registerKnowledgeSource(
      sourceName,
      async () => [
        null,
        123,
        {},
        { content: "   " },
        { content: "Rezultat i vlefshëm testimi" }
      ]
    );

    try {
      const result = await searchKnowledge("testim", {
        limit: 50
      });

      expect(result.success).toBe(true);

      expect(
        result.results.some(
          item => item.content === "Rezultat i vlefshëm testimi"
        )
      ).toBe(true);

      expect(
        result.results.some(
          item => item.content === "   "
        )
      ).toBe(false);
    } finally {
      removeSource();
    }
  });

  test("regjistron dhe çregjistron një burim", () => {
    const sourceName = "resilience-register-test";
    const provider = async () => [];

    const removeSource = registerKnowledgeSource(
      sourceName,
      provider
    );

    expect(hasKnowledgeSource(sourceName)).toBe(true);

    removeSource();

    expect(hasKnowledgeSource(sourceName)).toBe(false);
  });

  test("refuzon regjistrimin e dyfishtë", () => {
    const sourceName = "resilience-duplicate-register";
    const provider = async () => [];

    const removeSource = registerKnowledgeSource(
      sourceName,
      provider
    );

    try {
      expect(() =>
        registerKnowledgeSource(sourceName, async () => [])
      ).toThrow(/regjistruar tashmë/);
    } finally {
      removeSource();
    }
  });

  test("trajton kërkimin bosh në mënyrë të sigurt", async () => {
    const result = await searchKnowledge("   ");

    expect(result.success).toBe(false);
    expect(result.results).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  test("çregjistron burimin me emër", () => {
    const sourceName = "resilience-unregister-test";

    registerKnowledgeSource(
      sourceName,
      async () => []
    );

    expect(unregisterKnowledgeSource(sourceName)).toBe(true);
    expect(unregisterKnowledgeSource(sourceName)).toBe(false);
  });
});
