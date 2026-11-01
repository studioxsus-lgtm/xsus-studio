import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createMemoryPersistence,
  MEMORY_PERSISTENCE_INTEGRATION_VERSION,
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

  function createSessionWithMessage(sessionId, content = "Përshëndetje XSUS AI") {
    createMemorySession(sessionId);

    addMemoryMessage({
      sessionId,
      role: "user",
      content,
      metadata: { language: "sq" },
    });
  }

  function createPersistence(storage, prefix = "xsus:integration:") {
    return createMemoryPersistence({ storage, prefix });
  }

  test("ekspozon versionin dhe API-në e integrimit", () => {
    const persistence = createMemoryPersistence();

    expect(MEMORY_PERSISTENCE_INTEGRATION_VERSION).toBe("1.1.0");
    expect(persistence.version).toBe("1.0.0");

    expect(persistence.saveSession).toBeTypeOf("function");
    expect(persistence.restoreSession).toBeTypeOf("function");
    expect(persistence.deleteSavedSession).toBeTypeOf("function");
    expect(persistence.deleteSessionCompletely).toBeTypeOf("function");
    expect(persistence.hasSavedSession).toBeTypeOf("function");

    expect(Object.isFrozen(persistence)).toBe(true);
  });

  test("pranon storage të personalizuar", async () => {
    const storage = createTestStorage();
    const sessionId = "custom-storage-session";

    createSessionWithMessage(sessionId);

    const persistence = createPersistence(storage);

    const result = await persistence.saveSession(sessionId);

    expect(result.success).toBe(true);
    expect(storage.set).toHaveBeenCalledOnce();
    expect(storage.records.size).toBe(1);
    expect(storage.set).toHaveBeenCalledWith(
      "xsus:integration:custom-storage-session",
      expect.objectContaining({
        sessionId,
        version: "1.0.0",
        snapshot: expect.any(Object),
      }),
    );
  });

  test("refuzon konfigurimin null", () => {
    expect(() => createMemoryPersistence(null)).toThrow(TypeError);
  });

  test("refuzon konfigurimin array", () => {
    expect(() => createMemoryPersistence([])).toThrow(TypeError);
  });

  test("refuzon filePath bosh ose jo tekst", () => {
    expect(() =>
      createMemoryPersistence({ filePath: "   " }),
    ).toThrow(TypeError);

    expect(() =>
      createMemoryPersistence({ filePath: 123 }),
    ).toThrow(TypeError);
  });

  test("refuzon prefix që nuk është tekst", () => {
    expect(() =>
      createMemoryPersistence({ prefix: 123 }),
    ).toThrow(TypeError);
  });

  test("refuzon prefix bosh përmes persistent-memory", () => {
    expect(() =>
      createMemoryPersistence({ prefix: "   " }),
    ).toThrow(TypeError);
  });

  test("refuzon storage null ose jo objekt", () => {
    expect(() =>
      createMemoryPersistence({ storage: null }),
    ).not.toThrow();

    expect(() =>
      createMemoryPersistence({ storage: 123 }),
    ).toThrow(TypeError);
  });

  test("refuzon storage pa metodat e kërkuara", () => {
    expect(() =>
      createMemoryPersistence({ storage: {} }),
    ).toThrow(TypeError);

    expect(() =>
      createMemoryPersistence({
        storage: {
          get: vi.fn(),
          set: vi.fn(),
        },
      }),
    ).toThrow(TypeError);
  });

  test("ruan dhe rikthen një sesion përmes integrimit", async () => {
    const storage = createTestStorage();
    const sessionId = "integration-round-trip-session";
    const persistence = createPersistence(storage);

    createSessionWithMessage(sessionId);

    const saved = await persistence.saveSession(sessionId);

    expect(saved.success).toBe(true);
    expect(await persistence.hasSavedSession(sessionId)).toBe(true);

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
    expect(restoredSession.messages[0].metadata.language).toBe("sq");
  });

  test("rikthen rezultatin SESSION_NOT_FOUND kur backup-i mungon", async () => {
    const storage = createTestStorage();
    const persistence = createPersistence(storage);

    const result = await persistence.restoreSession("missing-session");

    expect(result).toEqual({
      success: false,
      restored: false,
      sessionId: "missing-session",
      reason: "SESSION_NOT_FOUND",
    });
  });

  test("fshirja e backup-it nuk fshin sesionin aktiv", async () => {
    const storage = createTestStorage();
    const sessionId = "integration-delete-session";
    const persistence = createPersistence(storage);

    createSessionWithMessage(sessionId);
    await persistence.saveSession(sessionId);

    const result = await persistence.deleteSavedSession(sessionId);

    expect(result.success).toBe(true);
    expect(storage.records.size).toBe(0);
    expect(getMemorySession(sessionId)).not.toBeNull();
  });

  test("fshin plotësisht backup-in dhe sesionin aktiv", async () => {
    const storage = createTestStorage();
    const sessionId = "integration-complete-delete";
    const persistence = createPersistence(storage);

    createSessionWithMessage(sessionId);
    await persistence.saveSession(sessionId);

    const result = await persistence.deleteSessionCompletely(sessionId);

    expect(result.success).toBe(true);
    expect(storage.records.size).toBe(0);
    expect(getMemorySession(sessionId)).toBeNull();
  });

  test("kontrollon nëse sesioni është ruajtur", async () => {
    const storage = createTestStorage();
    const sessionId = "integration-has-session";
    const persistence = createPersistence(storage);

    createSessionWithMessage(sessionId);

    expect(await persistence.hasSavedSession(sessionId)).toBe(false);

    await persistence.saveSession(sessionId);

    expect(await persistence.hasSavedSession(sessionId)).toBe(true);
  });

  test("izolon sesionet me prefix të ndryshëm", async () => {
    const storage = createTestStorage();
    const firstId = "isolated-session";
    const secondId = "isolated-session";

    createSessionWithMessage(firstId);

    const first = createMemoryPersistence({
      storage,
      prefix: "xsus:first:",
    });

    const second = createMemoryPersistence({
      storage,
      prefix: "xsus:second:",
    });

    await first.saveSession(firstId);

    expect(await first.hasSavedSession(firstId)).toBe(true);
    expect(await second.hasSavedSession(secondId)).toBe(false);

    await second.saveSession(secondId);

    expect(storage.records.size).toBe(2);
    expect(await first.hasSavedSession(firstId)).toBe(true);
    expect(await second.hasSavedSession(secondId)).toBe(true);
  });

  test("përdor prefix-in e personalizuar në të gjitha operacionet", async () => {
    const storage = createTestStorage();
    const sessionId = "prefix-session";

    createSessionWithMessage(sessionId);

    const persistence = createMemoryPersistence({
      storage,
      prefix: "custom:prefix:",
    });

    await persistence.saveSession(sessionId);
    await persistence.hasSavedSession(sessionId);
    await persistence.restoreSession(sessionId);
    await persistence.deleteSavedSession(sessionId);

    expect(storage.set).toHaveBeenCalledWith(
      "custom:prefix:prefix-session",
      expect.any(Object),
    );

    expect(storage.get).toHaveBeenCalledWith(
      "custom:prefix:prefix-session",
    );

    expect(storage.delete).toHaveBeenCalledWith(
      "custom:prefix:prefix-session",
    );
  });

  test("izolon dështimin e storage gjatë ruajtjes", async () => {
    const storage = createTestStorage();
    const sessionId = "save-failure-session";

    createSessionWithMessage(sessionId);

    storage.set.mockRejectedValueOnce(new Error("storage unavailable"));

    const persistence = createPersistence(storage);

    await expect(
      persistence.saveSession(sessionId),
    ).rejects.toMatchObject({
      code: "SESSION_SAVE_FAILED",
    });
  });

  test("izolon dështimin e storage gjatë leximit", async () => {
    const storage = createTestStorage();

    storage.get.mockRejectedValueOnce(new Error("read failure"));

    const persistence = createPersistence(storage);

    await expect(
      persistence.restoreSession("read-failure-session"),
    ).rejects.toMatchObject({
      code: "SESSION_READ_FAILED",
    });
  });

  test("izolon dështimin e storage gjatë kontrollit", async () => {
    const storage = createTestStorage();

    storage.get.mockRejectedValueOnce(new Error("read failure"));

    const persistence = createPersistence(storage);

    await expect(
      persistence.hasSavedSession("has-failure-session"),
    ).rejects.toMatchObject({
      code: "SESSION_READ_FAILED",
    });
  });

  test("izolon dështimin e storage gjatë fshirjes", async () => {
    const storage = createTestStorage();
    const sessionId = "delete-failure-session";

    storage.delete.mockRejectedValueOnce(new Error("delete failure"));

    const persistence = createPersistence(storage);

    await expect(
      persistence.deleteSavedSession(sessionId),
    ).rejects.toMatchObject({
      code: "SESSION_DELETE_FAILED",
    });
  });

  test("dështimi i një operacioni nuk bllokon operacionin pasues", async () => {
    const storage = createTestStorage();
    const sessionId = "queue-recovery-session";

    createSessionWithMessage(sessionId);

    storage.set.mockRejectedValueOnce(new Error("temporary failure"));

    const persistence = createPersistence(storage);

    await expect(
      persistence.saveSession(sessionId),
    ).rejects.toMatchObject({
      code: "SESSION_SAVE_FAILED",
    });

    const saved = await persistence.saveSession(sessionId);

    expect(saved.success).toBe(true);
    expect(await persistence.hasSavedSession(sessionId)).toBe(true);
  });

  test("ruan dhe fshin disa sesione të pavarura", async () => {
    const storage = createTestStorage();
    const firstId = "independent-session-a";
    const secondId = "independent-session-b";

    createSessionWithMessage(firstId, "Mesazhi A");
    createSessionWithMessage(secondId, "Mesazhi B");

    const persistence = createPersistence(storage);

    await Promise.all([
      persistence.saveSession(firstId),
      persistence.saveSession(secondId),
    ]);

    expect(storage.records.size).toBe(2);

    await persistence.deleteSavedSession(firstId);

    expect(await persistence.hasSavedSession(firstId)).toBe(false);
    expect(await persistence.hasSavedSession(secondId)).toBe(true);
  });

  test("refuzon ID të pavlefshme të sesionit", async () => {
    const persistence = createPersistence(createTestStorage());

    await expect(
      persistence.saveSession("   "),
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });

    await expect(
      persistence.restoreSession(""),
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });

    await expect(
      persistence.hasSavedSession("x".repeat(129)),
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });
  });
});
