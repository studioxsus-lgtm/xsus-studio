import { describe, expect, test, vi } from "vitest";

import {
  createPersistentMemory,
  PERSISTENT_MEMORY_VERSION,
} from "../../src/core/persistent-memory.js";

function createStorageMock() {
  const records = new Map();

  return {
    records,
    get: vi.fn(async (key) => records.get(key) ?? null),
    set: vi.fn(async (key, value) => {
      records.set(key, structuredClone(value));
    }),
    delete: vi.fn(async (key) => {
      records.delete(key);
    }),
  };
}

function createMemory(storage, overrides = {}) {
  return createPersistentMemory({
    storage,
    exportSession: vi.fn(async (sessionId) => ({
      id: sessionId,
      messages: [],
    })),
    importSession: vi.fn(async () => {}),
    ...overrides,
  });
}

describe("Persistent Memory", () => {
  test("ka versionin e pritshëm", () => {
    expect(PERSISTENT_MEMORY_VERSION).toBe("1.0.0");
  });

  test("kërkon storage të vlefshëm", () => {
    expect(() => createPersistentMemory()).toThrow(
      "Storage duhet të ofrojë funksionet get, set dhe delete."
    );
  });

  test("kërkon exportSession si funksion", () => {
    expect(() =>
      createPersistentMemory({
        storage: createStorageMock(),
        importSession: vi.fn(),
      })
    ).toThrow("exportSession duhet të jetë funksion.");
  });

  test("kërkon importSession si funksion", () => {
    expect(() =>
      createPersistentMemory({
        storage: createStorageMock(),
        exportSession: vi.fn(),
      })
    ).toThrow("importSession duhet të jetë funksion.");
  });

  test("ruan snapshot-in e sesionit", async () => {
    const storage = createStorageMock();

    const exportSession = vi.fn(async (sessionId) => ({
      id: sessionId,
      messages: [
        { role: "user", content: "Përshëndetje" },
      ],
      metadata: { language: "sq" },
    }));

    const memory = createMemory(storage, { exportSession });

    const result = await memory.saveSession("session-1");

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe("session-1");
    expect(result.version).toBe(PERSISTENT_MEMORY_VERSION);
    expect(storage.set).toHaveBeenCalledOnce();

    const savedRecord = storage.records.get(
      "xsus:memory:session:session-1"
    );

    expect(savedRecord.version).toBe(PERSISTENT_MEMORY_VERSION);
    expect(savedRecord.snapshot.messages).toHaveLength(1);
    expect(savedRecord.snapshot.metadata.language).toBe("sq");
    expect(typeof savedRecord.savedAt).toBe("string");
  });

  test("rikthen snapshot-in në memory-engine", async () => {
    const storage = createStorageMock();

    storage.records.set("xsus:memory:session:session-2", {
      version: PERSISTENT_MEMORY_VERSION,
      sessionId: "session-2",
      savedAt: "2026-01-01T00:00:00.000Z",
      snapshot: {
        id: "session-2",
        messages: [
          { role: "user", content: "Përshëndetje" },
        ],
      },
    });

    const importSession = vi.fn(async () => {});
    const memory = createMemory(storage, { importSession });

    const result = await memory.restoreSession("session-2");

    expect(result.success).toBe(true);
    expect(result.restored).toBe(true);

    expect(importSession).toHaveBeenCalledWith(
      "session-2",
      {
        id: "session-2",
        messages: [
          { role: "user", content: "Përshëndetje" },
        ],
      }
    );
  });

  test("raporton kur sesioni nuk ekziston", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);

    const result = await memory.restoreSession("missing-session");

    expect(result).toEqual({
      success: false,
      restored: false,
      sessionId: "missing-session",
      reason: "SESSION_NOT_FOUND",
    });
  });

  test("fshin sesionin e ruajtur", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);

    storage.records.set("xsus:memory:session:session-3", {
      sessionId: "session-3",
      snapshot: {},
    });

    const result = await memory.deleteSavedSession("session-3");

    expect(result.success).toBe(true);
    expect(
      storage.records.has("xsus:memory:session:session-3")
    ).toBe(false);
  });

  test("kontrollon nëse sesioni është ruajtur", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);

    expect(await memory.hasSavedSession("session-4")).toBe(false);

    storage.records.set("xsus:memory:session:session-4", {
      sessionId: "session-4",
      snapshot: {},
    });

    expect(await memory.hasSavedSession("session-4")).toBe(true);
  });

  test("refuzon ID të pavlefshme", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);

    await expect(
      memory.saveSession("   ")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });
  });

  test("refuzon ID që tejkalon kufirin", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);

    await expect(
      memory.saveSession("s".repeat(129))
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });
  });

  test("izolon gabimet gjatë eksportimit", async () => {
    const storage = createStorageMock();

    const memory = createMemory(storage, {
      exportSession: vi.fn(async () => {
        throw new Error("Export error");
      }),
    });

    await expect(
      memory.saveSession("session-export-error")
    ).rejects.toMatchObject({
      code: "SESSION_EXPORT_FAILED",
    });

    expect(storage.set).not.toHaveBeenCalled();
  });

  test("refuzon snapshot-in që nuk është objekt", async () => {
    const storage = createStorageMock();

    const memory = createMemory(storage, {
      exportSession: vi.fn(async () => null),
    });

    await expect(
      memory.saveSession("session-invalid-snapshot")
    ).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });

  test("izolon gabimet gjatë ruajtjes", async () => {
    const storage = createStorageMock();

    storage.set.mockRejectedValue(new Error("Disk error"));

    const memory = createMemory(storage);

    await expect(
      memory.saveSession("session-save-error")
    ).rejects.toMatchObject({
      code: "SESSION_SAVE_FAILED",
    });
  });

  test("izolon gabimet gjatë leximit", async () => {
    const storage = createStorageMock();

    storage.get.mockRejectedValue(new Error("Read error"));

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-read-error")
    ).rejects.toMatchObject({
      code: "SESSION_READ_FAILED",
    });
  });

  test("refuzon regjistrimin me sessionId të papërputhshëm", async () => {
    const storage = createStorageMock();

    storage.records.set("xsus:memory:session:session-expected", {
      version: PERSISTENT_MEMORY_VERSION,
      sessionId: "session-different",
      snapshot: {
        id: "session-expected",
        messages: [],
      },
    });

    const importSession = vi.fn();
    const memory = createMemory(storage, { importSession });

    await expect(
      memory.restoreSession("session-expected")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });

    expect(importSession).not.toHaveBeenCalled();
  });

  test("refuzon regjistrimin pa snapshot", async () => {
    const storage = createStorageMock();

    storage.records.set("xsus:memory:session:session-no-snapshot", {
      version: PERSISTENT_MEMORY_VERSION,
      sessionId: "session-no-snapshot",
    });

    const importSession = vi.fn();
    const memory = createMemory(storage, { importSession });

    await expect(
      memory.restoreSession("session-no-snapshot")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });

    expect(importSession).not.toHaveBeenCalled();
  });

  test("izolon gabimet gjatë rikthimit", async () => {
    const storage = createStorageMock();

    storage.records.set("xsus:memory:session:session-restore-error", {
      version: PERSISTENT_MEMORY_VERSION,
      sessionId: "session-restore-error",
      snapshot: {
        id: "session-restore-error",
        messages: [],
      },
    });

    const memory = createMemory(storage, {
      importSession: vi.fn(async () => {
        throw new Error("Restore error");
      }),
    });

    await expect(
      memory.restoreSession("session-restore-error")
    ).rejects.toMatchObject({
      code: "SESSION_RESTORE_FAILED",
    });
  });

  test("izolon gabimet gjatë fshirjes", async () => {
    const storage = createStorageMock();

    storage.delete.mockRejectedValue(new Error("Delete error"));

    const memory = createMemory(storage);

    await expect(
      memory.deleteSavedSession("session-delete-error")
    ).rejects.toMatchObject({
      code: "SESSION_DELETE_FAILED",
    });
  });

  test("raporton dështimin e fshirjes së sesionit aktiv", async () => {
    const storage = createStorageMock();

    storage.records.set("xsus:memory:session:session-active-error", {
      version: PERSISTENT_MEMORY_VERSION,
      sessionId: "session-active-error",
      snapshot: {},
    });

    const memory = createMemory(storage, {
      deleteSession: vi.fn(async () => {
        throw new Error("Active session error");
      }),
    });

    await expect(
      memory.deleteSessionCompletely("session-active-error")
    ).rejects.toMatchObject({
      code: "ACTIVE_SESSION_DELETE_FAILED",
    });

    expect(
      storage.records.has("xsus:memory:session:session-active-error")
    ).toBe(false);
  });

  test("raporton nëse kontrolli i ekzistencës dështon", async () => {
    const storage = createStorageMock();

    storage.get.mockRejectedValue(new Error("Read error"));

    const memory = createMemory(storage);

    await expect(
      memory.hasSavedSession("session-has-error")
    ).rejects.toMatchObject({
      code: "SESSION_READ_FAILED",
    });
  });
});
