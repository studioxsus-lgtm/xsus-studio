
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
  hasKnowledgeSource,
  searchKnowledge
} from "../../src/knowledge/knowledge-service.js";

const SOURCE_NAME = "xsus-knowledge-datasets-e2e-test";

const temporaryDirectories = [];
const pipelines = [];

async function createTemporaryFilePath() {
  const directory = await mkdtemp(
    join(tmpdir(), "xsus-e2e-knowledge-")
  );

  temporaryDirectories.push(directory);

  return join(directory, "datasets.json");
}

afterEach(async () => {
  for (const pipeline of pipelines.splice(0)) {
    await pipeline.close();
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
        filePath,
        sourceName: SOURCE_NAME
      });

      pipelines.push(pipeline);

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

      // Verifiko që dataset-i është regjistruar.
      const dataset = pipeline.getDataset(
        "e2e-xsus-dataset"
      );

      expect(dataset).toBeTruthy();

      // Verifiko kërkimin direkt në pipeline.
      const directResult = pipeline.search(
        "nebula-742",
        {
          language: "en",
          domain: "general",
          limit: 10
        }
      );

      expect(directResult.success).toBe(true);

      expect(
        directResult.results.some(
          (entry) => entry.id === "e2e-xsus-entry"
        )
      ).toBe(true);

      // Pipeline-i duhet ta ketë regjistruar burimin e personalizuar.
      expect(hasKnowledgeSource(SOURCE_NAME)).toBe(true);

      // Kërko përmes Knowledge Service.
      const result = await searchKnowledge(
        "nebula-742",
        {
          language: "en",
          domain: "general",
          limit: 10
        }
      );

      expect(result.success).toBe(true);

      const matchingEntry = result.results.find(
        (entry) =>
          entry.id === "e2e-xsus-entry" &&
          entry.source === SOURCE_NAME
      );

      expect(
        matchingEntry,
        "Hyrja e dataset-it duhet të gjendet përmes burimit të personalizuar në searchKnowledge."
      ).toBeTruthy();

      expect(matchingEntry.source).toBe(SOURCE_NAME);
    }
  );
});
