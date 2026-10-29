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

function createReport(id, timestamp, sequence) {
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

describe("JSON Storage Concurrency Integrity", () => {
it("ruan një dokument JSON të vlefshëm gjatë shkrimeve të njëkohshme", async () => {
const directory = await mkdtemp(
join(tmpdir(), "xsus-benchmark-concurrency-"),
);

const filePath = join(directory, "benchmark-history.json");

try {
  const storage =
    createResponseQualityBenchmarkHistoryStorage({ filePath });

  const snapshotA = [
    createReport("writer-a", 100, 1),
  ];

  const snapshotB = [
    createReport("writer-b", 200, 1),
  ];

  const results = await Promise.all([
    storage.saveHistory(snapshotA),
    storage.saveHistory(snapshotB),
  ]);

  expect(results).toHaveLength(2);

  expect(results[0].savedCount).toBe(1);
  expect(results[1].savedCount).toBe(1);

  const restored = await storage.loadHistory();

  expect(Array.isArray(restored)).toBe(true);
  expect(restored).toHaveLength(1);

  expect(
    ["writer-a", "writer-b"],
  ).toContain(restored[0].id);

  expect(restored[0].report.summary.score).toBe(90);
  expect(restored[0].report.results).toHaveLength(1);
} finally {
  await rm(directory, {
    recursive: true,
    force: true,
  });
}

});

it("ruan integritetin e të dhënave pas shkrimeve të njëpasnjëshme", async () => {
const directory = await mkdtemp(
join(tmpdir(), "xsus-benchmark-sequential-"),
);

const filePath = join(directory, "benchmark-history.json");

try {
  const storage =
    createResponseQualityBenchmarkHistoryStorage({ filePath });

  await storage.saveHistory([
    createReport("first", 100, 1),
  ]);

  await storage.saveHistory([
    createReport("second", 200, 1),
    createReport("third", 300, 2),
  ]);

  const restored = await storage.loadHistory();

  expect(restored.map((entry) => entry.id)).toEqual([
    "second",
    "third",
  ]);

  expect(restored.map((entry) => entry.sequence)).toEqual([
    1,
    2,
  ]);
} finally {
  await rm(directory, {
    recursive: true,
    force: true,
  });
}

});
});
