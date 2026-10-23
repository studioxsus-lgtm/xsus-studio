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

describe("XSUS Knowledge Dataset Persistence", () => {
let directories = [];

async function createEnvironment() {
const directory = await mkdtemp(
join(tmpdir(), "xsus-dataset-persistence-")
);

directories.push(directory);

const registry = createKnowledgeDatasetRegistry();

const storage = createKnowledgeDatasetStorage({
  filePath: join(directory, "datasets.json")
});

const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage
});

return { registry, storage, persistence };

}

const validEntry = (overrides = {}) => ({
id: "sq-general-001",
title: "Përshëndetje",
content: "Përshëndetje! Si mund të të ndihmoj?",
domain: "general",
language: "sq",
...overrides
});

afterEach(async () => {
await Promise.all(
directories.map(directory =>
rm(directory, { recursive: true, force: true })
)
);

directories = [];

});

test("ruan të gjitha dataset-et e regjistruara", async () => {
const { registry, persistence } = await createEnvironment();

registry.registerDataset("sq-general", [validEntry()]);
registry.registerDataset("en-general", [
  validEntry({
    id: "en-general-001",
    title: "Greeting",
    content: "Hello!",
    language: "en"
  })
]);

const result = await persistence.saveRegistry();

expect(result.success).toBe(true);
expect(result.datasetCount).toBe(2);

});

test("rikuperon dataset-et në një regjistër të ri", async () => {
const first = await createEnvironment();

first.registry.registerDataset("sq-general", [validEntry()]);
first.registry.registerDataset("en-general", [
  validEntry({
    id: "en-general-001",
    title: "Greeting",
    content: "Hello!",
    language: "en"
  })
]);

const saved = await first.persistence.saveRegistry();
expect(saved.success).toBe(true);

const secondRegistry = createKnowledgeDatasetRegistry();
const secondPersistence = createKnowledgeDatasetPersistence({
  registry: secondRegistry,
  storage: first.storage
});

const restored = await secondPersistence.restoreRegistry();

expect(restored.success).toBe(true);
expect(restored.restored).toBe(true);
expect(restored.datasetCount).toBe(2);
expect(secondRegistry.getDataset("sq-general")).not.toBeNull();
expect(secondRegistry.getDataset("en-general")).not.toBeNull();

});

test("refuzon rikuperimin në një regjistër që nuk është bosh", async () => {
const { registry, persistence } = await createEnvironment();

registry.registerDataset("sq-general", [validEntry()]);

const result = await persistence.restoreRegistry();

expect(result.success).toBe(false);
expect(result.restored).toBe(false);
expect(registry.listDatasets()).toHaveLength(1);

});

test("nuk rikuperon dataset-e kur storage raporton dështim", async () => {
const registry = createKnowledgeDatasetRegistry();

const storage = {
  async saveDatasets() {
    return { success: false, error: "Gabim ruajtjeje" };
  },
  async loadDatasets() {
    return {
      success: false,
      error: "Gabim rikuperimi"
    };
  }
};

const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage
});

const result = await persistence.restoreRegistry();

expect(result.success).toBe(false);
expect(registry.listDatasets()).toHaveLength(0);

});

test("dështimi i ruajtjes nuk raportohet si sukses", async () => {
const registry = createKnowledgeDatasetRegistry();

registry.registerDataset("sq-general", [validEntry()]);

const storage = {
  async saveDatasets() {
    return { success: false, error: "Disku nuk është i disponueshëm" };
  },
  async loadDatasets() {
    return { success: true, datasets: [] };
  }
};

const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage
});

const result = await persistence.saveRegistry();

expect(result.success).toBe(false);
expect(result.error).toContain("Disku");

});

test("regjistri i rikuperuar ruan integritetin e hyrjeve", async () => {
const first = await createEnvironment();

first.registry.registerDataset("sq-general", [validEntry()]);

const saved = await first.persistence.saveRegistry();
expect(saved.success).toBe(true);

const registry = createKnowledgeDatasetRegistry();
const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage: first.storage
});

const restored = await persistence.restoreRegistry();
const dataset = registry.getDataset("sq-general");

expect(restored.success).toBe(true);
expect(Object.isFrozen(dataset)).toBe(true);
expect(Object.isFrozen(dataset.collection)).toBe(true);
expect(Object.isFrozen(dataset.collection[0])).toBe(true);

});
});
