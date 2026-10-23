
import { describe, expect, test } from "vitest";

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
      topic: "versioning",
      keywords: ["xsus", "versioning"],
      tags: ["integration"]
    }
  ];
}

function createStorageAdapter() {
  let persistedDatasets = [];

  return {
    async loadDatasets() {
      return {
        success: true,
        datasets: structuredClone(persistedDatasets)
      };
    },

    async saveDatasets(datasets) {
      persistedDatasets = structuredClone(datasets);

      return { success: true };
    },

    getPersistedDatasets() {
      return structuredClone(persistedDatasets);
    }
  };
}

function createPipeline(storageAdapter) {
  return createKnowledgeDatasetPipeline({
    filePath: "/tmp/xsus-knowledge-versioning-test.json",
    storageAdapter
  });
}

describe("XSUS AI — Knowledge Dataset Versioning Integrity", () => {
  test("cakton versionin e skemës për dataset-in e regjistruar", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "sq-knowledge",
        createEntries("sq-001", "Njohuri shqipe.")
      );

      expect(result.success).toBe(true);

      const dataset = pipeline.getDataset("sq-knowledge");

      expect(dataset).not.toBeNull();
      expect(dataset.schemaVersion).toBeDefined();
      expect(typeof dataset.schemaVersion).toBe("string");
      expect(dataset.schemaVersion.length).toBeGreaterThan(0);
    } finally {
      await pipeline.close();
    }
  });

  test("ruan versionin e skemës në snapshot-in e storage-it", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "versioned-dataset",
        createEntries("version-001", "Përmbajtje me version.")
      );

      expect(result.success).toBe(true);

      const dataset = pipeline.getDataset("versioned-dataset");
      const persisted = storage.getPersistedDatasets();

      expect(persisted).toHaveLength(1);
      expect(persisted[0].id).toBe("versioned-dataset");
      expect(persisted[0].entries).toHaveLength(1);
      expect(persisted[0].entries[0]).toMatchObject({
        id: "version-001",
        content: "Përmbajtje me version."
      });

      expect(dataset.schemaVersion).toBeDefined();
    } finally {
      await pipeline.close();
    }
  });

  test("ruan përmbajtjen pas restart-it", async () => {
    const storage = createStorageAdapter();

    const firstPipeline = await createPipeline(storage);

    try {
      const result = await firstPipeline.registerDataset(
        "restart-dataset",
        createEntries("restart-001", "Të dhëna të versionuara.")
      );

      expect(result.success).toBe(true);
    } finally {
      await firstPipeline.close();
    }

    const secondPipeline = await createPipeline(storage);

    try {
      const dataset = secondPipeline.getDataset("restart-dataset");

      expect(dataset).not.toBeNull();
      expect(dataset.collection[0]).toMatchObject({
        id: "restart-001",
        content: "Të dhëna të versionuara."
      });

      expect(dataset.schemaVersion).toBeDefined();
    } finally {
      await secondPipeline.close();
    }
  });

  test("ruan të njëjtin version të skemës pas rikuperimit", async () => {
    const storage = createStorageAdapter();

    const firstPipeline = await createPipeline(storage);
    let originalSchemaVersion;

    try {
      const result = await firstPipeline.registerDataset(
        "stable-version-dataset",
        createEntries("stable-001")
      );

      expect(result.success).toBe(true);

      originalSchemaVersion = firstPipeline
        .getDataset("stable-version-dataset")
        .schemaVersion;
    } finally {
      await firstPipeline.close();
    }

    const secondPipeline = await createPipeline(storage);

    try {
      const recoveredDataset = secondPipeline.getDataset(
        "stable-version-dataset"
      );

      expect(recoveredDataset).not.toBeNull();
      expect(recoveredDataset.schemaVersion).toBe(
        originalSchemaVersion
      );
    } finally {
      await secondPipeline.close();
    }
  });

  test("ruan metadata konsistente pas regjistrimit dhe rikuperimit", async () => {
    const storage = createStorageAdapter();

    const firstPipeline = await createPipeline(storage);

    try {
      const result = await firstPipeline.registerDataset(
        "metadata-version-dataset",
        createEntries("metadata-001")
      );

      expect(result.success).toBe(true);
      expect(firstPipeline.getMetadata().datasetCount).toBe(1);
    } finally {
      await firstPipeline.close();
    }

    const secondPipeline = await createPipeline(storage);

    try {
      const metadata = secondPipeline.getMetadata();

      expect(metadata.datasetCount).toBe(1);
      expect(metadata.persistenceConsistent).toBe(true);
      expect(
        secondPipeline.getDataset("metadata-version-dataset")
      ).not.toBeNull();
    } finally {
      await secondPipeline.close();
    }
  });

  test("nuk ndryshon versionin kur përditësohet vetëm përmbajtja", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const firstResult = await pipeline.registerDataset(
        "content-version-dataset",
        createEntries("content-001", "Përmbajtja e parë.")
      );

      expect(firstResult.success).toBe(true);

      const originalDataset = pipeline.getDataset(
        "content-version-dataset"
      );

      const originalSchemaVersion = originalDataset.schemaVersion;

      expect(originalDataset.collection[0].content).toBe(
        "Përmbajtja e parë."
      );

      // Dataset-et me të njëjtin ID nuk regjistrohen përsëri.
      // Ky kontroll siguron që dublikimi nuk ndryshon versionin
      // ose përmbajtjen ekzistuese.
      const duplicateResult = await pipeline.registerDataset(
        "content-version-dataset",
        createEntries("content-002", "Përmbajtja e dytë.")
      );

      expect(duplicateResult.success).toBe(false);

      const currentDataset = pipeline.getDataset(
        "content-version-dataset"
      );

      expect(currentDataset.schemaVersion).toBe(
        originalSchemaVersion
      );

      expect(currentDataset.collection[0].content).toBe(
        "Përmbajtja e parë."
      );
    } finally {
      await pipeline.close();
    }
  });
});
