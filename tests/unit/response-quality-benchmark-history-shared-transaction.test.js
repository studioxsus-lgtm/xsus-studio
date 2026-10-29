import { describe, it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
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
        title: `Benchmark ${id}`,
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

describe("Shared Storage Transactions", () => {
  it("ruan të dy përditësimet kur adapterët ndryshojnë të njëjtin historik", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-shared-transaction-"),
    );

    try {
      const filePath = join(directory, "history.json");

      const storageA =
        createResponseQualityBenchmarkHistoryStorage({ filePath });

      const storageB =
        createResponseQualityBenchmarkHistoryStorage({ filePath });

      await storageA.saveHistory([
        createEntry("initial", 100, 1),
      ]);

      // API-ja updateHistory duhet të lexojë historikun aktual,
      // të zbatojë ndryshimin dhe ta ruajë në mënyrë të koordinuar.
      await Promise.all([
        storageA.updateHistory((history) => [
          ...history,
          createEntry("update-a", 200, 2),
        ]),
        storageB.updateHistory((history) => [
          ...history,
          createEntry("update-b", 300, 3),
        ]),
      ]);

      const restored = await storageA.loadHistory();
      const ids = restored.map((entry) => entry.id).sort();

      expect(ids).toEqual([
        "initial",
        "update-a",
        "update-b",
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("ruan formatin e vlefshëm JSON pas transaksioneve paralele", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-shared-json-"),
    );

    try {
      const filePath = join(directory, "history.json");

      const storageA =
        createResponseQualityBenchmarkHistoryStorage({ filePath });

      const storageB =
        createResponseQualityBenchmarkHistoryStorage({ filePath });

      await Promise.all([
        storageA.updateHistory(() => [
          createEntry("entry-a", 100, 1),
        ]),
        storageB.updateHistory(() => [
          createEntry("entry-b", 200, 1),
        ]),
      ]);

      const restored = await storageA.loadHistory();

      expect(Array.isArray(restored)).toBe(true);
      expect(restored).toHaveLength(1);
      expect(restored[0].report.summary.score).toBe(90);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
