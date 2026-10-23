
import { describe, expect, test, vi } from "vitest";

import {
  createKnowledgeDatasetPipeline
} from "../../src/knowledge/knowledge-dataset-pipeline.js";

function createEntries(id, content = `Përmbajtja ${id}`) {
  return [
    {
      id,
      title: `Titulli ${id}`,
      content,
      language: "sq",
      domain: "general",
      topic: "concurrency",
      keywords: ["xsus", "concurrency"],
      tags: ["integration"]
    }
  ];
}

function createStorageAdapter() {
  let persistedDatasets = [];

  return {
    loadDatasets: vi.fn(async () => ({
      success: true,
      datasets: structuredClone(persistedDatasets)
    })),

    saveDatasets: vi.fn(async (datasets) => {
      persistedDatasets = structuredClone(datasets);

      return { success: true };
    }),

    getPersistedDatasets() {
      return structuredClone(persistedDatasets);
    }
  };
}

function createPipeline(storageAdapter) {
  return createKnowledgeDatasetPipeline({
    filePath: "/tmp/xsus-knowledge-concurrency-test.json",
    storageAdapter
  });
}

describe("XSUS AI — Knowledge Dataset Concurrency Integrity", () => {
  test("ruan të gjitha dataset-et kur regjistrimet nisin paralelisht", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const ids = Array.from(
        { length: 20 },
        (_, index) => `dataset-${index + 1}`
      );

      const results = await Promise.all(
        ids.map((id, index) =>
          pipeline.registerDataset(
            id,
            createEntries(
              `entry-${index + 1}`,
              `Përmbajtja ${index + 1}`
            )
          )
        )
      );

      expect(results.every((result) => result.success)).toBe(true);
      expect(pipeline.listDatasets()).toHaveLength(20);

      const persisted = storage.getPersistedDatasets();

      expect(persisted).toHaveLength(20);

      expect(
        persisted.map((dataset) => dataset.id).sort()
      ).toEqual([...ids].sort());

      expect(pipeline.getMetadata().persistenceConsistent).toBe(true);
    } finally {
      await pipeline.close();
    }
  });

  test("izolon regjistrimet paralele me identifikues të njëjtë", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, index) =>
          pipeline.registerDataset(
            "shared-dataset",
            createEntries(
              `entry-${index + 1}`,
              `Përmbajtja ${index + 1}`
            )
          )
        )
      );

      const successfulResults = results.filter(
        (result) => result.success
      );

      const failedResults = results.filter(
        (result) => !result.success
      );

      expect(successfulResults).toHaveLength(1);
      expect(failedResults).toHaveLength(9);

      expect(pipeline.listDatasets()).toHaveLength(1);
      expect(pipeline.getDataset("shared-dataset")).not.toBeNull();

      expect(storage.getPersistedDatasets()).toHaveLength(1);
      expect(pipeline.getMetadata().persistenceConsistent).toBe(true);
    } finally {
      await pipeline.close();
    }
  });

  test("ruan gjendjen pas regjistrimeve dhe heqjeve të njëkohshme", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const initialIds = Array.from(
        { length: 10 },
        (_, index) => `initial-${index + 1}`
      );

      const initialResults = await Promise.all(
        initialIds.map((id, index) =>
          pipeline.registerDataset(
            id,
            createEntries(`initial-entry-${index + 1}`)
          )
        )
      );

      expect(
        initialResults.every((result) => result.success)
      ).toBe(true);

      const operationResults = await Promise.all([
        ...initialIds.slice(0, 5).map((id) =>
          pipeline.removeDataset(id)
        ),

        ...Array.from({ length: 5 }, (_, index) =>
          pipeline.registerDataset(
            `new-${index + 1}`,
            createEntries(`new-entry-${index + 1}`)
          )
        )
      ]);

      expect(
        operationResults.every((result) => result.success)
      ).toBe(true);

      const currentIds = pipeline
        .listDatasets()
        .map((dataset) => dataset.id)
        .sort();

      const expectedIds = [
        ...initialIds.slice(5),
        "new-1",
        "new-2",
        "new-3",
        "new-4",
        "new-5"
      ].sort();

      expect(currentIds).toEqual(expectedIds);

      const persistedIds = storage
        .getPersistedDatasets()
        .map((dataset) => dataset.id)
        .sort();

      expect(persistedIds).toEqual(expectedIds);
      expect(pipeline.getMetadata().persistenceConsistent).toBe(true);
    } finally {
      await pipeline.close();
    }
  });

  test("ruan vetëm një dataset kur shumë operacione tentojnë ta heqin", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const registration = await pipeline.registerDataset(
        "removable-dataset",
        createEntries("removable-entry")
      );

      expect(registration.success).toBe(true);

      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          pipeline.removeDataset("removable-dataset")
        )
      );

      expect(
        results.filter((result) => result.success)
      ).toHaveLength(1);

      expect(
        results.filter((result) => !result.success)
      ).toHaveLength(9);

      expect(
        pipeline.getDataset("removable-dataset")
      ).toBeNull();

      expect(storage.getPersistedDatasets()).toHaveLength(0);
      expect(pipeline.getMetadata().persistenceConsistent).toBe(true);
    } finally {
      await pipeline.close();
    }
  });

  test("ruan konsistencën gjatë disa thirrjeve paralele të save", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const registrationResults = await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          pipeline.registerDataset(
            `save-dataset-${index + 1}`,
            createEntries(`save-entry-${index + 1}`)
          )
        )
      );

      expect(
        registrationResults.every((result) => result.success)
      ).toBe(true);

      const saveResults = await Promise.all(
        Array.from({ length: 10 }, () => pipeline.save())
      );

      expect(
        saveResults.every((result) => result.success)
      ).toBe(true);

      expect(storage.getPersistedDatasets()).toHaveLength(8);
      expect(pipeline.listDatasets()).toHaveLength(8);
      expect(pipeline.getMetadata().persistenceConsistent).toBe(true);
    } finally {
      await pipeline.close();
    }
  });

  test("mbyll pipeline-in pa lënë operacione të regjistrimit të papërfunduara", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    const registrationPromises = Array.from(
      { length: 10 },
      (_, index) =>
        pipeline.registerDataset(
          `close-dataset-${index + 1}`,
          createEntries(`close-entry-${index + 1}`)
        )
    );

    const results = await Promise.all(registrationPromises);

    expect(results.every((result) => result.success)).toBe(true);

    const closeResult = await pipeline.close();

    expect(closeResult).toBe(true);

    const secondCloseResult = await pipeline.close();

    expect(secondCloseResult).toBe(false);

    expect(storage.getPersistedDatasets()).toHaveLength(10);
  });
});
