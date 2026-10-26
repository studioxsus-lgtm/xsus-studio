import { afterEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  initializeKnowledgeDatasets
} from "../../src/knowledge/knowledge-dataset-bootstrap.js";

const activeBootstraps = [];
const temporaryDirectories = [];

describe("XSUS AI — Knowledge Dataset Bootstrap Integrity", () => {
  afterEach(async () => {
    for (const instance of activeBootstraps.splice(0)) {
      instance.close();
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

  async function createTemporaryFilePath() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-knowledge-bootstrap-")
    );

    temporaryDirectories.push(directory);

    return join(directory, "datasets.json");
  }

  async function createBootstrap(options = {}) {
    const filePath = options.filePath ?? await createTemporaryFilePath();

    const instance = await initializeKnowledgeDatasets({
      ...options,
      filePath
    });

    activeBootstraps.push(instance);

    return { instance, filePath };
  }

  function createEntry(overrides = {}) {
    return {
      id: "bootstrap-entry-001",
      title: "Bootstrap Test Entry",
      content: "This entry verifies knowledge dataset bootstrap integrity.",
      language: "en",
      domain: "general",
      topic: "bootstrap",
      keywords: ["xsus", "bootstrap"],
      tags: ["integration"],
      ...overrides
    };
  }

  function createStorageAdapter(initialDatasets = []) {
    let savedDatasets = structuredClone(initialDatasets);

    return {
      loadDatasets: vi.fn(async () => ({
        success: true,
        datasets: structuredClone(savedDatasets)
      })),

      saveDatasets: vi.fn(async (datasets) => {
        savedDatasets = structuredClone(datasets);

        return {
          success: true,
          datasetCount: savedDatasets.length
        };
      }),

      getSavedDatasets() {
        return structuredClone(savedDatasets);
      }
    };
  }

  test("inicializohet pa dataset-e të ruajtura", async () => {
    const { instance } = await createBootstrap();

    expect(instance.success).toBe(true);
    expect(instance.registry).toBeDefined();
    expect(instance.storage).toBeDefined();
    expect(instance.persistence).toBeDefined();
    expect(instance.integration).toBeDefined();
    expect(instance.restoration).toBeDefined();
  });

  test("ofron metadata të sakta për storage-in file", async () => {
    const { instance } = await createBootstrap();

    expect(instance.getMetadata()).toEqual({
      engine: "xsus-knowledge-dataset-bootstrap",
      version: "1.1.0",
      storageMode: "file"
    });
  });

  test("mbyllet pa çregjistrim të dyfishtë", async () => {
    const { instance } = await createBootstrap();

    expect(instance.close()).toBe(true);
    expect(instance.close()).toBe(false);
  });

  test("refuzon filePath të pavlefshëm", async () => {
    await expect(
      initializeKnowledgeDatasets({})
    ).rejects.toThrow(TypeError);

    await expect(
      initializeKnowledgeDatasets({
        filePath: "   "
      })
    ).rejects.toThrow(TypeError);
  });

  test("pranon adapter të vlefshëm dhe shënon mënyrën adapter", async () => {
    const storageAdapter = createStorageAdapter();

    const { instance } = await createBootstrap({
      storageAdapter
    });

    expect(instance.getMetadata()).toEqual({
      engine: "xsus-knowledge-dataset-bootstrap",
      version: "1.1.0",
      storageMode: "adapter"
    });

    expect(storageAdapter.loadDatasets).toHaveBeenCalledTimes(1);
  });

  test("refuzon adapter që nuk përmban metodat e kërkuara", async () => {
    await expect(
      initializeKnowledgeDatasets({
        storageAdapter: {}
      })
    ).rejects.toThrow(TypeError);

    await expect(
      initializeKnowledgeDatasets({
        storageAdapter: {
          loadDatasets: async () => ({
            success: true,
            datasets: []
          })
        }
      })
    ).rejects.toThrow(TypeError);
  });

  test("ruan dataset-in përmes bootstrap.save()", async () => {
    const storageAdapter = createStorageAdapter();
    const { instance } = await createBootstrap({
      storageAdapter
    });

    const result = await instance.registry.registerDataset(
      "bootstrap-save-dataset",
      [createEntry()]
    );

    expect(result.success).toBe(true);

    const saveResult = await instance.save();

    expect(saveResult.success).toBe(true);
    expect(storageAdapter.saveDatasets).toHaveBeenCalled();
    expect(storageAdapter.getSavedDatasets()).toHaveLength(1);
  });

  test("rikthen dataset-et ekzistuese nga adapteri", async () => {
    const savedDataset = {
      id: "restored-dataset",
      title: "Restored Dataset",
      entries: [createEntry()],
      metadata: {
        source: "bootstrap-test"
      }
    };

    const storageAdapter = createStorageAdapter([
      savedDataset
    ]);

    const { instance } = await createBootstrap({
      storageAdapter
    });

    expect(
      instance.registry.getDataset("restored-dataset")
    ).not.toBeNull();

    expect(instance.restoration.success).toBe(true);
  });

  test("refuzon inicializimin kur rikthimi dështon", async () => {
    const storageAdapter = {
      loadDatasets: vi.fn(async () => ({
        success: false,
        error: "Gabim i simuluar gjatë rikthimit."
      })),

      saveDatasets: vi.fn(async () => ({
        success: true
      }))
    };

    await expect(
      initializeKnowledgeDatasets({
        storageAdapter
      })
    ).rejects.toThrow(
      /Rikthimi i dataset-eve të XSUS AI dështoi/
    );
  });

  test("nuk regjistron integrim të vlefshëm pas dështimit të rikthimit", async () => {
    const sourceName =
      "xsus-bootstrap-failure-isolation-test";

    const storageAdapter = {
      loadDatasets: async () => ({
        success: false,
        error: "Dështim i simuluar."
      }),

      saveDatasets: async () => ({
        success: true
      })
    };

    await expect(
      initializeKnowledgeDatasets({
        storageAdapter,
        sourceName
      })
    ).rejects.toThrow();
  });

  test("save() pas mbylljes refuzohet", async () => {
    const { instance } = await createBootstrap();

    expect(instance.close()).toBe(true);

    await expect(
      instance.save()
    ).rejects.toThrow(
      "Inicializuesi i dataset-eve është mbyllur."
    );
  });

  test("skedari JSON bosh nuk krijon dataset-e të rreme", async () => {
    const filePath = await createTemporaryFilePath();

    await writeFile(
      filePath,
      JSON.stringify({
        formatVersion: "1.0.0",
        datasets: []
      }),
      "utf8"
    );

    const { instance } = await createBootstrap({
      filePath
    });

    expect(instance.success).toBe(true);
    expect(instance.restoration.success).toBe(true);
    expect(instance.restoration.restored).toBe(true);
    expect(instance.restoration.datasetCount).toBe(0);
    expect(instance.restoration.datasetIds).toEqual([]);
    expect(instance.registry.listDatasets()).toEqual([]);
  });
});
