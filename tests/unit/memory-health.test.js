
import { describe, expect, test } from "vitest";

import {
  createMemoryHealth,
  MEMORY_HEALTH_VERSION,
  HEALTH_STATUS
} from "../../src/core/memory-health.js";

function createTestStorage(overrides = {}) {
  const data = new Map();

  const storage = {
    async get(key) {
      return data.get(key);
    },

    async set(key, value) {
      data.set(key, structuredClone(value));
    },

    async delete(key) {
      data.delete(key);
    },

    async getStats() {
      return {
        entries: data.size
      };
    },

    ...overrides
  };

  return { storage, data };
}

describe("XSUS AI Core — Memory Health", () => {
  test("përdor versionin e pritshëm", () => {
    expect(MEMORY_HEALTH_VERSION).toBe("1.0.0");
  });

  test("kthen gjendje healthy kur storage funksionon", async () => {
    const { storage, data } = createTestStorage();
    const health = createMemoryHealth({ storage });

    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(result.version).toBe("1.0.0");
    expect(result.checks.storageAvailable).toBe(true);
    expect(result.checks.write).toBe(true);
    expect(result.checks.read).toBe(true);
    expect(result.checks.delete).toBe(true);
    expect(result.checks.statistics).toBe(true);
    expect(result.errors).toEqual([]);
    expect(data.size).toBe(0);
  });

  test("raporton gabim kur shkrimi dështon", async () => {
    const { storage } = createTestStorage({
      async set() {
        throw new Error("Disku nuk është i disponueshëm.");
      }
    });

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

  test("raporton gabim kur leximi dështon", async () => {
    const { storage } = createTestStorage({
      async get() {
        throw new Error("Gabim gjatë leximit.");
      }
    });

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

  test("zbulon mospërputhjen e të dhënave", async () => {
    const { storage } = createTestStorage({
      async get() {
        return { token: "vlerë-e-gabuar" };
      }
    });

    const health = createMemoryHealth({ storage });
    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.UNHEALTHY);
    expect(result.checks.read).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "MEMORY_READ_INTEGRITY_FAILED"
      })
    );
  });

  test("raporton gabim kur fshirja dështon", async () => {
    const { storage } = createTestStorage({
      async delete() {
        throw new Error("Fshirja dështoi.");
      }
    });

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

  test("vazhdon diagnostikimin kur statistikat dështojnë", async () => {
    const { storage } = createTestStorage({
      async getStats() {
        throw new Error("Statistikat nuk mund të lexohen.");
      }
    });

    const health = createMemoryHealth({ storage });
    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(result.checks.write).toBe(true);
    expect(result.checks.read).toBe(true);
    expect(result.checks.delete).toBe(true);
    expect(result.checks.statistics).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "MEMORY_STATS_FAILED"
      })
    );
  });

  test("mbështet storage pa metodën getStats", async () => {
    const { storage } = createTestStorage();
    delete storage.getStats;

    const health = createMemoryHealth({ storage });
    const result = await health.checkMemoryHealth();

    expect(result.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(result.checks.statistics).toBeNull();
    expect(result.stats).toBeNull();
  });

  test("refuzon konfigurimin e pavlefshëm", () => {
    expect(() => createMemoryHealth()).toThrow(TypeError);
    expect(() => createMemoryHealth({ storage: {} })).toThrow(TypeError);
  });

  test("kthen kohën e kontrollit në format ISO", async () => {
    const { storage } = createTestStorage();
    const health = createMemoryHealth({ storage });

    const result = await health.checkMemoryHealth();

    expect(Number.isNaN(Date.parse(result.checkedAt))).toBe(false);
  });
});
