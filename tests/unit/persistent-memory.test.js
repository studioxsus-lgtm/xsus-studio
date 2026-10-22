import { describe, expect, test, vi } from "vitest";

import {
  createPersistentMemory,
  PERSISTENT_MEMORY_VERSION
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
    })
  };
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

  test("ruan snapshot-in e sesionit", async () => {
    const storage = createStorageMock();

    const exportSession = vi.fn(async (sessionId) => ({
      id: sessionId,
      messages: [
        { role: "user", content: "Përshëndetje" }
      ],
      metadata: { language: "sq" }
    }));

    const memory = createPersistentMemory({
      storage,
      exportSession,
      importSession: vi.fn()
    });

    const result = await memory.saveSession("session-1");

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe("session-1");
    expect(storage.set).toHaveBeenCalledOnce();

    const savedRecord = storage.records.get(
      "xsus:memory:session:session-1"
    );

    expect(savedRecord.snapshot.messages).toHaveLength(1);
    expect(savedRecord.snapshot.metadata.language).toBe("sq");
  });

  test("rikthen snapshot-in në memory-engine", async () => {
    const storage = createStorageMock();

    storage.records.set("xsus:memory:session:session-2", {
      version: "1.0.0",
      sessionId: "session-2",
      savedAt: "2026-01-01T00:00:00.000Z",
      snapshot: {
        id: "session-2",
        messages: [
          { role: "user", content: "Përshëndetje" }
        ]
      }
    });

    const importSession = vi.fn(async () => {});

    const memory = createPersistentMemory({
      storage,
      exportSession: vi.fn(),
      importSession
    });

    const result = await memory.restoreSession("session-2");

    expect(result.success).toBe(true);
    expect(result.restored).toBe(true);
    expect(importSession).toHaveBeenCalledWith(
      "session-2",
      {
        id: "session-2",
        messages: [
          { role: "user", content: "Përshëndetje" }
        ]
      }
    );
  });

  test("raporton kur sesioni nuk ekziston", async () => {
    const storage = createStorageMock();

    const memory = createPersistentMemory({
      storage,
      exportSession: vi.fn(),
      importSession: vi.fn()
    });

    const result = await memory.restoreSession("missing-session");

    expect(result).toEqual({
      success: false,
      restored: false,
      sessionId: "missing-session",
      reason: "SESSION_NOT_FOUND"
    });
  });

  test("fshin sesionin e ruajtur", async () => {
    const storage = createStorageMock();

    const memory = createPersistentMemory({
      storage,
      exportSession: vi.fn(),
      importSession: vi.fn()
    });

    await memory.saveSession.bind(memory);

    storage.records.set("xsus:memory:session:session-3", {
      sessionId: "session-3",
      snapshot: {}
    });

    const result = await memory.deleteSavedSession("session-3");

    expect(result.success).toBe(true);
    expect(storage.records.has(
      "xsus:memory:session:session-3"
    )).toBe(false);
  });

  test("kontrollon nëse sesioni është ruajtur", async () => {
    const storage = createStorageMock();

    const memory = createPersistentMemory({
      storage,
      exportSession: vi.fn(),
      importSession: vi.fn()
    });

    expect(await memory.hasSavedSession("session-4")).toBe(false);

    storage.records.set("xsus:memory:session:session-4", {
      sessionId: "session-4",
      snapshot: {}
    });

    expect(await memory.hasSavedSession("session-4")).toBe(true);
  });

  test("refuzon ID të pavlefshme", async () => {
    const storage = createStorageMock();

    const memory = createPersistentMemory({
      storage,
      exportSession: vi.fn(),
      importSession: vi.fn()
    });

    await expect(memory.saveSession("   ")).rejects.toMatchObject({
      code: "INVALID_SESSION_ID"
    });
  });

  test("izolon gabimet gjatë ruajtjes", async () => {
    const storage = createStorageMock();

    storage.set.mockRejectedValue(new Error("Disk error"));

    const memory = createPersistentMemory({
      storage,
      exportSession: vi.fn(async () => ({ id: "session-5" })),
      importSession: vi.fn()
    });

    await expect(
      memory.saveSession("session-5")
    ).rejects.toMatchObject({
      code: "SESSION_SAVE_FAILED"
    });
  });
});
