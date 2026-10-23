
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

import {
  createKnowledgeDatasetStorage
} from "../../src/knowledge/knowledge-dataset-storage.js";

import {
  createKnowledgeDatasetPersistence
} from "../../src/knowledge/knowledge-dataset-persistence.js";

function createEntry(overrides = {}) {
  return {
    id: "xsus-javascript-basics",
    title: "JavaScript Fundamentals",
    content: "JavaScript is a programming language.",
    domain: "programming",
    topic: "JavaScript",
    language: "en",
    difficulty: "beginner",
    status: "verified",
    keywords: ["JavaScript", "programming"],
    tags: ["web"],
    ...overrides
  };
}

describe("Knowledge Dataset Recovery", () => {
  let directory;

  afterEach(async () => {
    if (directory) {
      await rm(directory, {
        recursive: true,
        force: true
      });

      directory = undefined;
    }
  });

  async function createStorage() {
    directory = await mkdtemp(
      join(tmpdir(), "xsus-dataset-recovery-")
    );

    return createKnowledgeDatasetStorage({
      filePath: join(directory, "datasets.json")
    });
  }

  test("rikthen dataset-in pas krijimit të një registry të ri", async () => {
    const storage = await createStorage();

    const originalRegistry = createKnowledgeDatasetRegistry();

    const registration = originalRegistry.registerDataset(
      "programming-core",
      [createEntry()]
    );

    expect(registration.success).toBe(true);

    const originalPersistence = createKnowledgeDatasetPersistence({
      registry: originalRegistry,
      storage
    });

    const saveResult = await originalPersistence.saveRegistry();

    expect(saveResult.success).toBe(true);

    // Simulojmë rinisjen: registry i ri, i njëjti skedar JSON.
    const recoveredRegistry = createKnowledgeDatasetRegistry();

    const recoveredPersistence = createKnowledgeDatasetPersistence({
      registry: recoveredRegistry,
      storage
    });

    const restoreResult =
      await recoveredPersistence.restoreRegistry();

    expect(restoreResult.success).toBe(true);

    const recoveredDataset =
      recoveredRegistry.getDataset("programming-core");

    expect(recoveredDataset).toBeDefined();

    const recoveredEntries =
      Array.isArray(recoveredDataset?.entries)
        ? recoveredDataset.entries
        : recoveredDataset?.collection;

    expect(Array.isArray(recoveredEntries)).toBe(true);

    expect(recoveredEntries).toHaveLength(1);
    expect(recoveredEntries[0].id).toBe(
      "xsus-javascript-basics"
    );
    expect(recoveredEntries[0].title).toBe(
      "JavaScript Fundamentals"
    );
    expect(recoveredEntries[0].content).toBe(
      "JavaScript is a programming language."
    );
  });

  test("ruan dhe rikthen disa dataset-e", async () => {
    const storage = await createStorage();
    const registry = createKnowledgeDatasetRegistry();

    expect(
      registry.registerDataset("programming", [
        createEntry()
      ]).success
    ).toBe(true);

    expect(
      registry.registerDataset("science", [
        createEntry({
          id: "science-basics",
          title: "Science Fundamentals",
          content: "Science studies the natural world.",
          domain: "science",
          topic: "Science"
        })
      ]).success
    ).toBe(true);

    const persistence = createKnowledgeDatasetPersistence({
      registry,
      storage
    });

    const saveResult = await persistence.saveRegistry();

    expect(saveResult.success).toBe(true);
    expect(saveResult.datasetCount).toBe(2);

    const newRegistry = createKnowledgeDatasetRegistry();

    const newPersistence = createKnowledgeDatasetPersistence({
      registry: newRegistry,
      storage
    });

    const restoreResult = await newPersistence.restoreRegistry();

    expect(restoreResult.success).toBe(true);
    expect(newRegistry.listDatasets()).toHaveLength(2);
  });

  test("nuk krijon kopje kur dataset-i rikthehet vetëm një herë", async () => {
    const storage = await createStorage();
    const registry = createKnowledgeDatasetRegistry();

    registry.registerDataset("programming", [
      createEntry()
    ]);

    const persistence = createKnowledgeDatasetPersistence({
      registry,
      storage
    });

    await persistence.saveRegistry();

    const recoveredRegistry = createKnowledgeDatasetRegistry();

    const recoveredPersistence = createKnowledgeDatasetPersistence({
      registry: recoveredRegistry,
      storage
    });

    const firstRestore =
      await recoveredPersistence.restoreRegistry();

    expect(firstRestore.success).toBe(true);
    expect(recoveredRegistry.listDatasets()).toHaveLength(1);

    const secondRestore =
      await recoveredPersistence.restoreRegistry();

    expect(secondRestore.success).toBe(false);
    expect(recoveredRegistry.listDatasets()).toHaveLength(1);
  });
});
