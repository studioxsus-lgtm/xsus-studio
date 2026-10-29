import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createResponseQualityBenchmarkHistoryStorage,
} from "../../src/core/response-quality-benchmark-history-storage.js";

describe("Response Quality Benchmark History — Transaction Failure Integrity", () => {
  let temporaryDirectories = [];

  async function createTestStorage() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-benchmark-transaction-failure-"),
    );

    temporaryDirectories.push(directory);

    const filePath = join(directory, "benchmark-history.json");

    const storage = createResponseQualityBenchmarkHistoryStorage({
      filePath,
    });

    return { storage, filePath };
  }

  function createEntry(id, sequence = 1) {
    return {
      id,
      timestamp: Date.now(),
      sequence,
      report: {
        summary: {},
        results: [],
      },
    };
  }

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );

    temporaryDirectories = [];
  });

  it("ruan historikun ekzistues kur updater dështon", async () => {
    const { storage } = await createTestStorage();
    const initialHistory = [createEntry("initial")];

    await storage.saveHistory(initialHistory);

    await expect(
      storage.updateHistory(() => {
        throw new Error("updater failed");
      }),
    ).rejects.toThrow("updater failed");

    const restoredHistory = await storage.loadHistory();

    expect(restoredHistory).toEqual(initialHistory);
  });

  it("lejon transaksione të reja pas dështimit të një transaksioni", async () => {
    const { storage } = await createTestStorage();

    const initialEntry = createEntry("initial", 1);
    await storage.saveHistory([initialEntry]);

    await expect(
      storage.updateHistory(() => {
        throw new Error("temporary transaction failure");
      }),
    ).rejects.toThrow("temporary transaction failure");

    const newEntry = createEntry("recovered", 2);

    await storage.updateHistory((history) => [
      ...history,
      newEntry,
    ]);

    const restoredHistory = await storage.loadHistory();

    expect(restoredHistory.map((entry) => entry.id)).toEqual([
      "initial",
      "recovered",
    ]);
  });

  it("refuzon rezultatet e pavlefshme pa ndryshuar historikun", async () => {
    const { storage } = await createTestStorage();
    const initialHistory = [createEntry("initial")];

    await storage.saveHistory(initialHistory);

    await expect(
      storage.updateHistory(() => null),
    ).rejects.toThrow();

    const restoredHistory = await storage.loadHistory();

    expect(restoredHistory).toEqual(initialHistory);
  });

  it("refuzon ID të përsëritura pa korruptuar të dhënat", async () => {
    const { storage } = await createTestStorage();
    const initialEntry = createEntry("initial");

    await storage.saveHistory([initialEntry]);

    await expect(
      storage.updateHistory((history) => [
        ...history,
        createEntry("initial", 2),
      ]),
    ).rejects.toThrow();

    const restoredHistory = await storage.loadHistory();

    expect(restoredHistory).toEqual([initialEntry]);
  });
});
