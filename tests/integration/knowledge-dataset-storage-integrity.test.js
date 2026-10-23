import { afterEach, describe, expect, it } from "vitest";
import {
mkdtemp,
readFile,
rm,
writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
createKnowledgeDatasetStorage
} from "../../src/knowledge/knowledge-dataset-storage.js";

describe("XSUS AI — Knowledge Dataset Storage Integrity", () => {
let temporaryDirectory;
let storage;
let filePath;

afterEach(async () => {
if (temporaryDirectory) {
await rm(temporaryDirectory, {
recursive: true,
force: true
});
temporaryDirectory = undefined;
}

storage = undefined;
filePath = undefined;

});

async function createStorage() {
temporaryDirectory = await mkdtemp(
join(tmpdir(), "xsus-storage-integrity-")
);

filePath = join(
  temporaryDirectory,
  "knowledge-datasets.json"
);

storage = createKnowledgeDatasetStorage({ filePath });

return filePath;

}

function createEntry(overrides = {}) {
return {
id: "integrity-entry-001",
title: "Storage Integrity",
content: "This entry validates persistent knowledge integrity.",
domain: "programming",
topic: "storage integrity",
language: "en",
difficulty: "beginner",
status: "verified",
keywords: ["storage", "integrity"],
tags: ["xsus", "test"],
source: "integrity-test",
version: "1.0.0",
...overrides
};
}

function createSnapshot(datasets) {
return {
formatVersion: "1.0.0",
datasets
};
}

it("ruan dhe rikthen dataset-in me integritet", async () => {
await createStorage();

const saveResult = await storage.saveDatasets([
  {
    id: "integrity-dataset",
    entries: [createEntry()]
  }
]);

expect(saveResult.success).toBe(true);
expect(saveResult.datasetCount).toBe(1);

const loadResult = await storage.loadDatasets();

expect(loadResult.success).toBe(true);
expect(loadResult.datasetCount).toBe(1);
expect(loadResult.datasets[0].id).toBe("integrity-dataset");
expect(loadResult.datasets[0].entries[0].id).toBe(
  "integrity-entry-001"
);
expect(loadResult.datasets[0].entries[0].content).toBe(
  createEntry().content
);

});

it("refuzon JSON të korruptuar", async () => {
await createStorage();

await writeFile(filePath, '{"formatVersion":', "utf8");

const result = await storage.loadDatasets();

expect(result.success).toBe(false);
expect(result.datasets).toBeNull();
expect(result.error).toContain("korruptuar");

});

it("refuzon një format të panjohur", async () => {
await createStorage();

await writeFile(
  filePath,
  JSON.stringify({
    formatVersion: "99.0.0",
    datasets: []
  }),
  "utf8"
);

const result = await storage.loadDatasets();

expect(result.success).toBe(false);
expect(result.datasets).toBeNull();
expect(result.error).toContain("Struktura");

});

it("refuzon ID të përsëritura të dataset-eve", async () => {
await createStorage();

const dataset = {
  id: "duplicate-dataset",
  entries: [createEntry()]
};

await writeFile(
  filePath,
  JSON.stringify(
    createSnapshot([dataset, dataset])
  ),
  "utf8"
);

const result = await storage.loadDatasets();

expect(result.success).toBe(false);
expect(result.datasets).toBeNull();
expect(result.error).toContain("përsëritur");

});

it("refuzon dataset me strukturë hyrjesh të pavlefshme", async () => {
await createStorage();

await writeFile(
  filePath,
  JSON.stringify(
    createSnapshot([
      {
        id: "invalid-entry-dataset",
        entries: [
          {
            id: "",
            title: "",
            content: ""
          }
        ]
      }
    ])
  ),
  "utf8"
);

const result = await storage.loadDatasets();

expect(result.success).toBe(false);
expect(result.datasets).toBeNull();
expect(result.error).toContain("validimin");
expect(result.validationErrors.length).toBeGreaterThan(0);

});

it("refuzon ruajtjen e dataset-eve të pavlefshme", async () => {
await createStorage();

const result = await storage.saveDatasets([
  {
    id: "invalid-save-dataset",
    entries: [
      {
        id: "",
        title: "",
        content: ""
      }
    ]
  }
]);

expect(result.success).toBe(false);

const loadResult = await storage.loadDatasets();

expect(loadResult.success).toBe(true);
expect(loadResult.datasets).toHaveLength(0);

});

it("nuk i ndryshon të dhënat ekzistuese kur ruajtja e re është e pavlefshme", async () => {
await createStorage();

const originalEntry = createEntry();

const firstSave = await storage.saveDatasets([
  {
    id: "preserved-dataset",
    entries: [originalEntry]
  }
]);

expect(firstSave.success).toBe(true);

const originalContents = await readFile(filePath, "utf8");

const failedSave = await storage.saveDatasets([
  {
    id: "invalid-replacement",
    entries: [
      {
        id: "",
        title: "",
        content: ""
      }
    ]
  }
]);

expect(failedSave.success).toBe(false);

const currentContents = await readFile(filePath, "utf8");

expect(currentContents).toBe(originalContents);

const loaded = await storage.loadDatasets();

expect(loaded.success).toBe(true);
expect(loaded.datasets).toHaveLength(1);
expect(loaded.datasets[0].id).toBe("preserved-dataset");

});

it("kthen dataset bosh kur skedari nuk ekziston", async () => {
await createStorage();

const result = await storage.loadDatasets();

expect(result.success).toBe(true);
expect(result.datasets).toEqual([]);
expect(result.datasetCount).toBe(0);
expect(result.recovered).toBe(false);

});

it("serializon ruajtjet paralele pa humbur dataset-e", async () => {
await createStorage();

const count = 6;

const results = await Promise.all(
  Array.from({ length: count }, (_, index) =>
    storage.saveDatasets([
      {
        id: `parallel-storage-${index}`,
        entries: [
          createEntry({
            id: `parallel-entry-${index}`,
            title: `Parallel Storage ${index}`
          })
        ]
      }
    ])
  )
);

expect(results.every((result) => result.success)).toBe(true);

const loaded = await storage.loadDatasets();

expect(loaded.success).toBe(true);
expect(loaded.datasetCount).toBe(1);
expect(loaded.datasets[0].id).toBe(
  `parallel-storage-${count - 1}`
);

});
});
