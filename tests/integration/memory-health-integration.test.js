
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createJSONMemoryStorage
} from "../../src/core/json-memory-storage.js";

import {
  createMemoryHealth,
  MEMORY_HEALTH_VERSION,
  HEALTH_STATUS
} from "../../src/core/memory-health.js";

describe("XSUS AI Core — Memory Health Integration", () => {
  let temporaryDirectories = [];

  async function createTemporaryDirectory() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-memory-health-")
    );

    temporaryDirectories.push(directory);

    return directory;
  }

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map(directory =>
        rm(directory, {
          recursive: true,
          force: true
        })
      )
    );

    temporaryDirectories = [];
  });

  test("përdor versionin e pritshëm", () => {
    expect(MEMORY_HEALTH_VERSION).toBe("1.0.0");
  });

  test("kontrollon storage JSON real me sukses", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const storage = createJSONMemoryStorage({ filePath });
    const health = createMemoryHealth({ storage });

    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(result.checks.storageAvailable).toBe(true);
    expect(result.checks.write).toBe(true);
    expect(result.checks.read).toBe(true);
    expect(result.checks.delete).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("pas kontrollit nuk lë sesionin provë në storage", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const storage = createJSONMemoryStorage({ filePath });
    const health = createMemoryHealth({ storage });

    const result = await health.checkMemoryHealth();
    const stats = await storage.getStats();

    expect(result.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(stats.entries).toBe(0);
  });

  test("ruan të dhënat ekzistuese gjatë kontrollit", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const storage = createJSONMemoryStorage({ filePath });

    const existingSession = {
      id: "session-existing",
      messages: [
        {
          role: "user",
          content: "Përshëndetje XSUS AI"
        }
      ]
    };

    await storage.set("session-existing", existingSession);

    const health = createMemoryHealth({ storage });
    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.HEALTHY);

    await expect(
      storage.get("session-existing")
    ).resolves.toEqual(existingSession);

    const stats = await storage.getStats();
    expect(stats.entries).toBe(1);
  });

  test("raporton gabimin kur storage nuk mund të shkruajë", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const baseStorage = createJSONMemoryStorage({ filePath });

    const storage = {
      get: key => baseStorage.get(key),

      set: async () => {
        throw new Error("Shkrimi u refuzua nga testi.");
      },

      delete: key => baseStorage.delete(key),

      getStats: () => baseStorage.getStats()
    };

    const health = createMemoryHealth({ storage });
    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.UNHEALTHY);
    expect(result.checks.write).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "MEMORY_WRITE_FAILED"
      })
    );
  });

  test("raporton gabimin kur storage nuk mund të lexojë", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const baseStorage = createJSONMemoryStorage({ filePath });

    const storage = {
      get: async () => {
        throw new Error("Leximi u refuzua nga testi.");
      },

      set: (key, value) => baseStorage.set(key, value),
      delete: key => baseStorage.delete(key),
      getStats: () => baseStorage.getStats()
    };

    const health = createMemoryHealth({ storage });
    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.UNHEALTHY);
    expect(result.checks.write).toBe(true);
    expect(result.checks.read).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "MEMORY_READ_FAILED"
      })
    );
  });

  test("raporton gabimin kur fshirja dështon", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const baseStorage = createJSONMemoryStorage({ filePath });

    const storage = {
      get: key => baseStorage.get(key),
      set: (key, value) => baseStorage.set(key, value),

      delete: async () => {
        throw new Error("Fshirja u refuzua nga testi.");
      },

      getStats: () => baseStorage.getStats()
    };

    const health = createMemoryHealth({ storage });
    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.UNHEALTHY);
    expect(result.checks.delete).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "MEMORY_DELETE_FAILED"
      })
    );
  });

  test("kthen statistikë dhe kohë kontrolli", async () => {
    const directory = await createTemporaryDirectory();
    const filePath = join(directory, "memory.json");

    const storage = createJSONMemoryStorage({ filePath });
    await storage.set("existing-session", { active: true });

    const health = createMemoryHealth({ storage });
    const result = await health.checkMemoryHealth();

    expect(result.checks.statistics).toBe(true);
    expect(result.stats).toBeTruthy();
    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
    expect(result.status).toBe(HEALTH_STATUS.HEALTHY);
  });
});
