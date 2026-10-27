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

import { createKnowledgeDatasetStorage } from "../../src/knowledge/knowledge-dataset-storage.js";

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
  return mkdtemp(join(tmpdir(), "xsus-write-failure-"));
}

function createFailingWriteAdapter() {
  const writeFileMock = vi.fn(async (handle, ...args) => {
    // Shkruajmë përmbajtje të pjesshme për të simuluar
    // një dështim pasi skedari i përkohshëm është krijuar.
    await handle.writeFile("partial-data", "utf8");

    const error = new Error("Simulated write failure");
    error.code = "EIO";

    throw error;
  });

  const openMock = vi.fn(async (...args) => {
    const handle = await open(...args);

    return {
      writeFile: (...writeArgs) =>
        writeFileMock(handle, ...writeArgs),

      sync: (...syncArgs) => handle.sync(...syncArgs),

      close: (...closeArgs) => handle.close(...closeArgs),
    };
  });

  return {
    fileSystem: createFileSystemAdapter({
      open: openMock,
    }),
    openMock,
    writeFileMock,
  };
}

describe("Knowledge Dataset Storage — Write Failure", () => {
  it("ruan snapshot-in ekzistues dhe pastron skedarin e përkohshëm kur shkrimi dështon", async () => {
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
        writeFileMock,
      } = createFailingWriteAdapter();

      const failingStorage = createKnowledgeDatasetStorage({
        filePath,
        fileSystem,
      });

      const replacementDataset = createDataset(
        "replacement-dataset",
        "Replacement Dataset",
        "This content must not replace the original."
      );

      const failedSave = await failingStorage.saveDatasets([
        replacementDataset,
      ]);

      // Ruajtja duhet të raportohet si e dështuar.
      expect(failedSave.success).toBe(false);

      // Duhet të jetë provuar hapja dhe shkrimi.
      expect(openMock).toHaveBeenCalled();
      expect(writeFileMock).toHaveBeenCalled();

      // Snapshot-i origjinal duhet të mbetet i pandryshuar.
      const snapshotAfterFailure = await readFile(
        filePath,
        "utf8"
      );

      expect(snapshotAfterFailure).toBe(originalSnapshot);

      // Skedari i përkohshëm duhet të jetë pastruar.
      const files = await readdir(directory);

      expect(files).toEqual(["datasets.json"]);

      // Të dhënat origjinale duhet të lexohen ende saktë.
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

  it("lejon një ruajtje të re pas dështimit të shkrimit", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "datasets.json");

    try {
      const normalStorage = createKnowledgeDatasetStorage({
        filePath,
      });

      const originalDataset = createDataset(
        "original-dataset",
        "Original Dataset",
        "Initial content."
      );

      const initialSave = await normalStorage.saveDatasets([
        originalDataset,
      ]);

      expect(initialSave.success).toBe(true);

      const {
        fileSystem,
      } = createFailingWriteAdapter();

      const failingStorage = createKnowledgeDatasetStorage({
        filePath,
        fileSystem,
      });

      const failedSave = await failingStorage.saveDatasets([
        createDataset(
          "failed-dataset",
          "Failed Dataset",
          "This write is expected to fail."
        ),
      ]);

      expect(failedSave.success).toBe(false);

      // Pas dështimit, ruajmë me implementimin normal.
      const recoveryDataset = createDataset(
        "recovery-dataset",
        "Recovery Dataset",
        "Recovery succeeded."
      );

      const recoverySave = await normalStorage.saveDatasets([
        recoveryDataset,
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
