import { describe, it, expect } from "vitest";

import {
createResponseQualityBenchmarkHistoryEngine,
} from "../../src/core/response-quality-benchmark-history-engine.js";

import {
createResponseQualityBenchmarkHistoryPersistence,
} from "../../src/core/response-quality-benchmark-history-persistence.js";

function createReport(id, timestamp) {
return {
id,
timestamp,
report: {
summary: {
title: "Benchmark ${id}",
score: 90,
},
results: [
{
name: "response-quality",
score: 90,
passed: true,
},
],
},
};
}

function createControlledSharedStorage() {
let history = [];
const pendingWrites = [];

return {
async loadHistory() {
return structuredClone(history);
},

saveHistory(entries) {
  return new Promise((resolve) => {
    pendingWrites.push({
      snapshot: structuredClone(entries),

      commit() {
        history = structuredClone(this.snapshot);
        resolve();
      },
    });
  });
},

getSnapshot() {
  return structuredClone(history);
},

getPendingWriteCount() {
  return pendingWrites.length;
},

commitWrite(index) {
  const write = pendingWrites[index];

  if (!write) {
    throw new Error(`Shkrimi ${index} nuk ekziston.`);
  }

  write.commit();
},

};
}

function createPersistence(storage) {
const engine = createResponseQualityBenchmarkHistoryEngine();

const persistence = createResponseQualityBenchmarkHistoryPersistence({
engine,
storage,
});

return { engine, persistence };
}

async function waitForPendingWrites(storage, expectedCount) {
for (let attempt = 0; attempt < 20; attempt += 1) {
if (storage.getPendingWriteCount() === expectedCount) {
return;
}

await new Promise((resolve) => setTimeout(resolve, 0));

}

expect(storage.getPendingWriteCount()).toBe(expectedCount);
}

describe("Shared-Storage Concurrent Write Conflict Integrity", () => {
it("demonstron se dy instanca kanë radha të pavarura shkrimi", async () => {
const storage = createControlledSharedStorage();

const instanceA = createPersistence(storage);
const instanceB = createPersistence(storage);

await Promise.all([
  instanceA.persistence.initialize(),
  instanceB.persistence.initialize(),
]);

const writeA = instanceA.persistence.addReport(
  createReport("writer-a", 100),
);

const writeB = instanceB.persistence.addReport(
  createReport("writer-b", 200),
);

await waitForPendingWrites(storage, 2);

storage.commitWrite(0);
await writeA;

storage.commitWrite(1);
await writeB;

expect(storage.getSnapshot().map((entry) => entry.id)).toEqual([
  "writer-b",
]);

expect(instanceA.engine.getHistorySize()).toBe(1);
expect(instanceB.engine.getHistorySize()).toBe(1);

});

it("identifikon humbjen e një raporti kur snapshot-i i fundit mbishkruan të parin", async () => {
const storage = createControlledSharedStorage();

const instanceA = createPersistence(storage);
const instanceB = createPersistence(storage);

await Promise.all([
  instanceA.persistence.initialize(),
  instanceB.persistence.initialize(),
]);

const writeA = instanceA.persistence.addReport(
  createReport("first-writer", 100),
);

const writeB = instanceB.persistence.addReport(
  createReport("second-writer", 200),
);

await waitForPendingWrites(storage, 2);

// Shkrimi i parë ruan snapshot-in e vet.
storage.commitWrite(0);
await writeA;

expect(storage.getSnapshot().map((entry) => entry.id)).toEqual([
  "first-writer",
]);

// Shkrimi i dytë mbishkruan snapshot-in e parë.
storage.commitWrite(1);
await writeB;

expect(storage.getSnapshot().map((entry) => entry.id)).toEqual([
  "second-writer",
]);

// Raporti i parë mbetet në RAM-in e instancës A.
expect(
  instanceA.engine.getReportById("first-writer"),
).not.toBeNull();

// Por raporti i parë nuk gjendet më në storage.
expect(
  storage.getSnapshot().some(
    (entry) => entry.id === "first-writer",
  ),
).toBe(false);

});
});
