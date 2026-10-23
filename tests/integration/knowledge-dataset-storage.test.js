import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
createKnowledgeDatasetStorage
} from "../../src/knowledge/knowledge-dataset-storage.js";

describe("XSUS Knowledge Dataset Storage", () => {
let temporaryDirectories = [];

async function createStorage() {
const directory = await mkdtemp(
join(tmpdir(), "xsus-knowledge-storage-")
);

temporaryDirectories.push(directory);

return {
  directory,
  storage: createKnowledgeDatasetStorage({
    filePath: join(directory, "datasets.json")
  })
};

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
temporaryDirectories.map(directory =>
rm(directory, { recursive: true, force: true })
)
);

temporaryDirectories = [];

});

test("ruan dhe rikuperon dataset-et nga JSON", async () => {
const { storage } = await createStorage();

const saved = await storage.saveDatasets([
  {
    id: "sq-general",
    entries: [validEntry()]
  }
]);

expect(saved.success).toBe(true);
expect(saved.datasetCount).toBe(1);

const loaded = await storage.loadDatasets();

expect(loaded.success).toBe(true);
expect(loaded.recovered).toBe(true);
expect(loaded.datasets).toHaveLength(1);
expect(loaded.datasets[0].id).toBe("sq-general");
expect(loaded.datasets[0].entries[0].content)
  .toBe("Përshëndetje! Si mund të të ndihmoj?");

});

test("rikuperon të dhënat me një instancë të re storage", async () => {
const { directory, storage } = await createStorage();

await storage.saveDatasets([
  {
    id: "sq-general",
    entries: [validEntry()]
  }
]);

const restartedStorage = createKnowledgeDatasetStorage({
  filePath: join(directory, "datasets.json")
});

const result = await restartedStorage.loadDatasets();

expect(result.success).toBe(true);
expect(result.datasets).toHaveLength(1);

});

test("refuzon dataset të pavlefshëm pa e zëvendësuar skedarin ekzistues", async () => {
const { storage } = await createStorage();

await storage.saveDatasets([
  {
    id: "sq-general",
    entries: [validEntry()]
  }
]);

const before = await storage.loadDatasets();

const rejected = await storage.saveDatasets([
  {
    id: "bad-dataset",
    entries: [validEntry({ id: "" })]
  }
]);

const after = await storage.loadDatasets();

expect(rejected.success).toBe(false);
expect(after.success).toBe(true);
expect(after.datasets).toEqual(before.datasets);

});

test("refuzon JSON të korruptuar", async () => {
const { directory, storage } = await createStorage();

await writeFile(
  join(directory, "datasets.json"),
  "{ json i pavlefshëm",
  "utf8"
);

const result = await storage.loadDatasets();

expect(result.success).toBe(false);
expect(result.datasets).toBeNull();
expect(result.error).toContain("korruptuar");

});

test("refuzon hyrje të pavlefshme në skedarin JSON", async () => {
const { directory, storage } = await createStorage();

await writeFile(
  join(directory, "datasets.json"),
  JSON.stringify({
    formatVersion: "1.0.0",
    datasets: [{
      id: "sq-general",
      entries: [validEntry({ id: "" })]
    }]
  }),
  "utf8"
);

const result = await storage.loadDatasets();

expect(result.success).toBe(false);
expect(result.datasets).toBeNull();

});

test("refuzon ID të përsëritura në skedarin JSON", async () => {
const { directory, storage } = await createStorage();

await writeFile(
  join(directory, "datasets.json"),
  JSON.stringify({
    formatVersion: "1.0.0",
    datasets: [
      { id: "sq-general", entries: [validEntry()] },
      {
        id: "sq-general",
        entries: [
          validEntry({
            id: "sq-general-002",
            title: "Titull tjetër"
          })
        ]
      }
    ]
  }),
  "utf8"
);

const result = await storage.loadDatasets();

expect(result.success).toBe(false);
expect(result.datasets).toBeNull();
expect(result.error).toContain("ID e përsëritur");

});

test("skedari që mungon kthen dataset bosh", async () => {
const { storage } = await createStorage();

const result = await storage.loadDatasets();

expect(result.success).toBe(true);
expect(result.datasets).toEqual([]);
expect(result.recovered).toBe(false);

});

test("ruan versionin e formatit JSON", async () => {
const { directory, storage } = await createStorage();

await storage.saveDatasets([
  {
    id: "sq-general",
    entries: [validEntry()]
  }
]);

const contents = JSON.parse(
  await readFile(join(directory, "datasets.json"), "utf8")
);

expect(contents.formatVersion).toBe("1.0.0");

});
});
