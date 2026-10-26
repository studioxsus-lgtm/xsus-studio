import { describe, it, expect } from "vitest";
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createKnowledgeDatasetStorage } from "../../src/knowledge/knowledge-dataset-storage.js";
import { createKnowledgeDatasetRegistry } from "../../src/knowledge/knowledge-dataset-registry.js";
import { createKnowledgeDatasetPersistence } from "../../src/knowledge/knowledge-dataset-persistence.js";

describe("XSUS Knowledge Dataset Storage — Corruption Integrity", () => {
  async function createTemporaryStorage() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-dataset-corruption-")
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

  it("detects corrupted JSON without treating it as an empty dataset", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const corruptedContent = '{"formatVersion":"1.0.0","datasets":[';

      await writeFile(
        temporary.filePath,
        corruptedContent,
        "utf8"
      );

      const storage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const result = await storage.loadDatasets();

      expect(result.success).toBe(false);
      expect(result.datasets).toBeNull();
      expect(result.error).toBe("Skedari JSON është i korruptuar.");

      const storedContent = await readFile(
        temporary.filePath,
        "utf8"
      );

      expect(storedContent).toBe(corruptedContent);
    } finally {
      await temporary.cleanup();
    }
  });

  it("rejects an invalid snapshot structure", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const invalidSnapshot = {
        formatVersion: "1.0.0",
        datasets: {
          unexpected: "invalid",
        },
      };

      await writeFile(
        temporary.filePath,
        JSON.stringify(invalidSnapshot),
        "utf8"
      );

      const storage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const result = await storage.loadDatasets();

      expect(result.success).toBe(false);
      expect(result.datasets).toBeNull();
      expect(result.error).toBeTruthy();

      const storedContent = await readFile(
        temporary.filePath,
        "utf8"
      );

      expect(storedContent).toBe(JSON.stringify(invalidSnapshot));
    } finally {
      await temporary.cleanup();
    }
  });

  it("does not partially restore datasets when one dataset is invalid", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const snapshot = {
        formatVersion: "1.0.0",
        datasets: [
          {
            id: "valid-dataset",
            datasetVersion: "1.0.0",
            entries: [
              {
                id: "valid-entry",
                title: "Valid entry",
                content: "This is a valid knowledge entry.",
                language: "en",
                domain: "general",
                topic: "integrity",
                difficulty: "beginner",
                status: "verified",
                source: "xsus-test",
                version: "1.0.0",
              },
            ],
          },
          {
            id: "invalid-dataset",
            datasetVersion: "1.0.0",
            entries: [
              {
                id: "",
                title: "",
                content: "",
              },
            ],
          },
        ],
      };

      await writeFile(
        temporary.filePath,
        JSON.stringify(snapshot),
        "utf8"
      );

      const registry = createKnowledgeDatasetRegistry();

      const storage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const persistence = createKnowledgeDatasetPersistence({
        registry,
        storage,
      });

      const result = await persistence.restoreRegistry();

      expect(result.success).toBe(false);
      expect(result.restored).toBe(false);
      expect(registry.listDatasets()).toEqual([]);
    } finally {
      await temporary.cleanup();
    }
  });

  it("does not automatically overwrite a corrupted file during loading", async () => {
    const temporary = await createTemporaryStorage();

    try {
      const corruptedContent = "THIS IS NOT VALID JSON";

      await writeFile(
        temporary.filePath,
        corruptedContent,
        "utf8"
      );

      const storage = createKnowledgeDatasetStorage({
        filePath: temporary.filePath,
      });

      const result = await storage.loadDatasets();

      expect(result.success).toBe(false);

      const storedContent = await readFile(
        temporary.filePath,
        "utf8"
      );

      expect(storedContent).toBe(corruptedContent);
    } finally {
      await temporary.cleanup();
    }
  });
});
