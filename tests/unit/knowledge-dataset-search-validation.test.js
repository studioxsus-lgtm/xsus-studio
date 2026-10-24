import { describe, expect, test } from "vitest";

import {
  createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

import {
  createKnowledgeDatasetSearchAdapter
} from "../../src/knowledge/knowledge-dataset-search-adapter.js";

function createAdapter() {
  const registry = createKnowledgeDatasetRegistry();

  const registration = registry.registerDataset("validation-test", [
    {
      id: "js-basics",
      title: "JavaScript Fundamentals",
      content: "JavaScript is a programming language.",
      domain: "programming",
      topic: "JavaScript",
      language: "en",
      difficulty: "beginner",
      status: "verified",
      keywords: ["JavaScript"],
      tags: ["web"]
    }
  ]);

  if (!registration.success) {
    throw new Error("Dataset-i testues nuk u regjistrua.");
  }

  return createKnowledgeDatasetSearchAdapter({ registry });
}

describe("Knowledge Dataset Search — Validation", () => {
  test("kufizon limit-in zero në minimumin 1", () => {
    const adapter = createAdapter();

    const result = adapter.search("JavaScript", {
      limit: 0
    });

    expect(result.success).toBe(true);
    expect(result.metadata.limit).toBe(1);
    expect(result.results).toHaveLength(1);
  });

  test("kufizon limit-in e madh në maksimumin 50", () => {
    const adapter = createAdapter();

    const result = adapter.search("JavaScript", {
      limit: 100
    });

    expect(result.success).toBe(true);
    expect(result.metadata.limit).toBe(50);
    expect(result.results.length).toBeLessThanOrEqual(50);
  });

  test("nuk hedh përjashtim për gjuhë të pavlefshme", () => {
    const adapter = createAdapter();

    expect(() => {
      adapter.search("JavaScript", {
        language: "invalid_language_123"
      });
    }).not.toThrow();
  });

  test("ruan hyrjen origjinale pas kërkimit", () => {
    const registry = createKnowledgeDatasetRegistry();

    const entry = {
      id: "integrity-entry",
      title: "XSUS Integrity",
      content: "Testing knowledge integrity.",
      domain: "technology",
      topic: "integrity",
      language: "en",
      difficulty: "beginner",
      status: "verified",
      keywords: ["integrity"],
      tags: ["testing"]
    };

    const originalEntry = structuredClone(entry);

    const registration = registry.registerDataset(
      "integrity-test",
      [entry]
    );

    expect(registration.success).toBe(true);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const result = adapter.search("integrity");

    expect(result.success).toBe(true);
    expect(entry).toEqual(originalEntry);
    expect(entry).not.toHaveProperty("searchScore");
    expect(entry).not.toHaveProperty("datasetId");
  });

  test("kthen rezultate të ngrira me metadata të sakta", () => {
    const adapter = createAdapter();

    const result = adapter.search("JavaScript");

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);

    expect(result.metadata.engine).toBe(
      "xsus-knowledge-dataset-search-adapter"
    );

    expect(result.metadata.version).toBe("1.0.0");

    expect(Object.isFrozen(result.results[0])).toBe(true);
    expect(Object.isFrozen(result.results[0].keywords)).toBe(true);
    expect(Object.isFrozen(result.results[0].tags)).toBe(true);
  });
});
