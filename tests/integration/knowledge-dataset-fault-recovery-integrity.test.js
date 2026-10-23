
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
      topic: "fault-recovery",
      keywords: ["xsus", "recovery"],
      tags: ["integration"]
    }
  ];
}

function createStorageAdapter() {
  let persistedDatasets = [];
  let failNextSave = false;

  const storage = {
    loadDatasets: vi.fn(async () => ({
      success: true,
      datasets: structuredClone(persistedDatasets)
    })),

    saveDatasets: vi.fn(async (datasets) => {
      if (failNextSave) {
        failNextSave = false;

        return {
          success: false,
          error: "Dështim i simuluar i ruajtjes."
        };
      }

      persistedDatasets = structuredClone(datasets);

      return { success: true };
    }),

    failNextSave() {
      failNextSave = true;
    },

    getPersistedDatasets() {
      return structuredClone(persistedDatasets);
    }
  };

  return storage;
}

function createPipeline(storageAdapter) {
  return createKnowledgeDatasetPipeline({
    filePath: "/tmp/xsus-knowledge-fault-recovery-test.json",
    storageAdapter
  });
}

describe("XSUS AI — Knowledge Dataset Fault Recovery Integrity", () => {
  test("ruan gjendjen ekzistuese kur regjistrimi i ri dështon në storage", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const initialResult = await pipeline.registerDataset(
        "existing-dataset",
        createEntries("existing-001", "Të dhëna ekzistuese.")
      );

      expect(initialResult.success).toBe(true);

      storage.failNextSave();

      const failedResult = await pipeline.registerDataset(
        "new-dataset",
        createEntries("new-001", "Të dhëna të reja.")
      );

      expect(failedResult.success).toBe(false);

      expect(
        pipeline.getDataset("existing-dataset")
      ).not.toBeNull();

      expect(
        pipeline.getDataset("new-dataset")
      ).toBeNull();

      expect(
        storage.getPersistedDatasets().map((dataset) => dataset.id)
      ).toEqual(["existing-dataset"]);
    } finally {
      await pipeline.close();
    }
  });

  test("rikthen dataset-in kur ruajtja dështon gjatë heqjes", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const registration = await pipeline.registerDataset(
        "protected-dataset",
        createEntries("protected-001", "Të dhëna të mbrojtura.")
      );

      expect(registration.success).toBe(true);

      storage.failNextSave();

      const removal = await pipeline.removeDataset(
        "protected-dataset"
      );

      expect(removal.success).toBe(false);

      const dataset = pipeline.getDataset("protected-dataset");

      expect(dataset).not.toBeNull();
      expect(dataset.collection[0]).toMatchObject({
        id: "protected-001",
        content: "Të dhëna të mbrojtura."
      });

      expect(
        storage.getPersistedDatasets().map((item) => item.id)
      ).toEqual(["protected-dataset"]);
    } finally {
      await pipeline.close();
    }
  });

  test("lejon ruajtjen e suksesshme pas një dështimi të përkohshëm", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      storage.failNextSave();

      const failedResult = await pipeline.registerDataset(
        "retry-dataset",
        createEntries("retry-001", "Përmbajtje për riprovë.")
      );

      expect(failedResult.success).toBe(false);
      expect(pipeline.getDataset("retry-dataset")).toBeNull();

      const retryResult = await pipeline.registerDataset(
        "retry-dataset",
        createEntries("retry-001", "Përmbajtje për riprovë.")
      );

      expect(retryResult.success).toBe(true);

      expect(
        pipeline.getDataset("retry-dataset")
      ).not.toBeNull();

      expect(
        storage.getPersistedDatasets().map((item) => item.id)
      ).toEqual(["retry-dataset"]);
    } finally {
      await pipeline.close();
    }
  });

  test("ruan dataset-et e tjera pas dështimit të regjistrimit", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const first = await pipeline.registerDataset(
        "sq-knowledge",
        createEntries("sq-001", "Njohuri shqipe.")
      );

      const second = await pipeline.registerDataset(
        "en-knowledge",
        createEntries("en-001", "English knowledge.")
      );

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);

      storage.failNextSave();

      const failed = await pipeline.registerDataset(
        "fr-knowledge",
        createEntries("fr-001", "Connaissances françaises.")
      );

      expect(failed.success).toBe(false);

      expect(pipeline.listDatasets().map((item) => item.id).sort())
        .toEqual(["en-knowledge", "sq-knowledge"]);

      expect(
        storage.getPersistedDatasets()
          .map((item) => item.id)
          .sort()
      ).toEqual(["en-knowledge", "sq-knowledge"]);
    } finally {
      await pipeline.close();
    }
  });

  test("raporton metadata të qëndrueshme pas rikuperimit", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      storage.failNextSave();

      const failed = await pipeline.registerDataset(
        "metadata-dataset",
        createEntries("metadata-001")
      );

      expect(failed.success).toBe(false);

      const successful = await pipeline.registerDataset(
        "metadata-dataset",
        createEntries("metadata-001")
      );

      expect(successful.success).toBe(true);

      const metadata = pipeline.getMetadata();

      expect(metadata.datasetCount).toBe(1);
      expect(metadata.persistenceConsistent).toBe(true);
      expect(metadata.closed).toBe(false);
    } finally {
      await pipeline.close();
    }
  });

  test("ruan snapshot-in ekzistues kur thirrja manuale save dështon", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const registration = await pipeline.registerDataset(
        "stable-dataset",
        createEntries("stable-001", "Gjendje e qëndrueshme.")
      );

      expect(registration.success).toBe(true);

      const snapshotBefore = storage.getPersistedDatasets();

      storage.failNextSave();

      const saveResult = await pipeline.save();

      expect(saveResult.success).toBe(false);

      expect(storage.getPersistedDatasets()).toEqual(snapshotBefore);

      expect(
        pipeline.getDataset("stable-dataset")
      ).not.toBeNull();
    } finally {
      await pipeline.close();
    }
  });
});
