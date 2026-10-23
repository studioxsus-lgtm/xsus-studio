
import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  readFile,
  rm
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createKnowledgeDatasetPipeline
} from "../../src/knowledge/knowledge-dataset-pipeline.js";

const temporaryDirectories = [];
const activePipelines = [];

async function createTemporaryFilePath() {
  const directory = await mkdtemp(
    join(tmpdir(), "xsus-pipeline-integrity-")
  );

  temporaryDirectories.push(directory);

  return join(directory, "datasets.json");
}

async function createPipeline() {
  const filePath = await createTemporaryFilePath();
  const pipeline = await createKnowledgeDatasetPipeline({ filePath });

  activePipelines.push(pipeline);

  return { filePath, pipeline };
}

function createEntries(id, overrides = {}) {
  return [
    {
      id,
      title: `Title ${id}`,
      content: `Content for ${id}`,
      language: "en",
      ...overrides
    }
  ];
}

async function registerSuccessfully(pipeline, id, entries) {
  const result = await pipeline.registerDataset(id, entries);

  expect(result.success).toBe(true);
  return result;
}

afterEach(async () => {
  await Promise.all(
    activePipelines.splice(0).map(async (pipeline) => {
      await pipeline.close();
    })
  );

  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("XSUS Knowledge Dataset Pipeline Integrity", () => {
  test("refuzon ID-në e përsëritur pa ndryshuar dataset-in ekzistues", async () => {
    const { filePath, pipeline } = await createPipeline();

    await registerSuccessfully(
      pipeline,
      "duplicate-test",
      createEntries("entry-original", {
        content: "Original content"
      })
    );

    const duplicate = await pipeline.registerDataset(
      "duplicate-test",
      createEntries("entry-replacement", {
        content: "Replacement content"
      })
    );

    expect(duplicate.success).toBe(false);

    const dataset = pipeline.getDataset("duplicate-test");

    expect(dataset).not.toBeNull();
    expect(dataset.collection).toHaveLength(1);
    expect(dataset.collection[0]).toMatchObject({
      id: "entry-original",
      content: "Original content"
    });

    const saved = JSON.parse(await readFile(filePath, "utf8"));

    expect(saved.datasets).toHaveLength(1);
    expect(saved.datasets[0].entries[0]).toMatchObject({
      id: "entry-original",
      content: "Original content"
    });
  });

  test("ruan dataset-et e tjera pas refuzimit të një regjistrimi", async () => {
    const { filePath, pipeline } = await createPipeline();

    await registerSuccessfully(
      pipeline,
      "dataset-a",
      createEntries("entry-a")
    );

    await registerSuccessfully(
      pipeline,
      "dataset-b",
      createEntries("entry-b")
    );

    const duplicate = await pipeline.registerDataset(
      "dataset-a",
      createEntries("entry-duplicate")
    );

    expect(duplicate.success).toBe(false);

    expect(pipeline.listDatasets().map((item) => item.id).sort())
      .toEqual(["dataset-a", "dataset-b"]);

    const saved = JSON.parse(await readFile(filePath, "utf8"));

    expect(saved.datasets).toHaveLength(2);

    const savedIds = saved.datasets.map((item) => item.id).sort();

    expect(savedIds).toEqual(["dataset-a", "dataset-b"]);
  });

  test("heqja e një dataset-i ruhet në JSON", async () => {
    const { filePath, pipeline } = await createPipeline();

    await registerSuccessfully(
      pipeline,
      "keep-dataset",
      createEntries("entry-keep")
    );

    await registerSuccessfully(
      pipeline,
      "remove-dataset",
      createEntries("entry-remove")
    );

    const removal = await pipeline.removeDataset("remove-dataset");

    expect(removal.success).toBe(true);
    expect(removal.removed).toBe(true);
    expect(pipeline.getDataset("remove-dataset")).toBeNull();
    expect(pipeline.getDataset("keep-dataset")).not.toBeNull();

    const saved = JSON.parse(await readFile(filePath, "utf8"));

    expect(saved.datasets).toHaveLength(1);
    expect(saved.datasets[0].id).toBe("keep-dataset");
  });

  test("heqja e një ID-je që nuk ekziston nuk ndryshon gjendjen", async () => {
    const { filePath, pipeline } = await createPipeline();

    await registerSuccessfully(
      pipeline,
      "existing-dataset",
      createEntries("entry-existing")
    );

    const before = await readFile(filePath, "utf8");

    const removal = await pipeline.removeDataset("missing-dataset");

    expect(removal.success).toBe(false);
    expect(removal.removed).toBe(false);

    expect(pipeline.getDataset("existing-dataset")).not.toBeNull();

    const after = await readFile(filePath, "utf8");

    expect(after).toBe(before);
  });

  test("ruajtja manuale raporton sukses dhe metadata konsistente", async () => {
    const { pipeline } = await createPipeline();

    await registerSuccessfully(
      pipeline,
      "manual-save-test",
      createEntries("entry-save")
    );

    const result = await pipeline.save();

    expect(result.success).toBe(true);
    expect(result.metadata.persisted).toBe(true);
    expect(result.metadata.persistenceConsistent).toBe(true);
    expect(result.metadata.lastPersistenceError).toBeNull();

    const metadata = pipeline.getMetadata();

    expect(metadata.persistenceConsistent).toBe(true);
    expect(metadata.lastPersistenceError).toBeNull();
    expect(metadata.datasetCount).toBe(1);
  });

  test("operacionet e pranuara përfundojnë para mbylljes", async () => {
    const { pipeline } = await createPipeline();

    const registrationPromise = pipeline.registerDataset(
      "close-queue-test",
      createEntries("entry-close")
    );

    const closePromise = pipeline.close();

    const [registration, closed] = await Promise.all([
      registrationPromise,
      closePromise
    ]);

    expect(registration.success).toBe(true);
    expect(closed).toBe(true);
    expect(await pipeline.close()).toBe(false);

    expect(() => pipeline.listDatasets()).toThrow(
      /mbyllur|mbyllet/i
    );
  });
});
