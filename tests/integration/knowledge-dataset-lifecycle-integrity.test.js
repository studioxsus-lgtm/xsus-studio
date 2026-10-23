
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
      topic: "lifecycle",
      keywords: ["xsus", "knowledge"],
      tags: ["integration"]
    }
  ];
}

function createStorageAdapter(initialDatasets = []) {
  let persistedDatasets = structuredClone(initialDatasets);

  return {
    loadDatasets: vi.fn(async () => ({
      success: true,
      datasets: structuredClone(persistedDatasets)
    })),

    saveDatasets: vi.fn(async (datasets) => {
      persistedDatasets = structuredClone(datasets);

      return {
        success: true
      };
    }),

    getPersistedDatasets() {
      return structuredClone(persistedDatasets);
    }
  };
}

function createPipeline(storageAdapter) {
  return createKnowledgeDatasetPipeline({
    filePath: "/tmp/xsus-knowledge-lifecycle-test.json",
    storageAdapter
  });
}

describe("XSUS AI — Knowledge Dataset Lifecycle Integrity", () => {
  test("regjistron dhe ruan një dataset", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "sq-knowledge",
        createEntries("sq-001", "Njohuri në shqip.")
      );

      expect(result.success).toBe(true);

      const dataset = pipeline.getDataset("sq-knowledge");

      expect(dataset).not.toBeNull();
      expect(dataset.entryCount).toBe(1);
      expect(dataset.collection[0]).toMatchObject({
        id: "sq-001",
        content: "Njohuri në shqip."
      });

      const persisted = storage.getPersistedDatasets();

      expect(persisted).toHaveLength(1);
      expect(persisted[0].id).toBe("sq-knowledge");
      expect(persisted[0].entries[0]).toMatchObject({
        id: "sq-001",
        content: "Njohuri në shqip."
      });
    } finally {
      await pipeline.close();
    }
  });

  test("izolon dataset-et nga njëri-tjetri", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const sqResult = await pipeline.registerDataset(
        "sq-knowledge",
        createEntries("sq-001", "Përmbajtja shqipe.")
      );

      const enResult = await pipeline.registerDataset(
        "en-knowledge",
        createEntries("en-001", "English content.")
      );

      expect(sqResult.success).toBe(true);
      expect(enResult.success).toBe(true);

      const removeResult = await pipeline.removeDataset(
        "sq-knowledge"
      );

      expect(removeResult.success).toBe(true);
      expect(pipeline.getDataset("sq-knowledge")).toBeNull();

      const englishDataset = pipeline.getDataset("en-knowledge");

      expect(englishDataset).not.toBeNull();
      expect(englishDataset.collection[0]).toMatchObject({
        id: "en-001",
        content: "English content."
      });

      const persisted = storage.getPersistedDatasets();

      expect(persisted).toHaveLength(1);
      expect(persisted[0].id).toBe("en-knowledge");
    } finally {
      await pipeline.close();
    }
  });

  test("refuzon identifikues të përsëritur të dataset-it", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const firstResult = await pipeline.registerDataset(
        "sq-knowledge",
        createEntries("sq-001", "Përmbajtja origjinale.")
      );

      expect(firstResult.success).toBe(true);

      const secondResult = await pipeline.registerDataset(
        "sq-knowledge",
        createEntries("sq-002", "Përmbajtje e dytë.")
      );

      expect(secondResult.success).toBe(false);

      const dataset = pipeline.getDataset("sq-knowledge");

      expect(dataset).not.toBeNull();
      expect(dataset.collection).toHaveLength(1);
      expect(dataset.collection[0]).toMatchObject({
        id: "sq-001",
        content: "Përmbajtja origjinale."
      });

      expect(storage.getPersistedDatasets()).toHaveLength(1);
    } finally {
      await pipeline.close();
    }
  });

  test("ruan gjendjen konsistente pas disa operacioneve", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      expect(
        (await pipeline.registerDataset(
          "sq-knowledge",
          createEntries("sq-001", "Shqip.")
        )).success
      ).toBe(true);

      expect(
        (await pipeline.registerDataset(
          "en-knowledge",
          createEntries("en-001", "English.")
        )).success
      ).toBe(true);

      expect(
        (await pipeline.removeDataset("sq-knowledge")).success
      ).toBe(true);

      expect(
        (await pipeline.registerDataset(
          "fr-knowledge",
          createEntries("fr-001", "Français.")
        )).success
      ).toBe(true);

      const listed = pipeline.listDatasets();
      const persisted = storage.getPersistedDatasets();

      expect(listed.map((dataset) => dataset.id).sort()).toEqual([
        "en-knowledge",
        "fr-knowledge"
      ]);

      expect(persisted.map((dataset) => dataset.id).sort()).toEqual([
        "en-knowledge",
        "fr-knowledge"
      ]);

      expect(pipeline.getMetadata().persistenceConsistent).toBe(true);
    } finally {
      await pipeline.close();
    }
  });

  test("ruan metadata të sakta pas heqjes së dataset-it", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      await pipeline.registerDataset(
        "sq-knowledge",
        createEntries("sq-001")
      );

      await pipeline.registerDataset(
        "en-knowledge",
        createEntries("en-001")
      );

      const result = await pipeline.removeDataset("sq-knowledge");

      expect(result.success).toBe(true);

      const datasets = pipeline.listDatasets();
      const metadata = pipeline.getMetadata();

      expect(datasets).toHaveLength(1);
      expect(datasets[0].id).toBe("en-knowledge");
      expect(metadata.datasetCount).toBe(1);
      expect(metadata.persistenceConsistent).toBe(true);
    } finally {
      await pipeline.close();
    }
  });

  test("rikthen dataset-et pas një restart-i", async () => {
    const storage = createStorageAdapter();

    const firstPipeline = await createPipeline(storage);

    try {
      const sqResult = await firstPipeline.registerDataset(
        "sq-knowledge",
        createEntries("sq-001", "Njohuri shqipe të ruajtura.")
      );

      const enResult = await firstPipeline.registerDataset(
        "en-knowledge",
        createEntries("en-001", "Saved English knowledge.")
      );

      expect(sqResult.success).toBe(true);
      expect(enResult.success).toBe(true);
    } finally {
      await firstPipeline.close();
    }

    const secondPipeline = await createPipeline(storage);

    try {
      expect(storage.loadDatasets).toHaveBeenCalledTimes(2);

      expect(secondPipeline.listDatasets()).toHaveLength(2);

      expect(
        secondPipeline.getDataset("sq-knowledge").collection[0]
      ).toMatchObject({
        id: "sq-001",
        content: "Njohuri shqipe të ruajtura."
      });

      expect(
        secondPipeline.getDataset("en-knowledge").collection[0]
      ).toMatchObject({
        id: "en-001",
        content: "Saved English knowledge."
      });
    } finally {
      await secondPipeline.close();
    }
  });
});
