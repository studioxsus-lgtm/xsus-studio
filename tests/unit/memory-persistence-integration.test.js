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
  afterEach(async () => {
    await clearAllMemory();
    vi.restoreAllMocks();
  });

  function createTestStorage() {
    const records = new Map();

    return {
      records,

      get: vi.fn(async (key) => {
        const value = records.get(key);
        return value === undefined ? null : structuredClone(value);
      }),

      set: vi.fn(async (key, value) => {
        records.set(key, structuredClone(value));
      }),

      delete: vi.fn(async (key) => {
        records.delete(key);
      }),
    };
  }

  test("krijon integrimin me konfigurimin e parazgjedhur", () => {
    const persistence = createMemoryPersistence();

    expect(persistence).toBeDefined();
    expect(persistence.saveSession).toBeTypeOf("function");
    expect(persistence.restoreSession).toBeTypeOf("function");
    expect(persistence.deleteSession).toBeTypeOf("function");
  });

  test("pranon storage të personalizuar", async () => {
    const storage = createTestStorage();

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus:integration:",
    });

    expect(persistence).toBeDefined();

    await persistence.saveSession("custom-storage-session");

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

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus:round-trip:",
    });

    const sessionId = "integration-round-trip-session";

    createMemorySession(sessionId);

    addMemoryMessage(sessionId, {
      role: "user",
      content: "Përshëndetje XSUS AI",
      metadata: { language: "sq" },
    });

    const saved = await persistence.saveSession(sessionId);

    expect(saved.success).toBe(true);
    expect(storage.records.size).toBe(1);

    await clearAllMemory();

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

    const persistence = createMemoryPersistence({
      storage,
      prefix: "xsus:delete-integration:",
    });

    const sessionId = "integration-delete-session";

    createMemorySession(sessionId);

    addMemoryMessage(sessionId, {
      role: "user",
      content: "Mesazh për fshirje",
    });

    await persistence.saveSession(sessionId);

    expect(storage.records.size).toBe(1);

    const result = await persistence.deleteSession(sessionId);

    expect(result.success).toBe(true);
    expect(storage.records.size).toBe(0);
  });
});
