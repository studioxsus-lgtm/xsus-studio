import { describe, expect, it, vi } from "vitest";

import {
createKnowledgeDatasetPersistence
} from "../../src/knowledge/knowledge-dataset-persistence.js";

import {
createKnowledgeDatasetRegistry
} from "../../src/knowledge/knowledge-dataset-registry.js";

describe("XSUS AI — Knowledge Dataset Persistence Failure Recovery", () => {
function createEntry(overrides = {}) {
return {
id: "failure-entry-001",
title: "Persistence Failure Fixture",
content: "Fixture for persistence failure recovery tests.",
domain: "programming",
topic: "persistence",
language: "en",
difficulty: "beginner",
status: "verified",
keywords: ["persistence", "failure"],
tags: ["integration"],
source: "persistence-failure-test",
version: "1.0.0",
...overrides
};
}

function createStorage(overrides = {}) {
return {
saveDatasets: vi.fn(async () => ({
success: true
})),
loadDatasets: vi.fn(async () => ({
success: true,
datasets: []
})),
...overrides
};
}

it("raporton dështimin e ruajtjes pa e fshehur gabimin", async () => {
const registry = createKnowledgeDatasetRegistry();

registry.registerDataset(
  "failure-save-dataset",
  [createEntry()]
);

const storage = createStorage({
  saveDatasets: vi.fn(async () => ({
    success: false,
    error: "Dështim i simuluar i ruajtjes."
  }))
});

const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage
});

const result = await persistence.saveRegistry();

expect(result.success).toBe(false);
expect(result.error).toContain(
  "Dështim i simuluar i ruajtjes."
);
expect(storage.saveDatasets).toHaveBeenCalledTimes(1);

});

it("refuzon rikuperimin kur ngarkimi i storage-it dështon", async () => {
const registry = createKnowledgeDatasetRegistry();

const storage = createStorage({
  loadDatasets: vi.fn(async () => ({
    success: false,
    error: "Skedari nuk mund të lexohet."
  }))
});

const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage
});

const result = await persistence.restoreRegistry();

expect(result.success).toBe(false);
expect(result.restored).toBe(false);
expect(result.error).toContain(
  "Skedari nuk mund të lexohet."
);
expect(registry.listDatasets()).toHaveLength(0);

});

it("nuk rikthen pjesërisht dataset-et kur një dataset është i pavlefshëm", async () => {
const registry = createKnowledgeDatasetRegistry();

const storage = createStorage({
  loadDatasets: vi.fn(async () => ({
    success: true,
    datasets: [
      {
        id: "valid-staged-dataset",
        entries: [
          createEntry({
            id: "valid-staged-entry"
          })
        ]
      },
      {
        id: "invalid-staged-dataset",
        entries: [
          {
            id: "",
            title: "",
            content: ""
          }
        ]
      }
    ]
  }))
});

const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage
});

const result = await persistence.restoreRegistry();

expect(result.success).toBe(false);
expect(result.restored).toBe(false);
expect(registry.listDatasets()).toHaveLength(0);

});

it("refuzon rikuperimin në një regjistër jo bosh", async () => {
const registry = createKnowledgeDatasetRegistry();

registry.registerDataset(
  "existing-dataset",
  [createEntry()]
);

const storage = createStorage();

const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage
});

const result = await persistence.restoreRegistry();

expect(result.success).toBe(false);
expect(result.restored).toBe(false);
expect(storage.loadDatasets).not.toHaveBeenCalled();
expect(registry.listDatasets()).toHaveLength(1);

});

it("rikthen të gjitha dataset-et e vlefshme", async () => {
const registry = createKnowledgeDatasetRegistry();

const storage = createStorage({
  loadDatasets: vi.fn(async () => ({
    success: true,
    datasets: [
      {
        id: "recovery-dataset-one",
        entries: [
          createEntry({
            id: "recovery-entry-one"
          })
        ]
      },
      {
        id: "recovery-dataset-two",
        entries: [
          createEntry({
            id: "recovery-entry-two",
            title: "Second Recovery Fixture"
          })
        ]
      }
    ]
  }))
});

const persistence = createKnowledgeDatasetPersistence({
  registry,
  storage
});

const result = await persistence.restoreRegistry();

expect(result.success).toBe(true);
expect(result.restored).toBe(true);
expect(result.datasetCount).toBe(2);
expect(registry.listDatasets()).toHaveLength(2);

});
});
