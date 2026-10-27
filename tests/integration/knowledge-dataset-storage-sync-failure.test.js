import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  open,
  rename,
  mkdir,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  createKnowledgeDatasetStorage,
} from "../../src/knowledge/knowledge-dataset-storage.js";

function createDataset(id, title, content) {
  return {
    id,
    title,
    datasetVersion: "1.0.0",
    entries: [
      {
        id: `${id}-entry-1`,
        title,
        content,
      },
    ],
  };
}

function createFileSystemAdapter(overrides = {}) {
  return {
    readFile,
    open,
    rename,
    mkdir,
    rm,
    ...overrides,
  };
}

async function createTemporaryDirectory() {
  return mkdtemp(join(tmpdir(), "xsus-sync-failure-"));
}

function createFailingSyncAdapter() {
  const syncMock = vi.fn(async () => {
    const error = new Error("Simulated sync failure");
    error.code = "EIO";
    throw error;
  });

  const openMock = vi.fn(async (...args) => {
    const handle = await open(...args);

    return {
      writeFile: (...writeArgs) =>
        handle.writeFile(...writeArgs),

      sync: (...syncArgs) =>
        syncMock(...syncArgs),

      close: (...closeArgs) =>
        handle.close(...closeArgs),
    };
  });

  return {
    fileSystem: createFileSystemAdapter({
      open: openMock,
    }),
    openMock,
    syncMock,
  };
}

describe("Knowledge Dataset Storage — Sync Failure", () => {
  it("ruan snapshot-in ekzistues dhe pastron skedarin e përkohshëm kur sync dështon", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "datasets.json");

    try {
      const normalStorage = createKnowledgeDatasetStorage({
        filePath,
      });

      const originalDataset = createDataset(
        "original-dataset",
        "Original Dataset",
        "Original content must remain intact."
      );

      const initialSave = await normalStorage.saveDatasets([
        originalDataset,
      ]);

      expect(initialSave.success).toBe(true);

      const originalSnapshot = await readFile(filePath, "utf8");

      const {
        fileSystem,
        openMock,
        syncMock,
      } = createFailingSyncAdapter();

      const failingStorage = createKnowledgeDatasetStorage({
        filePath,
        fileSystem,
      });

      const failedSave = await failingStorage.saveDatasets([
        createDataset(
          "replacement-dataset",
          "Replacement Dataset",
          "This content must not replace the original."
        ),
      ]);

      expect(failedSave.success).toBe(false);
      expect(openMock).toHaveBeenCalled();
      expect(syncMock).toHaveBeenCalled();

      // Skedari origjinal nuk duhet të ndryshojë.
      const snapshotAfterFailure = await readFile(
        filePath,
        "utf8"
      );

      expect(snapshotAfterFailure).toBe(originalSnapshot);

      // Skedari i përkohshëm duhet të jetë hequr.
      const files = await readdir(directory);

      expect(files).toEqual(["datasets.json"]);

      // Dataset-i origjinal duhet të jetë ende i lexueshëm.
      const loaded = await normalStorage.loadDatasets();

      expect(loaded.success).toBe(true);
      expect(loaded.datasets).toHaveLength(1);
      expect(loaded.datasets[0].id).toBe("original-dataset");
      expect(loaded.datasets[0].entries[0].content).toBe(
        "Original content must remain intact."
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("lejon ruajtjen e re pas dështimit të sync", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "datasets.json");

    try {
      const normalStorage = createKnowledgeDatasetStorage({
        filePath,
      });

      const initialSave = await normalStorage.saveDatasets([
        createDataset(
          "original-dataset",
          "Original Dataset",
          "Initial content."
        ),
      ]);

      expect(initialSave.success).toBe(true);

      const {
        fileSystem,
      } = createFailingSyncAdapter();

      const failingStorage = createKnowledgeDatasetStorage({
        filePath,
        fileSystem,
      });

      const failedSave = await failingStorage.saveDatasets([
        createDataset(
          "failed-dataset",
          "Failed Dataset",
          "This save must fail."
        ),
      ]);

      expect(failedSave.success).toBe(false);

      const recoverySave = await normalStorage.saveDatasets([
        createDataset(
          "recovery-dataset",
          "Recovery Dataset",
          "Recovery succeeded."
        ),
      ]);

      expect(recoverySave.success).toBe(true);

      const loaded = await normalStorage.loadDatasets();

      expect(loaded.success).toBe(true);
      expect(loaded.datasets).toHaveLength(1);
      expect(loaded.datasets[0].id).toBe("recovery-dataset");
      expect(loaded.datasets[0].entries[0].content).toBe(
        "Recovery succeeded."
      );

      const files = await readdir(directory);

      expect(files).toEqual(["datasets.json"]);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
