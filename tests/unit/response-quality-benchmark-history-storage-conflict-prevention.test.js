import { describe, it, expect } from "vitest";

import {
mkdtemp,
rm,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import { join } from "node:path";

import {
createResponseQualityBenchmarkHistoryStorage,
} from "../../src/core/response-quality-benchmark-history-storage.js";

function createEntry(id, timestamp, sequence) {
return {
id,
timestamp,
sequence,
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

describe("Storage Conflict Prevention", () => {
it("lejon ruajtjen dhe rikthimin e historikut me dy adapterë për të njëjtin skedar", async () => {
const directory = await mkdtemp(
join(tmpdir(), "xsus-storage-conflict-"),
);

const filePath = join(directory, "history.json");

try {
  const storageA =
    createResponseQualityBenchmarkHistoryStorage({ filePath });

  const storageB =
    createResponseQualityBenchmarkHistoryStorage({ filePath });

  await storageA.saveHistory([
    createEntry("initial", 100, 1),
  ]);

  await storageB.saveHistory([
    createEntry("updated", 200, 1),
  ]);

  const restored = await storageA.loadHistory();

  expect(restored.map((entry) => entry.id)).toEqual([
    "updated",
  ]);
} finally {
  await rm(directory, {
    recursive: true,
    force: true,
  });
}

});

it("ruan vetëm dokumente të vlefshme kur dy adapterë shkruajnë njëkohësisht", async () => {
const directory = await mkdtemp(
join(tmpdir(), "xsus-storage-parallel-"),
);

const filePath = join(directory, "history.json");

try {
  const storageA =
    createResponseQualityBenchmarkHistoryStorage({ filePath });

  const storageB =
    createResponseQualityBenchmarkHistoryStorage({ filePath });

  await Promise.all([
    storageA.saveHistory([
      createEntry("parallel-a", 100, 1),
    ]),
    storageB.saveHistory([
      createEntry("parallel-b", 200, 1),
    ]),
  ]);

  const restored = await storageA.loadHistory();

  expect(restored).toHaveLength(1);
  expect(["parallel-a", "parallel-b"]).toContain(restored[0].id);
  expect(restored[0].report.summary.score).toBe(90);
} finally {
  await rm(directory, {
    recursive: true,
    force: true,
  });
}

});
});
