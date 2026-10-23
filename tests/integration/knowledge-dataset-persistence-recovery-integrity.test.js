import { describe, expect, test, vi } from "vitest";

import {
  createKnowledgeDatasetPersistence
} from "../../src/knowledge/knowledge-dataset-persistence.js";

import {
  createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

function createEntries(id, content = `Përmbajtja ${id}`) {
  return [
    {
      id,
      title: `Titulli ${id}`,
      content,
      language: "sq",
      domain: "general",
      topic: "recovery",
      keywords: ["xsus", "recovery"],
      tags: ["integration"]
    }
  ];
}

function createStorage(datasets = []) {
  return {
    loadDatasets: vi.fn(async () => ({
      success: true,
      datasets: structuredClone(datasets)
    })),

    saveDatasets: vi.fn(async () => ({
      success: true
    }))
  };
}

function createPersistence({ datasets = [], registry } = {}) {
  const targetRegistry =
    registry ?? createKnowledgeDatasetRegistry();

  const storage = createStorage(datasets);

  const persistence = createKnowledgeDatasetPersistence({
    registry: targetRegistry,
    storage
  });

  return {
    registry: targetRegistry,
    storage,
    persistence
  };
}

describe("XSUS AI — Persistence Recovery Integrity", () => {
  test("rikuperon disa dataset-e me të gjitha hyrjet", async () => {
    const { registry, persistence, storage } =
      createPersistence({
        datasets: [
          {
            id: "albanian-knowledge",
            entries: createEntries(
              "sq-001",
              "Njohuri në shqip."
            )
          },
          {
            id: "english-knowledge",
            entries: createEntries(
              "en-001",
              "Knowledge in English."
            )
          }
        ]
      });

    const result = await persistence.restoreRegistry();

    expect(result.success).toBe(true);
    expect(result.restored).toBe(true);
    expect(result.datasetCount).toBe(2);
    expect(result.datasetIds).toEqual([
      "albanian-knowledge",
      "english-knowledge"
    ]);

    expect(registry.listDatasets()).toHaveLength(2);

    expect(
      registry.getDataset("albanian-knowledge")
        .collection[0]
    ).toMatchObject({
      id: "sq-001",
      content: "Njohuri në shqip."
    });

    expect(
      registry.getDataset("english-knowledge")
        .collection[0]
    ).toMatchObject({
      id: "en-001",
      content: "Knowledge in English."
    });

    expect(storage.loadDatasets).toHaveBeenCalledTimes(1);
  });

  test("refuzon dataset-e të pavlefshme pa regjistrim të pjesshëm", async () => {
    const { registry, persistence } = createPersistence({
      datasets: [
        {
          id: "valid-dataset",
          entries: createEntries("valid-001")
        },
        {
          id: "invalid-dataset",
          entries: []
        }
      ]
    });

    const result = await persistence.restoreRegistry();

    expect(result.success).toBe(false);
    expect(result.restored).toBe(false);
    expect(registry.listDatasets()).toHaveLength(0);
  });

  test("refuzon identifikues të përsëritur pa regjistrim të pjesshëm", async () => {
    const repeatedEntries = [
      ...createEntries("duplicate-001"),
      ...createEntries("duplicate-001")
    ];

    const { registry, persistence } = createPersistence({
      datasets: [
        {
          id: "first-dataset",
          entries: createEntries("first-001")
        },
        {
          id: "second-dataset",
          entries: repeatedEntries
        }
      ]
    });

    const result = await persistence.restoreRegistry();

    expect(result.success).toBe(false);
    expect(result.restored).toBe(false);
    expect(registry.listDatasets()).toHaveLength(0);
  });

  test("refuzon përgjigje të pavlefshme nga storage", async () => {
    const registry = createKnowledgeDatasetRegistry();

    const storage = {
      loadDatasets: vi.fn(async () => ({
        success: true,
        datasets: null
      })),

      saveDatasets: vi.fn(async () => ({
        success: true
      }))
    };

    const persistence = createKnowledgeDatasetPersistence({
      registry,
      storage
    });

    const result = await persistence.restoreRegistry();

    expect(result.success).toBe(false);
    expect(result.restored).toBe(false);
    expect(registry.listDatasets()).toHaveLength(0);
  });

  test("nuk rikuperon mbi një regjistër që nuk është bosh", async () => {
    const registry = createKnowledgeDatasetRegistry();

    registry.registerDataset(
      "existing-dataset",
      createEntries("existing-001")
    );

    const storage = createStorage([
      {
        id: "incoming-dataset",
        entries: createEntries("incoming-001")
      }
    ]);

    const persistence = createKnowledgeDatasetPersistence({
      registry,
      storage
    });

    const result = await persistence.restoreRegistry();

    expect(result.success).toBe(false);
    expect(result.restored).toBe(false);
    expect(storage.loadDatasets).not.toHaveBeenCalled();

    expect(registry.listDatasets()).toHaveLength(1);
    expect(registry.getDataset("existing-dataset")).not.toBeNull();
    expect(registry.getDataset("incoming-dataset")).toBeNull();
  });

  test("ruan snapshot-in e të gjitha dataset-eve nga regjistri", async () => {
    const { registry, persistence, storage } = createPersistence();

    registry.registerDataset(
      "sq-knowledge",
      createEntries("sq-001", "Përmbajtja shqipe.")
    );

    registry.registerDataset(
      "en-knowledge",
      createEntries("en-001", "English content.")
    );

    const result = await persistence.saveRegistry();

    expect(result.success).toBe(true);
    expect(result.datasetCount).toBe(2);
    expect(storage.saveDatasets).toHaveBeenCalledTimes(1);

    const snapshot = storage.saveDatasets.mock.calls[0][0];

    expect(snapshot).toHaveLength(2);

    expect(snapshot).toContainEqual({
      id: "sq-knowledge",
      entries: createEntries("sq-001", "Përmbajtja shqipe.")
    });

    expect(snapshot).toContainEqual({
      id: "en-knowledge",
      entries: createEntries("en-001", "English content.")
    });
  });

  test("kthen gabim kur ruajtja dështon", async () => {
    const registry = createKnowledgeDatasetRegistry();

    registry.registerDataset(
      "sq-knowledge",
      createEntries("sq-001")
    );

    const storage = {
      loadDatasets: vi.fn(async () => ({
        success: true,
        datasets: []
      })),

      saveDatasets: vi.fn(async () => ({
        success: false,
        error: "Dështim i simuluar i ruajtjes."
      }))
    };

    const persistence = createKnowledgeDatasetPersistence({
      registry,
      storage
    });

    const result = await persistence.saveRegistry();

    expect(result.success).toBe(false);
    expect(result.error).toContain(
      "Dështim i simuluar i ruajtjes."
    );
  });
});
