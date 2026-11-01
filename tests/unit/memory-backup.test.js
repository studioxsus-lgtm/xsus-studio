import { describe, expect, test, vi } from "vitest";

import {
  createMemoryBackup,
  verifyMemoryBackup,
  restoreMemoryBackup,
  MEMORY_BACKUP_VERSION,
  MEMORY_BACKUP_FORMAT,
  MEMORY_BACKUP_ERRORS,
} from "../../src/core/memory-backup.js";

function createSnapshot() {
  return {
    sessionId: "session-1",
    messages: [
      {
        role: "user",
        content: "Përshëndetje XSUS AI",
        timestamp: "2026-10-22T10:00:00.000Z",
      },
      {
        role: "assistant",
        content: "Përshëndetje!",
        timestamp: "2026-10-22T10:00:01.000Z",
      },
    ],
  };
}

function createValidBackup(snapshot = createSnapshot(), options = {}) {
  return createMemoryBackup(snapshot, options);
}

function expectBackupErrorCode(operation, code) {
  expect(operation).toThrow(
    expect.objectContaining({ code })
  );
}

describe("XSUS AI Core — Memory Backup & Recovery", () => {
  describe("Versioni dhe konstantet", () => {
    test("përdor versionin e pritshëm", () => {
      expect(MEMORY_BACKUP_VERSION).toBe("1.0.0");
    });

    test("përdor formatin e pritshëm", () => {
      expect(MEMORY_BACKUP_FORMAT).toBe("xsus-memory-backup");
    });

    test("ekspozon kodet e gabimeve", () => {
      expect(MEMORY_BACKUP_ERRORS).toEqual(
        expect.objectContaining({
          INVALID_BACKUP: "MEMORY_BACKUP_INVALID",
          INVALID_SNAPSHOT: "MEMORY_BACKUP_SNAPSHOT_INVALID",
          CHECKSUM_MISMATCH: "MEMORY_BACKUP_CHECKSUM_MISMATCH",
          UNSUPPORTED_VERSION: "MEMORY_BACKUP_UNSUPPORTED_VERSION",
          SESSION_CONFLICT: "MEMORY_BACKUP_SESSION_CONFLICT",
          RESTORE_FAILED: "MEMORY_BACKUP_RESTORE_FAILED",
          INVALID_CALLBACK: "MEMORY_BACKUP_INVALID_CALLBACK",
        })
      );

      expect(Object.isFrozen(MEMORY_BACKUP_ERRORS)).toBe(true);
    });
  });

  describe("Krijimi i backup-it", () => {
    test("krijon backup të vlefshëm", () => {
      const backup = createValidBackup();

      expect(backup.format).toBe(MEMORY_BACKUP_FORMAT);
      expect(backup.version).toBe(MEMORY_BACKUP_VERSION);
      expect(backup.sessionId).toBe("session-1");
      expect(backup.createdAt).toEqual(expect.any(String));
      expect(Number.isNaN(Date.parse(backup.createdAt))).toBe(false);
      expect(backup.checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(backup.payload).toEqual(createSnapshot());
      expect(verifyMemoryBackup(backup).valid).toBe(true);
    });

    test("krijon checksum të qëndrueshëm për të njëjtin payload", () => {
      const snapshot = createSnapshot();

      const first = createValidBackup(snapshot);
      const second = createValidBackup(snapshot);

      expect(first.checksum).toBe(second.checksum);
    });

    test("krijon payload të pavarur nga objekti burimor", () => {
      const snapshot = createSnapshot();
      const backup = createValidBackup(snapshot);

      snapshot.messages[0].content = "Tekst i ndryshuar";
      snapshot.messages.push({
        role: "user",
        content: "Mesazh i ri",
      });

      expect(backup.payload.messages).toHaveLength(2);
      expect(backup.payload.messages[0].content).toBe(
        "Përshëndetje XSUS AI"
      );
      expect(verifyMemoryBackup(backup).valid).toBe(true);
    });

    test("ruan një kopje JSON të të dhënave", () => {
      const snapshot = {
        ...createSnapshot(),
        optional: undefined,
      };

      const backup = createValidBackup(snapshot);

      expect(backup.payload).not.toHaveProperty("optional");
      expect(verifyMemoryBackup(backup).valid).toBe(true);
    });

    test.each([
      null,
      undefined,
      [],
      "snapshot",
      123,
      true,
    ])("refuzon snapshot jo-objekt: %s", (snapshot) => {
      expectBackupErrorCode(
        () => createMemoryBackup(snapshot),
        MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT
      );
    });

    test("refuzon snapshot me BigInt që nuk serializohet", () => {
      const snapshot = {
        sessionId: "session-1",
        value: 10n,
      };

      expectBackupErrorCode(
        () => createMemoryBackup(snapshot),
        MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT
      );
    });

    test("refuzon snapshot rrethor", () => {
      const snapshot = createSnapshot();
      snapshot.self = snapshot;

      expectBackupErrorCode(
        () => createMemoryBackup(snapshot),
        MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT
      );
    });

    test("refuzon sessionId bosh në opsionet e krijimit", () => {
      expectBackupErrorCode(
        () =>
          createMemoryBackup(createSnapshot(), {
            sessionId: " ",
          }),
        MEMORY_BACKUP_ERRORS.INVALID_BACKUP
      );
    });

    test.each([null, 123, false, {}, []])(
      "refuzon sessionId me tip të pavlefshëm: %s",
      (sessionId) => {
        expectBackupErrorCode(
          () =>
            createMemoryBackup(createSnapshot(), {
              sessionId,
            }),
          MEMORY_BACKUP_ERRORS.INVALID_BACKUP
        );
      }
    );

    test("pranon sessionId të shprehur qartë", () => {
      const backup = createValidBackup(createSnapshot(), {
        sessionId: "custom-session",
      });

      expect(backup.sessionId).toBe("custom-session");
      expect(verifyMemoryBackup(backup).valid).toBe(true);
    });

    test("nxjerr sessionId nga payload.id kur sessionId mungon", () => {
      const backup = createValidBackup({
        id: "session-from-id",
        messages: [],
      });

      expect(backup.sessionId).toBe("session-from-id");
    });

    test("nxjerr sessionId nga payload.session.sessionId", () => {
      const backup = createValidBackup({
        session: {
          sessionId: "nested-session",
        },
      });

      expect(backup.sessionId).toBe("nested-session");
    });

    test("përdor null kur payload-i nuk përmban identitet sesioni", () => {
      const backup = createValidBackup({
        messages: [],
      });

      expect(backup.sessionId).toBeNull();
      expect(verifyMemoryBackup(backup).valid).toBe(true);
    });

    test("refuzon identitet të zbrazët të nxjerrë nga payload-i", () => {
      expectBackupErrorCode(
        () =>
          createMemoryBackup({
            sessionId: " ",
          }),
        MEMORY_BACKUP_ERRORS.INVALID_BACKUP
      );
    });
  });

  describe("Verifikimi i backup-it", () => {
    test("verifikon backup të vlefshëm", () => {
      const result = verifyMemoryBackup(createValidBackup());

      expect(result).toEqual({
        valid: true,
        version: MEMORY_BACKUP_VERSION,
        issues: [],
      });
    });

    test.each([
      null,
      undefined,
      [],
      "backup",
      123,
    ])("refuzon backup jo-objekt: %s", (backup) => {
      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.version).toBe(MEMORY_BACKUP_VERSION);
      expect(result.issues[0].code).toBe(
        MEMORY_BACKUP_ERRORS.INVALID_BACKUP
      );
    });

    test("refuzon format të panjohur", () => {
      const backup = createValidBackup();
      backup.format = "unknown-format";

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
        })
      );
    });

    test("refuzon version të pambështetur", () => {
      const backup = createValidBackup();
      backup.version = "99.0.0";

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: MEMORY_BACKUP_ERRORS.UNSUPPORTED_VERSION,
        })
      );
    });

    test("raporton formatin dhe versionin e gabuar së bashku", () => {
      const backup = createValidBackup();

      backup.format = "invalid-format";
      backup.version = "99.0.0";

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
          }),
          expect.objectContaining({
            code: MEMORY_BACKUP_ERRORS.UNSUPPORTED_VERSION,
          }),
        ])
      );
    });

    test.each([
      undefined,
      null,
      "",
      "not-a-date",
      "invalid-date",
    ])("refuzon createdAt të pavlefshëm: %s", (createdAt) => {
      const backup = createValidBackup();
      backup.createdAt = createdAt;

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          message: "Data e krijimit të backup-it nuk është e vlefshme.",
        })
      );
    });

    test.each([
      "",
      " ",
      123,
      false,
      {},
    ])("refuzon sessionId të pavlefshëm gjatë verifikimit: %s", (sessionId) => {
      const backup = createValidBackup();
      backup.sessionId = sessionId;

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          message: "Identiteti i sesionit në backup nuk është i vlefshëm.",
        })
      );
    });

    test("pranon sessionId null", () => {
      const backup = createValidBackup({
        messages: [],
      });

      expect(backup.sessionId).toBeNull();
      expect(verifyMemoryBackup(backup).valid).toBe(true);
    });

    test.each([
      undefined,
      null,
      [],
      "payload",
      123,
    ])("refuzon payload jo-objekt: %s", (payload) => {
      const backup = createValidBackup();
      backup.payload = payload;

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
        })
      );
    });

    test.each([
      undefined,
      null,
      "",
      "abc",
      "A".repeat(64),
      "g".repeat(64),
      123,
    ])("refuzon checksum të pavlefshëm: %s", (checksum) => {
      const backup = createValidBackup();
      backup.checksum = checksum;

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          message: "Checksum-i mungon ose nuk ka format SHA-256.",
        })
      );
    });

    test("zbulon ndryshimin e payload-it", () => {
      const backup = createValidBackup();
      backup.payload.messages[0].content = "Të dhëna të ndryshuara";

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: MEMORY_BACKUP_ERRORS.CHECKSUM_MISMATCH,
        })
      );
    });

    test("zbulon ndryshimin e checksum-it", () => {
      const backup = createValidBackup();

      backup.checksum = "0".repeat(64);

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues[0].code).toBe(
        MEMORY_BACKUP_ERRORS.CHECKSUM_MISMATCH
      );
    });

    test("raporton payload që nuk serializohet gjatë verifikimit", () => {
      const backup = createValidBackup();

      backup.payload.value = 10n;

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues).toEqual([
        expect.objectContaining({
          code: MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT,
          message: "Payload nuk mund të serializohet.",
        }),
      ]);
    });

    test("raporton disa gabime të metadata-s njëkohësisht", () => {
      const backup = createValidBackup();

      backup.format = "invalid";
      backup.version = "invalid";
      backup.createdAt = "not-a-date";
      backup.sessionId = " ";
      backup.checksum = "invalid";

      const result = verifyMemoryBackup(backup);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Rikuperimi i backup-it", () => {
    test("rikthen backup të vlefshëm", async () => {
      const backup = createValidBackup();

      const restoreSnapshot = vi.fn(async (snapshot) => ({
        restored: true,
        sessionId: snapshot.sessionId,
      }));

      const result = await restoreMemoryBackup(backup, {
        restoreSnapshot,
      });

      expect(result).toEqual({
        restored: true,
        sessionId: "session-1",
      });

      expect(restoreSnapshot).toHaveBeenCalledOnce();
    });

    test("kalon sessionId dhe versionin te callback-u", async () => {
      const backup = createValidBackup();
      const restoreSnapshot = vi.fn().mockResolvedValue("ok");

      await restoreMemoryBackup(backup, {
        restoreSnapshot,
      });

      expect(restoreSnapshot).toHaveBeenCalledWith(
        backup.payload,
        {
          sessionId: "session-1",
          backupVersion: MEMORY_BACKUP_VERSION,
        }
      );
    });

    test("nuk rikthen backup me checksum të pavlefshëm", async () => {
      const backup = createValidBackup();

      backup.payload.messages[0].content = "Ndryshim i paautorizuar";

      const restoreSnapshot = vi.fn();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot,
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.CHECKSUM_MISMATCH,
      });

      expect(restoreSnapshot).not.toHaveBeenCalled();
    });

    test("refuzon rikuperimin pa callback", async () => {
      const backup = createValidBackup();

      await expect(
        restoreMemoryBackup(backup)
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.INVALID_CALLBACK,
      });
    });

    test.each([
      null,
      undefined,
      "not-a-function",
      {},
    ])("refuzon restoreSnapshot të pavlefshëm: %s", async (callback) => {
      const backup = createValidBackup();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot: callback,
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.INVALID_CALLBACK,
      });
    });

    test.each([
      null,
      "not-a-function",
      {},
      123,
    ])("refuzon sessionExists të pavlefshëm: %s", async (sessionExists) => {
      const backup = createValidBackup();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot: vi.fn(),
          sessionExists,
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.INVALID_CALLBACK,
      });
    });

    test.each([
      null,
      "true",
      1,
      {},
    ])("refuzon allowOverwrite të pavlefshëm: %s", async (allowOverwrite) => {
      const backup = createValidBackup();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot: vi.fn(),
          allowOverwrite,
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.INVALID_CALLBACK,
      });
    });

    test("parandalon mbishkrimin e sesionit aktiv", async () => {
      const backup = createValidBackup();
      const restoreSnapshot = vi.fn();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot,
          sessionExists: vi.fn().mockResolvedValue(true),
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.SESSION_CONFLICT,
      });

      expect(restoreSnapshot).not.toHaveBeenCalled();
    });

    test("lejon mbishkrimin vetëm kur autorizohet", async () => {
      const backup = createValidBackup();
      const restoreSnapshot = vi.fn().mockResolvedValue("restored");

      const result = await restoreMemoryBackup(backup, {
        restoreSnapshot,
        sessionExists: vi.fn().mockResolvedValue(true),
        allowOverwrite: true,
      });

      expect(result).toBe("restored");
      expect(restoreSnapshot).toHaveBeenCalledOnce();
    });

    test("vazhdon rikuperimin kur sesioni nuk ekziston", async () => {
      const backup = createValidBackup();
      const restoreSnapshot = vi.fn().mockResolvedValue("restored");
      const sessionExists = vi.fn().mockResolvedValue(false);

      const result = await restoreMemoryBackup(backup, {
        restoreSnapshot,
        sessionExists,
      });

      expect(result).toBe("restored");
      expect(sessionExists).toHaveBeenCalledWith("session-1");
      expect(restoreSnapshot).toHaveBeenCalledOnce();
    });

    test("nuk kontrollon konflikt kur backup-i nuk ka sessionId", async () => {
      const backup = createValidBackup({
        messages: [],
      });

      const sessionExists = vi.fn();
      const restoreSnapshot = vi.fn().mockResolvedValue("restored");

      const result = await restoreMemoryBackup(backup, {
        restoreSnapshot,
        sessionExists,
      });

      expect(result).toBe("restored");
      expect(sessionExists).not.toHaveBeenCalled();
    });

    test("raporton dështimin e sessionExists", async () => {
      const backup = createValidBackup();
      const restoreSnapshot = vi.fn();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot,
          sessionExists: vi.fn().mockRejectedValue(
            new Error("Kontrolli i sesionit dështoi")
          ),
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.RESTORE_FAILED,
        message: "Kontrolli i sesionit dështoi",
      });

      expect(restoreSnapshot).not.toHaveBeenCalled();
    });

    test("trajton gabim jo-Error nga sessionExists", async () => {
      const backup = createValidBackup();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot: vi.fn(),
          sessionExists: vi.fn().mockRejectedValue("gabim"),
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.RESTORE_FAILED,
        message: "Nuk mund të verifikohet gjendja e sesionit.",
      });
    });

    test("raporton dështimin e callback-ut të rikuperimit", async () => {
      const backup = createValidBackup();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot: async () => {
            throw new Error("Rikuperimi dështoi.");
          },
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.RESTORE_FAILED,
        message: "Rikuperimi dështoi.",
      });
    });

    test("trajton gabim jo-Error nga callback-u i rikuperimit", async () => {
      const backup = createValidBackup();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot: async () => {
            throw "gabim i panjohur";
          },
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.RESTORE_FAILED,
        message: "Rikuperimi i memories dështoi.",
      });
    });

    test("kalon kopje të izoluar te callback-u", async () => {
      const backup = createValidBackup();
      const originalPayload = structuredClone(backup.payload);

      const restoreSnapshot = vi.fn(async (snapshot) => {
        snapshot.messages[0].content = "Ndryshuar nga callback-u";
        snapshot.newProperty = true;
        return "restored";
      });

      const result = await restoreMemoryBackup(backup, {
        restoreSnapshot,
      });

      expect(result).toBe("restored");
      expect(backup.payload).toEqual(originalPayload);
      expect(verifyMemoryBackup(backup).valid).toBe(true);
    });

    test("nuk thërret callback-un kur backup-i është i pavlefshëm", async () => {
      const backup = createValidBackup();
      backup.format = "invalid";

      const restoreSnapshot = vi.fn();

      await expect(
        restoreMemoryBackup(backup, {
          restoreSnapshot,
        })
      ).rejects.toMatchObject({
        code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP,
      });

      expect(restoreSnapshot).not.toHaveBeenCalled();
    });
  });
});
