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
  return mkdtemp(join(tmpdir(), "xsus-close-failure-"));
}

function createFailingCloseAdapter() {
  const closeMock = vi.fn(async (handle) => {
    // Mbyllim fillimisht handle-in real për të shmangur
    // lënien e burimeve të sistemit të hapura.
    await handle.close();

    const error = new Error("Simulated close failure");
    error.code = "EIO";

    throw error;
  });

  const openMock = vi.fn(async (...args) => {
    const handle = await open(...args);

    return {
      writeFile: (...writeArgs) =>
        handle.writeFile(...writeArgs),

      sync: (...syncArgs) =>
        handle.sync(...syncArgs),

      close: () => closeMock(handle),
    };
  });

  return {
    fileSystem: createFileSystemAdapter({
      open: openMock,
    }),
    openMock,
    closeMock,
  };
}

describe("Knowledge Dataset Storage — Close Failure", () => {
  it("ruan snapshot-in ekzistues dhe pastron skedarin e përkohshëm kur close dështon", async () => {
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
        closeMock,
      } = createFailingCloseAdapter();

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
      expect(closeMock).toHaveBeenCalled();

      // Snapshot-i origjinal duhet të mbetet i pandryshuar.
      const snapshotAfterFailure = await readFile(
        filePath,
        "utf8"
      );

      expect(snapshotAfterFailure).toBe(originalSnapshot);

      // Skedari i përkohshëm duhet të jetë pastruar.
      const files = await readdir(directory);

      expect(files).toEqual(["datasets.json"]);

      // Të dhënat origjinale duhet të jenë ende të lexueshme.
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

  it("lejon një ruajtje të re pas dështimit të close", async () => {
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
      } = createFailingCloseAdapter();

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

      // Pas dështimit, ruajmë me implementimin normal.
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

      // Nuk duhet të mbeten skedarë të përkohshëm.
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
