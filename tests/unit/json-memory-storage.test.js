
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  JSON_MEMORY_STORAGE_VERSION,
  createJSONMemoryStorage,
} from "../../src/core/json-memory-storage.js";

describe("XSUS AI JSON Memory Storage", () => {
  let directory;

  async function createStorage() {
    directory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-memory-test-")
    );

    return createJSONMemoryStorage({
      filePath: path.join(directory, "memory.json"),
    });
  }

  afterEach(async () => {
    if (directory) {
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });

  test("ekspozon versionin", () => {
    expect(JSON_MEMORY_STORAGE_VERSION).toBe("1.0.0");
  });

  test("ruan dhe lexon të dhënat", async () => {
    const storage = await createStorage();

    await storage.set("session-1", {
      language: "sq",
      messages: [{ role: "user", content: "Përshëndetje" }],
    });

    expect(await storage.get("session-1")).toEqual({
      language: "sq",
      messages: [{ role: "user", content: "Përshëndetje" }],
    });
  });

  test("rikthen të dhënat nga një instancë e re", async () => {
    const storage1 = await createStorage();

    await storage1.set("session-1", {
      sessionId: "session-1",
      language: "sq",
    });

    const storage2 = createJSONMemoryStorage({
      filePath: path.join(directory, "memory.json"),
    });

    expect(await storage2.get("session-1")).toEqual({
      sessionId: "session-1",
      language: "sq",
    });
  });

  test("kthen null për çelës që mungon", async () => {
    const storage = await createStorage();

    expect(await storage.get("missing")).toBeNull();
  });

  test("izolon të dhënat nga objekti origjinal", async () => {
    const storage = await createStorage();

    const value = {
      metadata: { language: "sq" },
    };

    await storage.set("session-1", value);
    value.metadata.language = "en";

    expect(await storage.get("session-1")).toEqual({
      metadata: { language: "sq" },
    });
  });

  test("refuzon çelës bosh", async () => {
    const storage = await createStorage();

    await expect(storage.get(" ")).rejects.toThrow(
      "Çelësi i memories"
    );
  });

  test("përditëson hyrjen ekzistuese", async () => {
    const storage = await createStorage();

    await storage.set("session-1", { language: "sq" });
    await storage.set("session-1", { language: "en" });

    expect(await storage.get("session-1")).toEqual({
      language: "en",
    });

    expect((await storage.getStats()).entries).toBe(1);
  });

  test("fshin një hyrje", async () => {
    const storage = await createStorage();

    await storage.set("session-1", { active: true });

    expect(await storage.delete("session-1")).toEqual({
      deleted: true,
      key: "session-1",
    });

    expect(await storage.has("session-1")).toBe(false);
  });

  test("liston çelësat", async () => {
    const storage = await createStorage();

    await storage.set("session-1", {});
    await storage.set("session-2", {});

    expect(await storage.keys()).toEqual([
      "session-1",
      "session-2",
    ]);
  });

  test("pastron të gjitha hyrjet", async () => {
    const storage = await createStorage();

    await storage.set("session-1", {});
    await storage.set("session-2", {});

    expect(await storage.clear()).toEqual({
      cleared: true,
      removedEntries: 2,
    });

    expect(await storage.keys()).toEqual([]);
  });

  test("refuzon JSON të korruptuar", async () => {
    const storage = await createStorage();

    const { writeFile } = await import("node:fs/promises");

    await writeFile(
      path.join(directory, "memory.json"),
      "{ json i pavlefshëm",
      "utf8"
    );

    await expect(storage.keys()).rejects.toThrow(
      "JSON të pavlefshëm"
    );
  });

  test("refuzon strukturë JSON që nuk është objekt", async () => {
    const storage = await createStorage();

    const { writeFile } = await import("node:fs/promises");

    await writeFile(
      path.join(directory, "memory.json"),
      "[]",
      "utf8"
    );

    await expect(storage.keys()).rejects.toThrow(
      "Struktura e skedarit"
    );
  });

  test("përpunon shkrimet e njëpasnjëshme", async () => {
    const storage = await createStorage();

    await Promise.all([
      storage.set("session-1", { value: 1 }),
      storage.set("session-2", { value: 2 }),
      storage.set("session-3", { value: 3 }),
    ]);

    expect(await storage.keys()).toEqual([
      "session-1",
      "session-2",
      "session-3",
    ]);
  });

  test("raporton statistikat", async () => {
    const storage = await createStorage();

    await storage.set("session-1", {});

    const stats = await storage.getStats();

    expect(stats.version).toBe("1.0.0");
    expect(stats.entries).toBe(1);
    expect(stats.adapter).toBe("json-file");
    expect(stats.filePath).toBe(
      path.join(directory, "memory.json")
    );
  });
});
