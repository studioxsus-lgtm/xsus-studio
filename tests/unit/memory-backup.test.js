
import { describe, expect, test, vi } from "vitest";

import {
  createMemoryBackup,
  verifyMemoryBackup,
  restoreMemoryBackup,
  MEMORY_BACKUP_VERSION,
  MEMORY_BACKUP_ERRORS
} from "../../src/core/memory-backup.js";

function createSnapshot() {
  return {
    sessionId: "session-1",
    messages: [
      {
        role: "user",
        content: "Përshëndetje XSUS AI",
        timestamp: "2026-10-22T10:00:00.000Z"
      },
      {
        role: "assistant",
        content: "Përshëndetje!",
        timestamp: "2026-10-22T10:00:01.000Z"
      }
    ]
  };
}

describe("XSUS AI Core — Memory Backup & Recovery", () => {
  test("përdor versionin e pritshëm", () => {
    expect(MEMORY_BACKUP_VERSION).toBe("1.0.0");
  });

  test("krijon backup të vlefshëm", () => {
    const backup = createMemoryBackup(createSnapshot());

    expect(backup.format).toBe("xsus-memory-backup");
    expect(backup.version).toBe("1.0.0");
    expect(backup.sessionId).toBe("session-1");
    expect(backup.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyMemoryBackup(backup).valid).toBe(true);
  });

  test("backup mbetet i pandryshuar kur ndryshon burimi", () => {
    const snapshot = createSnapshot();
    const backup = createMemoryBackup(snapshot);

    snapshot.messages[0].content = "Tekst i ndryshuar";

    expect(backup.payload.messages[0].content)
      .toBe("Përshëndetje XSUS AI");

    expect(verifyMemoryBackup(backup).valid).toBe(true);
  });

  test("refuzon snapshot të pavlefshëm", () => {
    expect(() => createMemoryBackup(null)).toThrow(
      expect.objectContaining({
        code: MEMORY_BACKUP_ERRORS.INVALID_SNAPSHOT
      })
    );
  });

  test("zbulon ndryshimin e payload-it", () => {
    const backup = createMemoryBackup(createSnapshot());

    backup.payload.messages[0].content = "Të dhëna të ndryshuara";

    const result = verifyMemoryBackup(backup);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_BACKUP_ERRORS.CHECKSUM_MISMATCH
      })
    );
  });

  test("refuzon version të pambështetur", () => {
    const backup = createMemoryBackup(createSnapshot());
    backup.version = "99.0.0";

    const result = verifyMemoryBackup(backup);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_BACKUP_ERRORS.UNSUPPORTED_VERSION
      })
    );
  });

  test("refuzon format të panjohur", () => {
    const backup = createMemoryBackup(createSnapshot());
    backup.format = "unknown-format";

    const result = verifyMemoryBackup(backup);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: MEMORY_BACKUP_ERRORS.INVALID_BACKUP
      })
    );
  });

  test("rikthen backup të vlefshëm", async () => {
    const backup = createMemoryBackup(createSnapshot());
    const restoreSnapshot = vi.fn(async snapshot => ({
      restored: true,
      sessionId: snapshot.sessionId
    }));

    const result = await restoreMemoryBackup(backup, {
      restoreSnapshot
    });

    expect(result).toEqual({
      restored: true,
      sessionId: "session-1"
    });

    expect(restoreSnapshot).toHaveBeenCalledOnce();
  });

  test("nuk rikthen backup me checksum të pavlefshëm", async () => {
    const backup = createMemoryBackup(createSnapshot());
    backup.payload.messages[0].content = "Ndryshim i paautorizuar";

    const restoreSnapshot = vi.fn();

    await expect(
      restoreMemoryBackup(backup, { restoreSnapshot })
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_ERRORS.CHECKSUM_MISMATCH
    });

    expect(restoreSnapshot).not.toHaveBeenCalled();
  });

  test("parandalon mbishkrimin e sesionit aktiv", async () => {
    const backup = createMemoryBackup(createSnapshot());
    const restoreSnapshot = vi.fn();

    await expect(
      restoreMemoryBackup(backup, {
        restoreSnapshot,
        sessionExists: async () => true
      })
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_ERRORS.SESSION_CONFLICT
    });

    expect(restoreSnapshot).not.toHaveBeenCalled();
  });

  test("lejon mbishkrimin vetëm kur autorizohet", async () => {
    const backup = createMemoryBackup(createSnapshot());
    const restoreSnapshot = vi.fn(async () => "restored");

    const result = await restoreMemoryBackup(backup, {
      restoreSnapshot,
      sessionExists: async () => true,
      allowOverwrite: true
    });

    expect(result).toBe("restored");
    expect(restoreSnapshot).toHaveBeenCalledOnce();
  });

  test("raporton dështimin e callback-ut të rikuperimit", async () => {
    const backup = createMemoryBackup(createSnapshot());

    await expect(
      restoreMemoryBackup(backup, {
        restoreSnapshot: async () => {
          throw new Error("Rikuperimi dështoi.");
        }
      })
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_ERRORS.RESTORE_FAILED
    });
  });

  test("refuzon rikuperimin pa callback", async () => {
    const backup = createMemoryBackup(createSnapshot());

    await expect(
      restoreMemoryBackup(backup)
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_ERRORS.INVALID_CALLBACK
    });
  });

  test("raporton backup që nuk është objekt", () => {
    const result = verifyMemoryBackup(null);

    expect(result.valid).toBe(false);
    expect(result.issues[0].code)
      .toBe(MEMORY_BACKUP_ERRORS.INVALID_BACKUP);
  });
});
