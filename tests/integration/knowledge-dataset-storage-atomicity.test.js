import { describe, it, expect } from "vitest";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createKnowledgeDatasetStorage } from "../../src/knowledge/knowledge-dataset-storage.js";

describe("XSUS Knowledge Dataset Storage — Atomicity", () => {
  async function createTemporaryStorage() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-dataset-atomicity-")
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
          title: "Atomicity test",
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

  function createInvalidDataset() {
    return {
      id: "invalid-dataset",
      datasetVersion: "1.0.0",
      entries: [
        {
          id: "",
          title: "",
          content: "",
        },
      ],
    };
  }

  it("preserves the existing snapshot when a new save is rejected", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const storage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const originalDataset = createValidDataset(
        "stable-dataset",
        "stable-entry",
        "Original data must remain unchanged."
      );

      const initialSave = await storage.saveDatasets([
        originalDataset,
      ]);

      expect(initialSave.success).toBe(true);

      const originalSnapshot = await readFile(
        temporary.filePath,
        "utf8"
      );

      const failedSave = await storage.saveDatasets([
        createInvalidDataset(),
      ]);

      expect(failedSave.success).toBe(false);

      const snapshotAfterFailure = await readFile(
        temporary.filePath,
        "utf8"
      );

      expect(snapshotAfterFailure).toBe(originalSnapshot);

      const loaded = await storage.loadDatasets();

      expect(loaded.success).toBe(true);
      expect(loaded.datasets).toHaveLength(1);
      expect(loaded.datasets[0].id).toBe("stable-dataset");
      expect(loaded.datasets[0].entries[0].content).toBe(
        "Original data must remain unchanged."
      );
    } finally {
      await temporary.cleanup();
    }
  });

  it("does not leave temporary files after a rejected save", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const storage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const initialSave = await storage.saveDatasets([
        createValidDataset(
          "stable-dataset",
          "stable-entry",
          "Existing valid data."
        ),
      ]);

      expect(initialSave.success).toBe(true);

      const failedSave = await storage.saveDatasets([
        createInvalidDataset(),
      ]);

      expect(failedSave.success).toBe(false);

      const files = await readdir(temporary.directory);

      expect(files).toEqual(["datasets.json"]);
    } finally {
      await temporary.cleanup();
    }
  });

  it("allows a valid save after a rejected save", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const storage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const initialSave = await storage.saveDatasets([
        createValidDataset(
          "first-dataset",
          "first-entry",
          "First valid snapshot."
        ),
      ]);

      expect(initialSave.success).toBe(true);

      const failedSave = await storage.saveDatasets([
        createInvalidDataset(),
      ]);

      expect(failedSave.success).toBe(false);

      const nextSave = await storage.saveDatasets([
        createValidDataset(
          "recovered-dataset",
          "recovered-entry",
          "A valid save after a rejected save."
        ),
      ]);

      expect(nextSave.success).toBe(true);

      const loaded = await storage.loadDatasets();

      expect(loaded.success).toBe(true);
      expect(loaded.datasets).toHaveLength(1);
      expect(loaded.datasets[0].id).toBe("recovered-dataset");
      expect(loaded.datasets[0].entries[0].content).toBe(
        "A valid save after a rejected save."
      );
    } finally {
      await temporary.cleanup();
    }
  });
});
