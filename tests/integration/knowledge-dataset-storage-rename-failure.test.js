import { describe, it, expect, vi } from "vitest";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  readFile as readFileFromDisk,
  open,
  rename,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createKnowledgeDatasetStorage } from "../../src/knowledge/knowledge-dataset-storage.js";

describe("XSUS Knowledge Dataset Storage — Rename Failure", () => {
  async function createTemporaryStorage() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-dataset-rename-failure-")
    );

    const filePath = join(directory, "datasets.json");

    return {
      directory,
      filePath,
      cleanup: async () => {
        await rm(directory, {
          recursive: true,
          force: true,
        });
      },
    };
  }

  function createValidDataset(id, entryId, content) {
    return {
      id,
      datasetVersion: "1.0.0",
      entries: [
        {
          id: entryId,
          title: "Rename failure test",
          content,
          language: "en",
          domain: "general",
          topic: "storage-integrity",
          difficulty: "beginner",
          status: "verified",
          source: "xsus-test",
          version: "1.0.0",
        },
      ],
    };
  }

  function createFileSystemAdapter(overrides = {}) {
    return {
      readFile: readFileFromDisk,
      open,
      rename,
      mkdir,
      rm,
      ...overrides,
    };
  }

  it("preserves the existing snapshot when rename fails", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const normalStorage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const initialSave = await normalStorage.saveDatasets([
        createValidDataset(
          "stable-dataset",
          "stable-entry",
          "Original snapshot must remain intact."
        ),
      ]);

      expect(initialSave.success).toBe(true);

      const originalSnapshot = await readFile(
        temporary.filePath,
        "utf8"
      );

      const failingRename = vi.fn(async () => {
        const error = new Error("Simulated rename failure");
        error.code = "EIO";
        throw error;
      });

      const storageWithRenameFailure =
        createKnowledgeDatasetStorage({
          filePath: temporary.filePath,
          fileSystem: createFileSystemAdapter({
            rename: failingRename,
          }),
        });

      const failedSave =
        await storageWithRenameFailure.saveDatasets([
          createValidDataset(
            "replacement-dataset",
            "replacement-entry",
            "This snapshot must not replace the original."
          ),
        ]);

      expect(failedSave.success).toBe(false);
      expect(failingRename).toHaveBeenCalledTimes(1);

      const snapshotAfterFailure = await readFile(
        temporary.filePath,
        "utf8"
      );

      expect(snapshotAfterFailure).toBe(originalSnapshot);

      const files = await readdir(temporary.directory);

      expect(files).toEqual(["datasets.json"]);

      const loaded = await normalStorage.loadDatasets();

      expect(loaded.success).toBe(true);
      expect(loaded.datasets).toHaveLength(1);
      expect(loaded.datasets[0].id).toBe("stable-dataset");
      expect(loaded.datasets[0].entries[0].content).toBe(
        "Original snapshot must remain intact."
      );
    } finally {
      await temporary.cleanup();
    }
  });

  it("allows a later save after a rename failure", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const initialStorage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const initialSave = await initialStorage.saveDatasets([
        createValidDataset(
          "initial-dataset",
          "initial-entry",
          "Initial valid snapshot."
        ),
      ]);

      expect(initialSave.success).toBe(true);

      const failingRename = vi.fn(async () => {
        const error = new Error("Simulated rename failure");
        error.code = "EIO";
        throw error;
      });

      const failingStorage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
        fileSystem: createFileSystemAdapter({
          rename: failingRename,
        }),
      });

      const failedSave = await failingStorage.saveDatasets([
        createValidDataset(
          "failed-dataset",
          "failed-entry",
          "This save should fail."
        ),
      ]);

      expect(failedSave.success).toBe(false);

      const recoveryStorage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const recoverySave = await recoveryStorage.saveDatasets([
        createValidDataset(
          "recovered-dataset",
          "recovered-entry",
          "Save after rename failure succeeded."
        ),
      ]);

      expect(recoverySave.success).toBe(true);

      const loaded = await recoveryStorage.loadDatasets();

      expect(loaded.success).toBe(true);
      expect(loaded.datasets).toHaveLength(1);
      expect(loaded.datasets[0].id).toBe("recovered-dataset");
      expect(loaded.datasets[0].entries[0].content).toBe(
        "Save after rename failure succeeded."
      );

      const files = await readdir(temporary.directory);

      expect(files).toEqual(["datasets.json"]);
    } finally {
      await temporary.cleanup();
    }
  });
});
