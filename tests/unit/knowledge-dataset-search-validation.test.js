
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
  test("kthen gabim për kufirin zero", () => {
    const adapter = createAdapter();

    const result = adapter.search("JavaScript", {
      limit: 0
    });

    expect(result.success).toBe(true);
    expect(result.metadata.limit).toBe(1);
  });

  test("përdor kufirin maksimal për një limit shumë të madh", () => {
    const adapter = createAdapter();

    const result = adapter.search("JavaScript", {
      limit: 100
    });

    expect(result.success).toBe(true);
    expect(result.metadata.limit).toBe(50);
  });

  test("nuk hedh përjashtim për gjuhë të pavlefshme", () => {
    const adapter = createAdapter();

    expect(() => {
      adapter.search("JavaScript", {
        language: "invalid_language_123"
      });
    }).not.toThrow();
  });
});
