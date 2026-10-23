
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

import {
  createKnowledgeDatasetSearchAdapter
} from "../../src/knowledge/knowledge-dataset-search-adapter.js";

function createEntry(overrides = {}) {
  return {
    id: "xsus-js-basics",
    title: "JavaScript Fundamentals",
    content: "JavaScript is a programming language used to build web applications.",
    domain: "programming",
    topic: "JavaScript",
    language: "en",
    difficulty: "beginner",
    status: "verified",
    keywords: ["JavaScript", "programming", "web"],
    tags: ["frontend"],
    ...overrides
  };
}

describe("Knowledge Dataset Search Recovery", () => {
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
      join(tmpdir(), "xsus-search-recovery-")
    );

    return createKnowledgeDatasetStorage({
      filePath: join(directory, "datasets.json")
    });
  }

  test("kërkon njohuri pas ruajtjes dhe rikthimit", async () => {
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

    // Simulojmë rinisjen e sistemit.
    const recoveredRegistry = createKnowledgeDatasetRegistry();

    const recoveredPersistence = createKnowledgeDatasetPersistence({
      registry: recoveredRegistry,
      storage
    });

    const restoreResult =
      await recoveredPersistence.restoreRegistry();

    expect(restoreResult.success).toBe(true);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: recoveredRegistry
    });

    const result = adapter.search("JavaScript", {
      language: "en",
      domain: "programming"
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe("xsus-js-basics");
    expect(result.results[0].datasetId).toBe("programming-core");
    expect(result.metadata.matchedCount).toBe(1);
  });

  test("respekton filtrin e gjuhës pas rikthimit", async () => {
    const storage = await createStorage();
    const registry = createKnowledgeDatasetRegistry();

    registry.registerDataset("multilingual-core", [
      createEntry({
        id: "js-en",
        language: "en"
      }),
      createEntry({
        id: "js-sq",
        title: "Bazat e JavaScript",
        content: "JavaScript përdoret për aplikacione web.",
        language: "sq"
      })
    ]);

    const persistence = createKnowledgeDatasetPersistence({
      registry,
      storage
    });

    const saveResult = await persistence.saveRegistry();
    expect(saveResult.success).toBe(true);

    const recoveredRegistry = createKnowledgeDatasetRegistry();

    const recoveredPersistence = createKnowledgeDatasetPersistence({
      registry: recoveredRegistry,
      storage
    });

    const restoreResult =
      await recoveredPersistence.restoreRegistry();

    expect(restoreResult.success).toBe(true);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: recoveredRegistry
    });

    const result = adapter.search("JavaScript", {
      language: "sq"
    });

    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(
      result.results.every((entry) => entry.language === "sq")
    ).toBe(true);
  });

  test("respekton domenin dhe kufirin pas rikthimit", async () => {
    const storage = await createStorage();
    const registry = createKnowledgeDatasetRegistry();

    registry.registerDataset("mixed-core", [
      createEntry({ id: "js-1" }),
      createEntry({ id: "js-2" }),
      createEntry({ id: "js-3" }),
      createEntry({
        id: "science-1",
        title: "JavaScript and Science",
        content: "JavaScript is discussed in science.",
        domain: "science"
      })
    ]);

    const persistence = createKnowledgeDatasetPersistence({
      registry,
      storage
    });

    const saveResult = await persistence.saveRegistry();
    expect(saveResult.success).toBe(true);

    const recoveredRegistry = createKnowledgeDatasetRegistry();

    const recoveredPersistence = createKnowledgeDatasetPersistence({
      registry: recoveredRegistry,
      storage
    });

    const restoreResult =
      await recoveredPersistence.restoreRegistry();

    expect(restoreResult.success).toBe(true);

    const adapter = createKnowledgeDatasetSearchAdapter({
      registry: recoveredRegistry
    });

    const result = adapter.search("JavaScript", {
      domain: "programming",
      limit: 2
    });

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results.every(
      (entry) => entry.domain === "programming"
    )).toBe(true);
    expect(result.metadata.matchedCount).toBe(3);
    expect(result.metadata.resultCount).toBe(2);
  });
});
