
import { describe, expect, test } from "vitest";

import {
  createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

import {
  createKnowledgeDatasetSearchAdapter
} from "../../src/knowledge/knowledge-dataset-search-adapter.js";

import {
  registerKnowledgeDatasetIntegration
} from "../../src/knowledge/knowledge-dataset-integration.js";

import {
  searchKnowledge,
  unregisterKnowledgeSource
} from "../../src/knowledge/knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets";

describe("XSUS AI — Knowledge Dataset Pipeline Diagnostic", () => {
  test("identifikon fazën ku humbet hyrja e dataset-it", async () => {
    unregisterKnowledgeSource(SOURCE_NAME);

    const registry = createKnowledgeDatasetRegistry();

    const entry = {
      id: "orion-fixture-entry",
      title: "Orion Fixture Integration",
      content: "Orion fixture documents a custom XSUS programming integration.",
      domain: "programming",
      topic: "integration",
      language: "en",
      difficulty: "beginner",
      status: "verified",
      keywords: ["orion", "fixture", "integration"],
      tags: ["diagnostic"]
    };

    const registration = registry.registerDataset(
      "orion-fixture-dataset",
      [entry]
    );

    expect(registration.success).toBe(true);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry
    });

    const adapterResult = adapter.search("orion fixture", {
      language: "en",
      domain: "programming"
    });

    expect(adapterResult.success).toBe(true);
    expect(
      adapterResult.results.some(
        item => item.id === "orion-fixture-entry"
      )
    ).toBe(true);

    const integration = registerKnowledgeDatasetIntegration({
      registry
    });

    try {
      const serviceResult = await searchKnowledge(
        "orion fixture",
        {
          language: "en",
          domain: "programming"
        }
      );

      expect(serviceResult.success).toBe(true);
      expect(serviceResult.errors).toEqual([]);
      expect(serviceResult.sources).toContain(SOURCE_NAME);
      expect(
        serviceResult.results.some(
          item => item.id === "orion-fixture-entry"
        )
      ).toBe(true);
    } finally {
      integration.unregister();
    }
  });
});
