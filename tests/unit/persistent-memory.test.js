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

function createRecord(sessionId, overrides = {}) {
  return {
    version: PERSISTENT_MEMORY_VERSION,
    sessionId,
    savedAt: "2026-01-01T00:00:00.000Z",
    snapshot: {
      id: sessionId,
      messages: [],
    },
    ...overrides,
  };
}

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("XSUS AI Core — Persistent Memory", () => {
  test("ka versionin e pritshëm", () => {
    expect(PERSISTENT_MEMORY_VERSION).toBe("1.0.0");
  });

  test("kërkon storage të vlefshëm", () => {
    expect(() => createPersistentMemory()).toThrow(
      "Storage duhet të ofrojë funksionet get, set dhe delete."
    );
  });

  test("refuzon storage pa get", () => {
    expect(() =>
      createPersistentMemory({
        storage: {
          set: vi.fn(),
          delete: vi.fn(),
        },
        exportSession: vi.fn(),
        importSession: vi.fn(),
      })
    ).toThrow(TypeError);
  });

  test("refuzon storage pa set", () => {
    expect(() =>
      createPersistentMemory({
        storage: {
          get: vi.fn(),
          delete: vi.fn(),
        },
        exportSession: vi.fn(),
        importSession: vi.fn(),
      })
    ).toThrow(TypeError);
  });

  test("refuzon storage pa delete", () => {
    expect(() =>
      createPersistentMemory({
        storage: {
          get: vi.fn(),
          set: vi.fn(),
        },
        exportSession: vi.fn(),
        importSession: vi.fn(),
      })
    ).toThrow(TypeError);
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

  test("refuzon prefix bosh", () => {
    expect(() =>
      createPersistentMemory({
        storage: createStorageMock(),
        exportSession: vi.fn(),
        importSession: vi.fn(),
        prefix: "   ",
      })
    ).toThrow("Prefix duhet të jetë tekst jo bosh.");
  });

  test("refuzon prefix që nuk është tekst", () => {
    expect(() =>
      createPersistentMemory({
        storage: createStorageMock(),
        exportSession: vi.fn(),
        importSession: vi.fn(),
        prefix: 123,
      })
    ).toThrow(TypeError);
  });

  test("pranon prefix të personalizuar", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage, {
      prefix: "custom:memory:",
    });

    await memory.saveSession("session-prefix");

    expect(
      storage.records.has("custom:memory:session-prefix")
    ).toBe(true);
  });

  test("kthen API të ngrirë", () => {
    const memory = createMemory(createStorageMock());

    expect(Object.isFrozen(memory)).toBe(true);
    expect(memory.version).toBe(PERSISTENT_MEMORY_VERSION);
  });

  test("ekspozon funksionet publike", () => {
    const memory = createMemory(createStorageMock());

    expect(typeof memory.saveSession).toBe("function");
    expect(typeof memory.restoreSession).toBe("function");
    expect(typeof memory.deleteSavedSession).toBe("function");
    expect(typeof memory.deleteSessionCompletely).toBe("function");
    expect(typeof memory.hasSavedSession).toBe("function");
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
    expect(typeof result.savedAt).toBe("string");

    expect(exportSession).toHaveBeenCalledWith("session-1");
    expect(storage.set).toHaveBeenCalledOnce();

    const savedRecord = storage.records.get(
      "xsus:memory:session:session-1"
    );

    expect(savedRecord.version).toBe(PERSISTENT_MEMORY_VERSION);
    expect(savedRecord.sessionId).toBe("session-1");
    expect(savedRecord.snapshot.messages).toHaveLength(1);
    expect(savedRecord.snapshot.metadata.language).toBe("sq");
    expect(Number.isFinite(Date.parse(savedRecord.savedAt))).toBe(true);
  });

  test("ruan snapshot pa ndryshuar objektin origjinal", async () => {
    const storage = createStorageMock();

    const snapshot = {
      id: "session-clone",
      messages: [{ content: "Original" }],
    };

    const memory = createMemory(storage, {
      exportSession: vi.fn(async () => snapshot),
    });

    await memory.saveSession("session-clone");

    const saved = storage.records.get(
      "xsus:memory:session:session-clone"
    );

    saved.snapshot.messages[0].content = "Changed";

    expect(snapshot.messages[0].content).toBe("Original");
  });

  test("ruan snapshot me sessionId në nivelin kryesor", async () => {
    const storage = createStorageMock();

    const memory = createMemory(storage, {
      exportSession: vi.fn(async () => ({
        sessionId: "session-direct",
        messages: [],
      })),
    });

    const result = await memory.saveSession("session-direct");

    expect(result.success).toBe(true);
  });

  test("ruan snapshot me sessionId brenda session", async () => {
    const storage = createStorageMock();

    const memory = createMemory(storage, {
      exportSession: vi.fn(async () => ({
        session: {
          sessionId: "session-nested",
        },
        messages: [],
      })),
    });

    const result = await memory.saveSession("session-nested");

    expect(result.success).toBe(true);
  });

  test("refuzon snapshot me sessionId të papërputhshëm", async () => {
    const storage = createStorageMock();

    const memory = createMemory(storage, {
      exportSession: vi.fn(async () => ({
        sessionId: "another-session",
        messages: [],
      })),
    });

    await expect(
      memory.saveSession("session-expected")
    ).rejects.toMatchObject({
      code: "SESSION_ID_MISMATCH",
    });

    expect(storage.set).not.toHaveBeenCalled();
  });

  test("refuzon sessionId të papërputhshëm brenda session", async () => {
    const storage = createStorageMock();

    const memory = createMemory(storage, {
      exportSession: vi.fn(async () => ({
        session: {
          sessionId: "another-session",
        },
      })),
    });

    await expect(
      memory.saveSession("session-expected")
    ).rejects.toMatchObject({
      code: "SESSION_ID_MISMATCH",
    });
  });

  test("refuzon ID bosh", async () => {
    const memory = createMemory(createStorageMock());

    await expect(
      memory.saveSession("")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });
  });

  test("refuzon ID me hapësira", async () => {
    const memory = createMemory(createStorageMock());

    await expect(
      memory.saveSession("   ")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });
  });

  test("refuzon ID që tejkalon 128 karaktere", async () => {
    const memory = createMemory(createStorageMock());

    await expect(
      memory.saveSession("s".repeat(129))
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_ID",
    });
  });

  test("pranon ID me gjatësi 128 karaktere", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);
    const sessionId = "s".repeat(128);

    const result = await memory.saveSession(sessionId);

    expect(result.success).toBe(true);
  });

  test("refuzon ID që nuk është tekst", async () => {
    const memory = createMemory(createStorageMock());

    await expect(
      memory.saveSession(123)
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
      cause: expect.any(Error),
    });

    expect(storage.set).not.toHaveBeenCalled();
  });

  test("refuzon snapshot null", async () => {
    const memory = createMemory(createStorageMock(), {
      exportSession: vi.fn(async () => null),
    });

    await expect(
      memory.saveSession("session-null")
    ).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });

  test("refuzon snapshot undefined", async () => {
    const memory = createMemory(createStorageMock(), {
      exportSession: vi.fn(async () => undefined),
    });

    await expect(
      memory.saveSession("session-undefined")
    ).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });

  test("refuzon snapshot array", async () => {
    const memory = createMemory(createStorageMock(), {
      exportSession: vi.fn(async () => []),
    });

    await expect(
      memory.saveSession("session-array")
    ).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });

  test("refuzon snapshot primitive", async () => {
    const memory = createMemory(createStorageMock(), {
      exportSession: vi.fn(async () => "invalid"),
    });

    await expect(
      memory.saveSession("session-primitive")
    ).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });

  test("izolon gabimet e serializimit JSON", async () => {
    const circular = {};
    circular.self = circular;

    const memory = createMemory(createStorageMock(), {
      exportSession: vi.fn(async () => circular),
    });

    await expect(
      memory.saveSession("session-circular")
    ).rejects.toMatchObject({
      code: "SESSION_SERIALIZATION_FAILED",
      cause: expect.any(Error),
    });
  });

  test("refuzon BigInt gjatë serializimit", async () => {
    const memory = createMemory(createStorageMock(), {
      exportSession: vi.fn(async () => ({
        value: BigInt(10),
      })),
    });

    await expect(
      memory.saveSession("session-bigint")
    ).rejects.toMatchObject({
      code: "SESSION_SERIALIZATION_FAILED",
    });
  });

  test("refuzon objekt Date si snapshot", async () => {
    const memory = createMemory(createStorageMock(), {
      exportSession: vi.fn(async () => new Date()),
    });

    await expect(
      memory.saveSession("session-date")
    ).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
    });
  });

  test("izolon gabimet gjatë ruajtjes", async () => {
    const storage = createStorageMock();
    const diskError = new Error("Disk error");

    storage.set.mockRejectedValue(diskError);

    const memory = createMemory(storage);

    await expect(
      memory.saveSession("session-save-error")
    ).rejects.toMatchObject({
      code: "SESSION_SAVE_FAILED",
      cause: diskError,
    });
  });

  test("rikthen snapshot-in në memory-engine", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-2",
      createRecord("session-2", {
        snapshot: {
          id: "session-2",
          messages: [
            { role: "user", content: "Përshëndetje" },
          ],
        },
      })
    );

    const importSession = vi.fn(async () => {});
    const memory = createMemory(storage, { importSession });

    const result = await memory.restoreSession("session-2");

    expect(result.success).toBe(true);
    expect(result.restored).toBe(true);
    expect(result.sessionId).toBe("session-2");
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

  test("rikthen snapshot-in pa ndryshuar regjistrimin në storage", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-isolation",
      createRecord("session-isolation", {
        snapshot: {
          sessionId: "session-isolation",
          messages: [{ content: "Original" }],
        },
      })
    );

    const memory = createMemory(storage, {
      importSession: vi.fn(async (_id, snapshot) => {
        snapshot.messages[0].content = "Changed";
      }),
    });

    await memory.restoreSession("session-isolation");

    expect(
      storage.records.get(
        "xsus:memory:session:session-isolation"
      ).snapshot.messages[0].content
    ).toBe("Original");
  });

  test("raporton kur sesioni nuk ekziston", async () => {
    const memory = createMemory(createStorageMock());

    const result = await memory.restoreSession("missing-session");

    expect(result).toEqual({
      success: false,
      restored: false,
      sessionId: "missing-session",
      reason: "SESSION_NOT_FOUND",
    });
  });

  test("pranon savedAt null", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-null-date",
      createRecord("session-null-date", {
        savedAt: null,
      })
    );

    const memory = createMemory(storage);

    const result = await memory.restoreSession("session-null-date");

    expect(result.success).toBe(true);
    expect(result.savedAt).toBeNull();
  });

  test("pranon savedAt undefined", async () => {
    const storage = createStorageMock();

    const record = createRecord("session-no-date");
    delete record.savedAt;

    storage.records.set(
      "xsus:memory:session:session-no-date",
      record
    );

    const memory = createMemory(storage);

    const result = await memory.restoreSession("session-no-date");

    expect(result.success).toBe(true);
    expect(result.savedAt).toBeNull();
  });

  test.each([
    "",
    "not-a-date",
    123,
    {},
  ])("refuzon savedAt të pavlefshëm: %j", async (savedAt) => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-invalid-date",
      createRecord("session-invalid-date", { savedAt })
    );

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-invalid-date")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });
  });

  test("refuzon regjistrimin që nuk është objekt", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-invalid-record",
      []
    );

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-invalid-record")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });
  });

  test("refuzon regjistrimin me sessionId të papërputhshëm", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-expected",
      createRecord("session-different")
    );

    const importSession = vi.fn();
    const memory = createMemory(storage, { importSession });

    await expect(
      memory.restoreSession("session-expected")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });

    expect(importSession).not.toHaveBeenCalled();
  });

  test("refuzon regjistrimin pa sessionId", async () => {
    const storage = createStorageMock();
    const record = createRecord("session-missing-id");

    delete record.sessionId;

    storage.records.set(
      "xsus:memory:session:session-missing-id",
      record
    );

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-missing-id")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });
  });

  test("refuzon regjistrimin pa snapshot", async () => {
    const storage = createStorageMock();
    const record = createRecord("session-no-snapshot");

    delete record.snapshot;

    storage.records.set(
      "xsus:memory:session:session-no-snapshot",
      record
    );

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-no-snapshot")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });
  });

  test("refuzon snapshot që nuk është objekt", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-invalid-snapshot",
      createRecord("session-invalid-snapshot", {
        snapshot: [],
      })
    );

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-invalid-snapshot")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });
  });

  test("refuzon sessionId të papërputhshëm në snapshot", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-snapshot-mismatch",
      createRecord("session-snapshot-mismatch", {
        snapshot: {
          sessionId: "another-session",
          messages: [],
        },
      })
    );

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-snapshot-mismatch")
    ).rejects.toMatchObject({
      code: "INVALID_SESSION_RECORD",
    });
  });

  test("refuzon version të pambështetur", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-version",
      createRecord("session-version", {
        version: "2.0.0",
      })
    );

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-version")
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_SESSION_VERSION",
    });
  });

  test("refuzon version që mungon", async () => {
    const storage = createStorageMock();
    const record = createRecord("session-no-version");

    delete record.version;

    storage.records.set(
      "xsus:memory:session:session-no-version",
      record
    );

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-no-version")
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_SESSION_VERSION",
    });
  });

  test("izolon gabimet gjatë leximit", async () => {
    const storage = createStorageMock();
    const readError = new Error("Read error");

    storage.get.mockRejectedValue(readError);

    const memory = createMemory(storage);

    await expect(
      memory.restoreSession("session-read-error")
    ).rejects.toMatchObject({
      code: "SESSION_READ_FAILED",
      cause: readError,
    });
  });

  test("izolon gabimet gjatë rikthimit", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-restore-error",
      createRecord("session-restore-error")
    );

    const restoreError = new Error("Restore error");

    const memory = createMemory(storage, {
      importSession: vi.fn(async () => {
        throw restoreError;
      }),
    });

    await expect(
      memory.restoreSession("session-restore-error")
    ).rejects.toMatchObject({
      code: "SESSION_RESTORE_FAILED",
      cause: restoreError,
    });
  });

  test("fshin sesionin e ruajtur", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);

    storage.records.set(
      "xsus:memory:session:session-3",
      createRecord("session-3")
    );

    const result = await memory.deleteSavedSession("session-3");

    expect(result).toEqual({
      success: true,
      sessionId: "session-3",
    });

    expect(
      storage.records.has("xsus:memory:session:session-3")
    ).toBe(false);
  });

  test("izolon gabimet gjatë fshirjes", async () => {
    const storage = createStorageMock();
    const deleteError = new Error("Delete error");

    storage.delete.mockRejectedValue(deleteError);

    const memory = createMemory(storage);

    await expect(
      memory.deleteSavedSession("session-delete-error")
    ).rejects.toMatchObject({
      code: "SESSION_DELETE_FAILED",
      cause: deleteError,
    });
  });

  test("fshin edhe sesionin aktiv kur callback ekziston", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-complete",
      createRecord("session-complete")
    );

    const deleteSession = vi.fn(async () => {});
    const memory = createMemory(storage, { deleteSession });

    const result = await memory.deleteSessionCompletely(
      "session-complete"
    );

    expect(result.success).toBe(true);
    expect(deleteSession).toHaveBeenCalledWith("session-complete");
    expect(
      storage.records.has("xsus:memory:session:session-complete")
    ).toBe(false);
  });

  test("fshin regjistrimin edhe pa callback për sesionin aktiv", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-no-callback",
      createRecord("session-no-callback")
    );

    const memory = createMemory(storage);

    const result = await memory.deleteSessionCompletely(
      "session-no-callback"
    );

    expect(result.success).toBe(true);
    expect(
      storage.records.has(
        "xsus:memory:session:session-no-callback"
      )
    ).toBe(false);
  });

  test("raporton dështimin e fshirjes së sesionit aktiv", async () => {
    const storage = createStorageMock();

    storage.records.set(
      "xsus:memory:session:session-active-error",
      createRecord("session-active-error")
    );

    const deleteSession = vi.fn(async () => {
      throw new Error("Active session error");
    });

    const memory = createMemory(storage, { deleteSession });

    await expect(
      memory.deleteSessionCompletely("session-active-error")
    ).rejects.toMatchObject({
      code: "ACTIVE_SESSION_DELETE_FAILED",
    });

    expect(
      storage.records.has(
        "xsus:memory:session:session-active-error"
      )
    ).toBe(false);
  });

  test("kontrollon nëse sesioni është ruajtur", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);

    expect(await memory.hasSavedSession("session-4")).toBe(false);

    storage.records.set(
      "xsus:memory:session:session-4",
      createRecord("session-4")
    );

    expect(await memory.hasSavedSession("session-4")).toBe(true);
  });

  test("konsideron null si sesion të paruajtur", async () => {
    const storage = createStorageMock();

    storage.get.mockResolvedValue(null);

    const memory = createMemory(storage);

    expect(await memory.hasSavedSession("session-null")).toBe(false);
  });

  test("konsideron undefined si sesion të paruajtur", async () => {
    const storage = createStorageMock();

    storage.get.mockResolvedValue(undefined);

    const memory = createMemory(storage);

    expect(await memory.hasSavedSession("session-undefined")).toBe(false);
  });

  test("izolon gabimet gjatë kontrollit të ekzistencës", async () => {
    const storage = createStorageMock();
    const readError = new Error("Read error");

    storage.get.mockRejectedValue(readError);

    const memory = createMemory(storage);

    await expect(
      memory.hasSavedSession("session-has-error")
    ).rejects.toMatchObject({
      code: "SESSION_READ_FAILED",
      cause: readError,
    });
  });

  test("ruan rendin e dy operacioneve për të njëjtin sesion", async () => {
    const storage = createStorageMock();
    const firstExport = createDeferred();
    const events = [];

    const exportSession = vi.fn(async (sessionId) => {
      events.push(`export-${sessionId}`);

      if (events.length === 1) {
        await firstExport.promise;
      }

      return {
        id: sessionId,
        messages: [],
      };
    });

    const memory = createMemory(storage, { exportSession });

    const first = memory.saveSession("session-queue");
    const second = memory.saveSession("session-queue");

    await Promise.resolve();
    await Promise.resolve();

    expect(exportSession).toHaveBeenCalledTimes(1);

    firstExport.resolve();

    await Promise.all([first, second]);

    expect(exportSession).toHaveBeenCalledTimes(2);
    expect(storage.set).toHaveBeenCalledTimes(2);
  });

  test("lejon operacione të pavarura për sesione të ndryshme", async () => {
    const storage = createStorageMock();
    const firstExport = createDeferred();
    const started = [];

    const exportSession = vi.fn(async (sessionId) => {
      started.push(sessionId);

      if (sessionId === "session-a") {
        await firstExport.promise;
      }

      return { id: sessionId, messages: [] };
    });

    const memory = createMemory(storage, { exportSession });

    const first = memory.saveSession("session-a");
    const second = memory.saveSession("session-b");

    await second;

    expect(started).toContain("session-a");
    expect(started).toContain("session-b");

    firstExport.resolve();
    await first;
  });

  test("vazhdon radhën pas dështimit të një operacioni", async () => {
    const storage = createStorageMock();

    const exportSession = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary error"))
      .mockResolvedValueOnce({
        id: "session-retry",
        messages: [],
      });

    const memory = createMemory(storage, { exportSession });

    const first = memory.saveSession("session-retry");
    const second = memory.saveSession("session-retry");

    await expect(first).rejects.toMatchObject({
      code: "SESSION_EXPORT_FAILED",
    });

    const result = await second;

    expect(result.success).toBe(true);
    expect(storage.set).toHaveBeenCalledOnce();
  });

  test("fshirja pret ruajtjen e mëparshme të të njëjtit sesion", async () => {
    const storage = createStorageMock();
    const saveGate = createDeferred();
    const events = [];

    storage.set.mockImplementation(async (key, value) => {
      events.push("set-start");
      await saveGate.promise;
      storage.records.set(key, structuredClone(value));
      events.push("set-end");
    });

    storage.delete.mockImplementation(async (key) => {
      events.push("delete");
      storage.records.delete(key);
    });

    const memory = createMemory(storage);

    const save = memory.saveSession("session-order");
    const deletion = memory.deleteSavedSession("session-order");

    await Promise.resolve();
    await Promise.resolve();

    expect(events).toEqual(["set-start"]);

    saveGate.resolve();

    await Promise.all([save, deletion]);

    expect(events).toEqual([
      "set-start",
      "set-end",
      "delete",
    ]);

    expect(
      storage.records.has("xsus:memory:session:session-order")
    ).toBe(false);
  });

  test("kontrolli i ekzistencës pret ruajtjen e mëparshme", async () => {
    const storage = createStorageMock();
    const saveGate = createDeferred();

    storage.set.mockImplementation(async (key, value) => {
      await saveGate.promise;
      storage.records.set(key, structuredClone(value));
    });

    const memory = createMemory(storage);

    const save = memory.saveSession("session-check-order");
    const check = memory.hasSavedSession("session-check-order");

    await Promise.resolve();
    await Promise.resolve();

    expect(storage.get).not.toHaveBeenCalled();

    saveGate.resolve();

    await save;

    expect(await check).toBe(true);
  });

  test("rikthimi pret operacionin e mëparshëm për të njëjtin sesion", async () => {
    const storage = createStorageMock();
    const saveGate = createDeferred();

    storage.set.mockImplementation(async (key, value) => {
      await saveGate.promise;
      storage.records.set(key, structuredClone(value));
    });

    const importSession = vi.fn(async () => {});
    const memory = createMemory(storage, { importSession });

    const save = memory.saveSession("session-restore-order");
    const restore = memory.restoreSession("session-restore-order");

    await Promise.resolve();
    await Promise.resolve();

    expect(storage.get).not.toHaveBeenCalled();

    saveGate.resolve();

    await save;
    const result = await restore;

    expect(result.restored).toBe(true);
    expect(importSession).toHaveBeenCalledOnce();
  });

  test("izolon të dhënat e sesioneve të ndryshme", async () => {
    const storage = createStorageMock();
    const memory = createMemory(storage);

    await memory.saveSession("session-isolation-a");
    await memory.saveSession("session-isolation-b");

    expect(
      storage.records.has(
        "xsus:memory:session:session-isolation-a"
      )
    ).toBe(true);

    expect(
      storage.records.has(
        "xsus:memory:session:session-isolation-b"
      )
    ).toBe(true);

    await memory.deleteSavedSession("session-isolation-a");

    expect(
      storage.records.has(
        "xsus:memory:session:session-isolation-a"
      )
    ).toBe(false);

    expect(
      storage.records.has(
        "xsus:memory:session:session-isolation-b"
      )
    ).toBe(true);
  });
});
