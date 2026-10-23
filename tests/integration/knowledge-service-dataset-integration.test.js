
import { afterEach, describe, expect, it } from "vitest";

import {
  searchKnowledge,
  unregisterKnowledgeSource
} from "../../src/knowledge/knowledge-service.js";

import {
  createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

import {
  registerKnowledgeDatasetIntegration
} from "../../src/knowledge/knowledge-dataset-integration.js";

const SOURCE_NAME = "xsus-knowledge-datasets";

describe("XSUS AI — Knowledge Service Dataset Integration", () => {
  let integration;

  afterEach(() => {
    if (integration?.unregister) {
      integration.unregister();
      integration = undefined;
    }

    // Pastron burimin edhe nëse një test dështon.
    unregisterKnowledgeSource(SOURCE_NAME);
  });

  it("searchKnowledge gjen njohuri nga dataset-i i regjistruar", async () => {
    const registry = createKnowledgeDatasetRegistry();

    const registration = registry.registerDataset(
      "orion-integration-dataset",
      [
        {
          id: "orion-fixture-entry",
          title: "Orion Fixture Integration",
          content:
            "Orion fixture explains a custom XSUS programming integration.",
          domain: "programming",
          topic: "dataset integration",
          language: "en",
          difficulty: "beginner",
          status: "verified",
          keywords: ["orion", "fixture", "integration"],
          tags: ["xsus", "testing"],
          source: "orion-test-dataset",
          version: "1.0.0"
        }
      ]
    );

    expect(registration.success).toBe(true);

    integration = registerKnowledgeDatasetIntegration({
      registry
    });

    expect(integration.success).toBe(true);
    expect(integration.source).toBe(SOURCE_NAME);

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

    const datasetEntry = result.results.find(
      (entry) => entry.id === "orion-fixture-entry"
    );

    expect(datasetEntry).toBeDefined();
    expect(datasetEntry.content).toContain("Orion fixture");
    expect(datasetEntry.domain).toBe("programming");
    expect(datasetEntry.language).toBe("en");
  });
});
