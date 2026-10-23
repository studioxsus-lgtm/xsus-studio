import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
createKnowledgeDatasetPipeline
} from "../../src/knowledge/knowledge-dataset-pipeline.js";

describe("XSUS AI — Knowledge Dataset Pipeline", () => {
let pipeline;
let temporaryDirectory;

afterEach(async () => {
if (pipeline) {
await pipeline.close();
pipeline = undefined;
}

if (temporaryDirectory) {
  await rm(temporaryDirectory, {
    recursive: true,
    force: true
  });

  temporaryDirectory = undefined;
}

});

async function createPipeline() {
temporaryDirectory = await mkdtemp(
join(tmpdir(), "xsus-knowledge-pipeline-")
);

const filePath = join(
  temporaryDirectory,
  "knowledge-datasets.json"
);

pipeline = await createKnowledgeDatasetPipeline({
  filePath
});

return filePath;

}

function createEntry(overrides = {}) {
return {
id: "pipeline-orion-entry",
title: "Orion Pipeline Integration",
content:
"Orion pipeline fixture explains custom XSUS dataset persistence.",
domain: "programming",
topic: "pipeline integration",
language: "en",
difficulty: "beginner",
status: "verified",
keywords: ["orion", "pipeline", "persistence"],
tags: ["xsus", "integration"],
source: "pipeline-test",
version: "1.0.0",
...overrides
};
}

it("regjistron, kërkon dhe liston një dataset", async () => {
await createPipeline();

const registration = await pipeline.registerDataset(
  "pipeline-orion-dataset",
  [createEntry()]
);

expect(registration.success).toBe(true);

const searchResult = pipeline.search("orion pipeline", {
  language: "en",
  domain: "programming"
});

expect(searchResult.success).toBe(true);

expect(
  searchResult.results.some(
    (entry) => entry.id === "pipeline-orion-entry"
  )
).toBe(true);

expect(
  pipeline.listDatasets().some(
    (dataset) => dataset.id === "pipeline-orion-dataset"
  )
).toBe(true);

});

it("ruan dhe rikthen dataset-in pas krijimit të pipeline-it të ri", async () => {
const filePath = await createPipeline();

const registration = await pipeline.registerDataset(
  "pipeline-recovery-dataset",
  [createEntry()]
);

expect(registration.success).toBe(true);

expect(await pipeline.close()).toBe(true);
expect(await pipeline.close()).toBe(false);
pipeline = undefined;

pipeline = await createKnowledgeDatasetPipeline({ filePath });

const restoredDataset = pipeline.getDataset(
  "pipeline-recovery-dataset"
);

expect(restoredDataset).not.toBeNull();
expect(restoredDataset.entryCount).toBe(1);

const searchResult = pipeline.search("orion pipeline", {
  language: "en",
  domain: "programming"
});

expect(searchResult.success).toBe(true);
expect(
  searchResult.results.some(
    (entry) => entry.id === "pipeline-orion-entry"
  )
).toBe(true);

});

it("refuzon dataset me hyrje të pavlefshme", async () => {
await createPipeline();

const result = await pipeline.registerDataset(
  "invalid-pipeline-dataset",
  [
    {
      id: "",
      title: "",
      content: ""
    }
  ]
);

expect(result.success).toBe(false);
expect(pipeline.listDatasets()).toHaveLength(0);

});

it("heq dataset-in dhe e ruan heqjen pas rinisjes", async () => {
const filePath = await createPipeline();

const registration = await pipeline.registerDataset(
  "pipeline-removal-dataset",
  [createEntry()]
);

expect(registration.success).toBe(true);

const removal = await pipeline.removeDataset(
  "pipeline-removal-dataset"
);

expect(removal.success).toBe(true);
expect(removal.removed).toBe(true);
expect(
  pipeline.getDataset("pipeline-removal-dataset")
).toBeNull();

expect(await pipeline.close()).toBe(true);
pipeline = undefined;

pipeline = await createKnowledgeDatasetPipeline({ filePath });

expect(
  pipeline.getDataset("pipeline-removal-dataset")
).toBeNull();

});

it("kthen metadata të sakta të pipeline-it", async () => {
await createPipeline();

const metadata = pipeline.getMetadata();

expect(metadata.engine).toBe(
  "xsus-knowledge-dataset-pipeline"
);

expect(metadata.version).toBe("1.1.0");
expect(metadata.storageEnabled).toBe(true);
expect(metadata.persistenceEnabled).toBe(true);
expect(metadata.serializedOperations).toBe(true);
expect(metadata.datasetCount).toBe(0);
expect(metadata.closed).toBe(false);

});

it("ruan të gjitha regjistrimet e nisura paralelisht", async () => {
await createPipeline();

const entries = Array.from({ length: 8 }, (_, index) =>
  createEntry({
    id: `parallel-entry-${index}`,
    title: `Parallel Fixture ${index}`,
    content: `Parallel persistence fixture number ${index}.`,
    topic: "parallel testing",
    keywords: ["parallel", "persistence", `fixture-${index}`]
  })
);

const results = await Promise.all(
  entries.map((entry, index) =>
    pipeline.registerDataset(
      `parallel-dataset-${index}`,
      [entry]
    )
  )
);

expect(results.every((result) => result.success)).toBe(true);
expect(pipeline.listDatasets()).toHaveLength(8);
expect(pipeline.getMetadata().datasetCount).toBe(8);

for (let index = 0; index < entries.length; index += 1) {
  const dataset = pipeline.getDataset(
    `parallel-dataset-${index}`
  );

  expect(dataset).not.toBeNull();
  expect(dataset.entryCount).toBe(1);
  expect(
    dataset.collection.some(
      (entry) => entry.id === `parallel-entry-${index}`
    )
  ).toBe(true);
}

});

it("ruan saktë regjistrimet dhe heqjet paralele", async () => {
await createPipeline();

const count = 5;

const registrations = await Promise.all(
  Array.from({ length: count }, (_, index) =>
    pipeline.registerDataset(
      `remove-parallel-dataset-${index}`,
      [
        createEntry({
          id: `remove-parallel-entry-${index}`,
          title: `Parallel Removal Fixture ${index}`,
          content: `Parallel removal fixture number ${index}.`
        })
      ]
    )
  )
);

expect(
  registrations.every((result) => result.success)
).toBe(true);
expect(pipeline.listDatasets()).toHaveLength(count);

const removals = await Promise.all(
  Array.from({ length: count }, (_, index) =>
    pipeline.removeDataset(
      `remove-parallel-dataset-${index}`
    )
  )
);

expect(removals.every((result) => result.success)).toBe(true);
expect(removals.every((result) => result.removed)).toBe(true);
expect(pipeline.listDatasets()).toHaveLength(0);
expect(pipeline.getMetadata().datasetCount).toBe(0);

});

it("ruan gjendjen përfundimtare të regjistrimeve paralele në JSON", async () => {
const filePath = await createPipeline();

const count = 6;

const results = await Promise.all(
  Array.from({ length: count }, (_, index) =>
    pipeline.registerDataset(
      `json-parallel-dataset-${index}`,
      [
        createEntry({
          id: `json-parallel-entry-${index}`,
          title: `JSON Parallel Fixture ${index}`,
          content: `JSON persistence fixture number ${index}.`
        })
      ]
    )
  )
);

expect(results.every((result) => result.success)).toBe(true);

const rawStorage = await readFile(filePath, "utf8");
const savedData = JSON.parse(rawStorage);

expect(savedData.formatVersion).toBe("1.0.0");
expect(savedData.datasets).toHaveLength(count);

const savedIds = savedData.datasets
  .map((dataset) => dataset.id)
  .sort();

expect(savedIds).toEqual(
  Array.from(
    { length: count },
    (_, index) => `json-parallel-dataset-${index}`
  ).sort()
);

});

it("refuzon operacionet e reja pas mbylljes", async () => {
await createPipeline();

expect(await pipeline.close()).toBe(true);

await expect(
  pipeline.registerDataset(
    "dataset-after-close",
    [createEntry()]
  )
).resolves.toMatchObject({
  success: false
});

expect(() => pipeline.search("orion")).toThrow();
expect(() => pipeline.listDatasets()).toThrow();

});

it("pret përfundimin e operacioneve të regjistrimit para mbylljes", async () => {
await createPipeline();

const registrations = Promise.all(
  Array.from({ length: 4 }, (_, index) =>
    pipeline.registerDataset(
      `close-pending-dataset-${index}`,
      [
        createEntry({
          id: `close-pending-entry-${index}`,
          title: `Close Pending Fixture ${index}`
        })
      ]
    )
  )
);

const closeResult = await pipeline.close();

expect(closeResult).toBe(true);

const results = await registrations;
expect(results.every((result) => result.success)).toBe(true);

pipeline = undefined;

});
});
