
import {
  afterEach,
  describe,
  expect,
  test
} from "vitest";

import {
  mkdtemp,
  rm
} from "node:fs/promises";

import {
  tmpdir
} from "node:os";

import {
  join
} from "node:path";

import {
  createKnowledgeDatasetPipeline
} from "../../src/knowledge/knowledge-dataset-pipeline.js";

import {
  registerKnowledgeDatasetIntegration
} from "../../src/knowledge/knowledge-dataset-integration.js";

import {
  searchKnowledge,
  hasKnowledgeSource
} from "../../src/knowledge/knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets-e2e-test";

const temporaryDirectories = [];
const registeredIntegrations = [];

async function createTemporaryFilePath() {
  const directory = await mkdtemp(
    join(tmpdir(), "xsus-e2e-knowledge-")
  );

  temporaryDirectories.push(directory);

  return join(directory, "datasets.json");
}

afterEach(async () => {
  for (const integration of registeredIntegrations.splice(0)) {
    integration.unregister();
  }

  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("XSUS Knowledge Dataset End-to-End", () => {
  test(
    "dataset-i i regjistruar gjendet përmes searchKnowledge",
    async () => {
      const filePath = await createTemporaryFilePath();

      const pipeline = await createKnowledgeDatasetPipeline({
        filePath
      });

      try {
        const registration = await pipeline.registerDataset(
          "e2e-xsus-dataset",
          [
            {
              id: "e2e-xsus-entry",
              title: "XSUS Dataset Integration Check",
              content:
                "XSUS knowledge integration unique phrase nebula-742.",
              language: "en",
              domain: "general",
              topic: "integration",
              keywords: ["xsus", "nebula-742"],
              tags: ["e2e-test"],
              status: "verified"
            }
          ]
        );

        expect(registration.success).toBe(true);

        const integration = registerKnowledgeDatasetIntegration({
          registry: pipeline,
          sourceName: SOURCE_NAME
        });

        registeredIntegrations.push(integration);

        expect(integration.success).toBe(true);
        expect(integration.source).toBe(SOURCE_NAME);
        expect(hasKnowledgeSource(SOURCE_NAME)).toBe(true);

        const result = await searchKnowledge("nebula-742", {
          language: "en",
          domain: "general",
          limit: 10
        });

        expect(result.success).toBe(true);

        expect(
          result.results.some(
            (entry) =>
              entry.id === "e2e-xsus-entry" &&
              entry.source === SOURCE_NAME
          )
        ).toBe(true);
      } finally {
        await pipeline.close();
      }
    }
  );
});
