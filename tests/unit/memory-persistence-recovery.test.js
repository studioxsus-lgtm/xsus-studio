
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createPersistentMemory,
} from "../../src/core/persistent-memory.js";

describe("XSUS AI Core — Memory Persistence Recovery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createStorage() {
    const records = new Map();

    return {
      records,

      get: vi.fn(async (key) => {
        if (!records.has(key)) return null;
        return structuredClone(records.get(key));
      }),

      set: vi.fn(async (key, value) => {
        records.set(key, structuredClone(value));
      }),

      delete: vi.fn(async (key) => {
        records.delete(key);
      }),
    };
  }

  function createSnapshot(sessionId) {
    return {
      schemaVersion: 1,
      session: {
        sessionId,
        messages: [],
      },
    };
  }

  function createPersistence(storage, prefix = "xsus:recovery:") {
    return createPersistentMemory({
      storage,
      prefix,
      exportSession: vi.fn(async (sessionId) =>
        createSnapshot(sessionId)
      ),
      importSession: vi.fn(async () => null),
    });
  }

  test("trajton dështimin e ruajtjes me mesazh të standardizuar", async () => {
    const storage = createStorage();

    storage.set.mockRejectedValueOnce(
      new Error("Storage unavailable")
    );

    const persistence = createPersistence(storage);

    await expect(
      persistence.saveSession("recovery-save")
    ).rejects.toMatchObject({
      code: "SESSION_SAVE_FAILED",
      message: "Sesioni nuk mund të ruhet në storage.",
    });

    expect(storage.records.size).toBe(0);
  });

  test("trajton dështimin e rikthimit me mesazh të standardizuar", async () => {
    const storage = createStorage();
    const sessionId = "recovery-restore";

    storage.records.set(`xsus:recovery:${sessionId}`, {
      version: "1.0.0",
      sessionId,
      savedAt: new Date().toISOString(),
      snapshot: createSnapshot(sessionId),
    });

    const persistence = createPersistentMemory({
      storage,
      prefix: "xsus:recovery:",
      exportSession: vi.fn(async () => null),
      importSession: vi.fn(async () => {
        throw new Error("Restore failed");
      }),
    });

    await expect(
      persistence.restoreSession(sessionId)
    ).rejects.toMatchObject({
      code: "SESSION_RESTORE_FAILED",
      message: "Sesioni nuk mund të rikthehet në memory-engine.",
    });
  });

  test("dështimi i ruajtjes nuk lë regjistrim të ri", async () => {
    const storage = createStorage();

    storage.set.mockRejectedValueOnce(
      new Error("Disk write failed")
    );

    const persistence = createPersistence(storage);

    await expect(
      persistence.saveSession("no-partial-record")
    ).rejects.toThrow(
      "Sesioni nuk mund të ruhet në storage."
    );

    expect(storage.records.size).toBe(0);
  });

  test("standardizon dështimin kur storage nuk mund të lexohet", async () => {
    const storage = createStorage();

    storage.get.mockRejectedValueOnce(
      new Error("Storage unavailable")
    );

    const persistence = createPersistence(storage);

    await expect(
      persistence.restoreSession("recovery-read-error")
    ).rejects.toMatchObject({
      code: "SESSION_READ_FAILED",
      message: "Sesioni nuk mund të lexohet nga storage.",
    });
  });

  test("refuzon regjistrimin me version të papajtueshëm", async () => {
    const storage = createStorage();
    const sessionId = "recovery-invalid-version";

    storage.records.set(`xsus:recovery:${sessionId}`, {
      version: "999.0.0",
      sessionId,
      savedAt: new Date().toISOString(),
      snapshot: createSnapshot(sessionId),
    });

    const persistence = createPersistence(storage);

    await expect(
      persistence.restoreSession(sessionId)
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_SESSION_VERSION",
      message: "Versioni i regjistrimit të sesionit nuk mbështetet.",
    });
  });

  test("refuzon snapshot-in që i përket një sesioni tjetër", async () => {
    const storage = createStorage();
    const sessionId = "recovery-session-A";

    storage.records.set(`xsus:recovery:${sessionId}`, {
      version: "1.0.0",
      sessionId,
      savedAt: new Date().toISOString(),
      snapshot: createSnapshot("recovery-session-B"),
    });

    const importSession = vi.fn(async () => null);

    const persistence = createPersistentMemory({
      storage,
      prefix: "xsus:recovery:",
      exportSession: vi.fn(async () => null),
      importSession,
    });

    await expect(
      persistence.restoreSession(sessionId)
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
      message: "ID-ja e sesionit në snapshot nuk përputhet.",
    });

    expect(importSession).not.toHaveBeenCalled();
  });
});
