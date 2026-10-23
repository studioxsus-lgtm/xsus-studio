
import { afterEach, describe, expect, test } from "vitest";

import {
  createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

import {
  registerKnowledgeDatasetIntegration
} from "../../src/knowledge/knowledge-dataset-integration.js";

import {
  searchKnowledge,
  unregisterKnowledgeSource
} from "../../src/knowledge/knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets";

describe("XSUS AI — Knowledge Service Dataset Integration", () => {
  let integration;

  afterEach(() => {
    if (integration) {
      integration.unregister();
      integration = undefined;
    } else {
      unregisterKnowledgeSource(SOURCE_NAME);
    }
  });

  test("searchKnowledge gjen njohuri nga dataset-i i regjistruar", async () => {
    const registry = createKnowledgeDatasetRegistry();

    registry.registerDataset("orion-integration-fixture", [
      {
        id: "orion-fixture-entry",
        title: "Orion Fixture Integration",
        content:
          "Orion fixture documents a custom XSUS programming integration.",
        language: "en",
        domain: "programming",
        difficulty: "beginner",
        status: "published",
        tags: ["orion", "fixture", "integration"]
      }
    ]);

    integration = registerKnowledgeDatasetIntegration({ registry });

    const result = await searchKnowledge("orion fixture", {
      language: "en",
      domain: "programming",
      limit: 10
    });

    expect(result.success).toBe(true);

    expect(
      result.results.some(
        (entry) => entry.id === "orion-fixture-entry"
      )
    ).toBe(true);

    expect(result.sources).toContain(SOURCE_NAME);
  });
});
