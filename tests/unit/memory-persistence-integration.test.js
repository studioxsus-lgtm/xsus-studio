import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createMemoryPersistence,
} from "../../src/core/memory-persistence-integration.js";

import {
  createMemorySession,
  addMemoryMessage,
  getMemorySession,
  clearAllMemory,
} from "../../src/core/memory-engine.js";

describe("XSUS AI Core — Memory Persistence Integration", () => {
  afterEach(() => {
    clearAllMemory();
    vi.restoreAllMocks();
  });

  function createTestStorage() {
    const records = new Map();

    return {
      records,

      get: vi.fn(async (key) => {
        const value = records.get(key);

        return value === undefined
          ? null
          : structuredClone(value);
      }),

      set: vi.fn(async (key, value) => {
        records.set(key, structuredClone(value));
      }),

      delete: vi.fn(async (key) => {
        records.delete(key);
      }),
    };
  }

  function createSessionWithMessage(sessionId) {
    createMemorySession(sessionId);

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Përshëndetje XSUS AI",
      metadata: { language: "sq" },
    });
  }

  test("krijon integrimin me konfigurimin e parazgjedhur", () => {
    const persistence = createMemoryPersistence();

    expect(persistence).toBeDefined();
    expect(persistence.saveSession).toBeTypeOf("function");
    expect(persistence.restoreSession).toBeTypeOf("function");
    expect(persistence.deleteSavedSession).toBeTypeOf("function");
    expect(persistence.deleteSessionCompletely).toBeTypeOf("function");
    expect(persistence.hasSavedSession).toBeTypeOf("function");
  });

  test("pranon storage të personalizuar", async () => {
    const storage = createTestStorage();
    const sessionId = "custom-storage-session";

    createSessionWithMessage(sessionId);

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus:integration:",
    });

    const result = await persistence.saveSession(sessionId);

    expect(result.success).toBe(true);
    expect(storage.set).toHaveBeenCalledOnce();
    expect(storage.records.size).toBe(1);
  });

  test("refuzon konfigurimin null", () => {
    expect(() => createMemoryPersistence(null)).toThrow();
  });

  test("refuzon filePath bosh", () => {
    expect(() =>
      createMemoryPersistence({ filePath: "   " }),
    ).toThrow();
  });

  test("refuzon prefix që nuk është tekst", () => {
    expect(() =>
      createMemoryPersistence({ prefix: 123 }),
    ).toThrow();
  });

  test("refuzon storage që nuk ka metodat e kërkuara", () => {
    expect(() =>
      createMemoryPersistence({
        storage: {},
      }),
    ).toThrow();
  });

  test("ruan dhe rikthen një sesion përmes integrimit", async () => {
    const storage = createTestStorage();
    const sessionId = "integration-round-trip-session";

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus:round-trip:",
    });

    createSessionWithMessage(sessionId);

    const saved = await persistence.saveSession(sessionId);

    expect(saved.success).toBe(true);
    expect(storage.records.size).toBe(1);

    clearAllMemory();

    expect(getMemorySession(sessionId)).toBeNull();

    const restored = await persistence.restoreSession(sessionId);

    expect(restored.success).toBe(true);
    expect(restored.restored).toBe(true);

    const restoredSession = getMemorySession(sessionId);

    expect(restoredSession).not.toBeNull();
    expect(restoredSession.messages).toHaveLength(1);
    expect(restoredSession.messages[0].content)
      .toBe("Përshëndetje XSUS AI");
    expect(restoredSession.messages[0].metadata.language)
      .toBe("sq");
  });

  test("fshin regjistrimin e ruajtur përmes integrimit", async () => {
    const storage = createTestStorage();
    const sessionId = "integration-delete-session";

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus:delete-integration:",
    });

    createSessionWithMessage(sessionId);

    await persistence.saveSession(sessionId);

    expect(storage.records.size).toBe(1);

    const result = await persistence.deleteSavedSession(sessionId);

    expect(result.success).toBe(true);
    expect(storage.records.size).toBe(0);

    // Fshirja vetëm e regjistrimit të ruajtur
    // nuk duhet të fshijë sesionin aktiv.
    expect(getMemorySession(sessionId)).not.toBeNull();
  });

  test("kontrollon nëse sesioni është ruajtur", async () => {
    const storage = createTestStorage();
    const sessionId = "integration-has-session";

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus:has-integration:",
    });

    createSessionWithMessage(sessionId);

    expect(await persistence.hasSavedSession(sessionId)).toBe(false);

    await persistence.saveSession(sessionId);

    expect(await persistence.hasSavedSession(sessionId)).toBe(true);
  });
});
