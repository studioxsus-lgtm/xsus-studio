
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
      topic: "schema-validation",
      keywords: ["xsus", "validation"],
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
    filePath: "/tmp/xsus-knowledge-schema-validation-test.json",
    storageAdapter
  });
}

describe("XSUS AI — Knowledge Dataset Schema Validation Integrity", () => {
  test("pranon një hyrje me fushat e kërkuara", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "valid-dataset",
        createEntries("valid-001", "Njohuri të vlefshme.")
      );

      expect(result.success).toBe(true);

      const dataset = pipeline.getDataset("valid-dataset");

      expect(dataset).not.toBeNull();
      expect(dataset.collection[0]).toMatchObject({
        id: "valid-001",
        title: "Titulli valid-001",
        content: "Njohuri të vlefshme."
      });
    } finally {
      await pipeline.close();
    }
  });

  test("refuzon hyrjen pa fushën content", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "invalid-content-dataset",
        [
          {
            id: "invalid-001",
            title: "Hyrje pa përmbajtje",
            language: "sq",
            domain: "general"
          }
        ]
      );

      expect(result.success).toBe(false);
      expect(
        pipeline.getDataset("invalid-content-dataset")
      ).toBeNull();

      expect(storage.getPersistedDatasets()).toHaveLength(0);
    } finally {
      await pipeline.close();
    }
  });

  test("refuzon dataset me listë hyrjesh të pavlefshme", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "invalid-list-dataset",
        null
      );

      expect(result.success).toBe(false);
      expect(
        pipeline.getDataset("invalid-list-dataset")
      ).toBeNull();

      expect(storage.getPersistedDatasets()).toHaveLength(0);
    } finally {
      await pipeline.close();
    }
  });

  test("refuzon hyrjet me identifikues bosh", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "empty-id-dataset",
        [
          {
            id: " ",
            title: "Identifikues bosh",
            content: "Përmbajtje",
            language: "sq",
            domain: "general"
          }
        ]
      );

      expect(result.success).toBe(false);
      expect(pipeline.getDataset("empty-id-dataset")).toBeNull();
    } finally {
      await pipeline.close();
    }
  });

  test("refuzon hyrjet e dublikuara brenda të njëjtit dataset", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "duplicate-entries-dataset",
        [
          ...createEntries("duplicate-001", "Hyrja e parë."),
          ...createEntries("duplicate-001", "Hyrja e dytë.")
        ]
      );

      expect(result.success).toBe(false);

      expect(
        pipeline.getDataset("duplicate-entries-dataset")
      ).toBeNull();

      expect(storage.getPersistedDatasets()).toHaveLength(0);
    } finally {
      await pipeline.close();
    }
  });

  test("refuzimi i të dhënave të pavlefshme nuk prek dataset-in ekzistues", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const initial = await pipeline.registerDataset(
        "trusted-dataset",
        createEntries("trusted-001", "Të dhëna të besueshme.")
      );

      expect(initial.success).toBe(true);

      const invalid = await pipeline.registerDataset(
        "invalid-dataset",
        [
          {
            id: "invalid-002",
            title: "Pa përmbajtje",
            language: "sq"
          }
        ]
      );

      expect(invalid.success).toBe(false);

      const trusted = pipeline.getDataset("trusted-dataset");

      expect(trusted).not.toBeNull();
      expect(trusted.collection[0]).toMatchObject({
        id: "trusted-001",
        content: "Të dhëna të besueshme."
      });

      expect(
        storage.getPersistedDatasets().map((dataset) => dataset.id)
      ).toEqual(["trusted-dataset"]);
    } finally {
      await pipeline.close();
    }
  });

  test("normalizon të dhënat e vlefshme pa humbur përmbajtjen", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const result = await pipeline.registerDataset(
        "normalized-dataset",
        [
          {
            id: "normalized-001",
            title: "Titull i normalizuar",
            content: "Përmbajtje e ruajtur.",
            language: "sq",
            domain: "general",
            keywords: ["xsus"],
            tags: ["validation"]
          }
        ]
      );

      expect(result.success).toBe(true);

      const dataset = pipeline.getDataset("normalized-dataset");
      const entry = dataset.collection[0];

      expect(entry).toMatchObject({
        id: "normalized-001",
        title: "Titull i normalizuar",
        content: "Përmbajtje e ruajtur.",
        language: "sq",
        domain: "general"
      });

      expect(
        storage.getPersistedDatasets()[0].entries[0]
      ).toMatchObject({
        id: "normalized-001",
        content: "Përmbajtje e ruajtur."
      });
    } finally {
      await pipeline.close();
    }
  });

  test("refuzon hyrjet me titull ose përmbajtje të tipit të gabuar", async () => {
    const storage = createStorageAdapter();
    const pipeline = await createPipeline(storage);

    try {
      const invalidTitle = await pipeline.registerDataset(
        "invalid-title-dataset",
        [
          {
            id: "bad-title-001",
            title: 123,
            content: "Përmbajtje",
            language: "sq",
            domain: "general"
          }
        ]
      );

      const invalidContent = await pipeline.registerDataset(
        "invalid-content-type-dataset",
        [
          {
            id: "bad-content-001",
            title: "Titull",
            content: { text: "Nuk është tekst." },
            language: "sq",
            domain: "general"
          }
        ]
      );

      expect(invalidTitle.success).toBe(false);
      expect(invalidContent.success).toBe(false);

      expect(pipeline.getDataset("invalid-title-dataset")).toBeNull();
      expect(
        pipeline.getDataset("invalid-content-type-dataset")
      ).toBeNull();

      expect(storage.getPersistedDatasets()).toHaveLength(0);
    } finally {
      await pipeline.close();
    }
  });
});
