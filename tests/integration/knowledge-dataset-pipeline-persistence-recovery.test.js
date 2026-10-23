import { afterEach, describe, expect, test, vi } from "vitest";
import {
  mkdtemp,
  rm
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createKnowledgeDatasetPipeline
} from "../../src/knowledge/knowledge-dataset-pipeline.js";

const temporaryDirectories = [];
const activePipelines = [];

async function createFilePath() {
  const directory = await mkdtemp(
    join(tmpdir(), "xsus-pipeline-recovery-")
  );

  temporaryDirectories.push(directory);

  return join(directory, "datasets.json");
}

function createStorageAdapter({ failSaveCalls = [] } = {}) {
  let saveCallCount = 0;
  const savedSnapshots = [];

  return {
    savedSnapshots,

    loadDatasets: vi.fn(async () => ({
      success: true,
      datasets: []
    })),

    saveDatasets: vi.fn(async (snapshot) => {
      saveCallCount += 1;

      if (failSaveCalls.includes(saveCallCount)) {
        return {
          success: false,
          error: `Dështim i simuluar në ruajtjen ${saveCallCount}.`
        };
      }

      savedSnapshots.push(
        JSON.parse(JSON.stringify(snapshot))
      );

      return {
        success: true
      };
    }),

    getSaveCallCount() {
      return saveCallCount;
    }
  };
}

async function createPipeline(storageAdapter) {
  const filePath = await createFilePath();

  const pipeline = await createKnowledgeDatasetPipeline({
    filePath,
    storageAdapter
  });

  activePipelines.push(pipeline);

  return pipeline;
}

function createEntries(id, content = `Përmbajtja ${id}`) {
  return [
    {
      id,
      title: `Titulli ${id}`,
      content,
      language: "sq",
      domain: "general",
      topic: "persistence",
      keywords: ["xsus", "persistence"],
      tags: ["integration"]
    }
  ];
}

afterEach(async () => {
  await Promise.all(
    activePipelines.splice(0).map((pipeline) =>
      pipeline.close()
    )
  );

  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe("XSUS AI — Pipeline Persistence Recovery", () => {
  test("rikthen regjistrin kur regjistrimi nuk mund të ruhet", async () => {
    const storage = createStorageAdapter({
      failSaveCalls: [1]
    });

    const pipeline = await createPipeline(storage);

    const result = await pipeline.registerDataset(
      "failed-registration",
      createEntries("entry-failed")
    );

    expect(result.success).toBe(false);
    expect(result.rollbackSucceeded).toBe(true);

    expect(
      pipeline.getDataset("failed-registration")
    ).toBeNull();

    expect(pipeline.listDatasets()).toHaveLength(0);

    expect(storage.getSaveCallCount()).toBe(2);
    expect(storage.savedSnapshots).toHaveLength(1);
    expect(storage.savedSnapshots[0]).toHaveLength(0);

    const metadata = pipeline.getMetadata();

    expect(metadata.persistenceConsistent).toBe(true);
    expect(metadata.lastPersistenceError).toBeNull();
  });

  test("raporton gjendje jokonsistente kur dështon edhe ruajtja e rikthimit", async () => {
    const storage = createStorageAdapter({
      failSaveCalls: [1, 2]
    });

    const pipeline = await createPipeline(storage);

    const result = await pipeline.registerDataset(
      "failed-rollback",
      createEntries("entry-rollback")
    );

    expect(result.success).toBe(false);
    expect(result.rollbackSucceeded).toBe(false);

    expect(
      pipeline.getDataset("failed-rollback")
    ).toBeNull();

    const metadata = pipeline.getMetadata();

    expect(metadata.persistenceConsistent).toBe(false);
    expect(metadata.lastPersistenceError).toContain(
      "Dështim i simuluar"
    );

    expect(storage.getSaveCallCount()).toBe(2);
  });

  test("rikthen dataset-in në memorie kur ruajtja e heqjes dështon", async () => {
    const storage = createStorageAdapter({
      failSaveCalls: [2]
    });

    const pipeline = await createPipeline(storage);

    const registration = await pipeline.registerDataset(
      "remove-recovery",
      createEntries("entry-remove")
    );

    expect(registration.success).toBe(true);

    const removal = await pipeline.removeDataset(
      "remove-recovery"
    );

    expect(removal.success).toBe(false);
    expect(removal.removed).toBe(false);
    expect(removal.rollbackSucceeded).toBe(true);

    const restored = pipeline.getDataset("remove-recovery");

    expect(restored).not.toBeNull();
    expect(restored.collection).toHaveLength(1);
    expect(restored.collection[0]).toMatchObject({
      id: "entry-remove",
      content: "Përmbajtja entry-remove"
    });

    expect(storage.getSaveCallCount()).toBe(3);

    const finalSnapshot =
      storage.savedSnapshots[storage.savedSnapshots.length - 1];

    expect(finalSnapshot).toHaveLength(1);
    expect(finalSnapshot[0].id).toBe("remove-recovery");

    const metadata = pipeline.getMetadata();

    expect(metadata.persistenceConsistent).toBe(true);
    expect(metadata.lastPersistenceError).toBeNull();
  });

  test("vazhdon të pranojë operacione pas një regjistrimi të dështuar", async () => {
    const storage = createStorageAdapter({
      failSaveCalls: [1]
    });

    const pipeline = await createPipeline(storage);

    const failedRegistration = await pipeline.registerDataset(
      "first-dataset",
      createEntries("first-entry")
    );

    expect(failedRegistration.success).toBe(false);

    const nextRegistration = await pipeline.registerDataset(
      "second-dataset",
      createEntries("second-entry")
    );

    expect(nextRegistration.success).toBe(true);

    expect(pipeline.listDatasets()).toHaveLength(1);
    expect(pipeline.getDataset("first-dataset")).toBeNull();
    expect(pipeline.getDataset("second-dataset")).not.toBeNull();

    expect(storage.getSaveCallCount()).toBe(3);

    const finalSnapshot =
      storage.savedSnapshots[storage.savedSnapshots.length - 1];

    expect(finalSnapshot).toHaveLength(1);
    expect(finalSnapshot[0].id).toBe("second-dataset");
  });
});
