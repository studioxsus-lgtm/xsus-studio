
import { describe, expect, test, vi } from "vitest";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import {
  createMemoryBackupRecovery,
  MEMORY_BACKUP_RECOVERY_ERRORS,
} from "../../src/core/memory-backup-recovery.js";

function createTestBackup(sessionId = "session-001") {
  return createMemoryBackup(
    {
      sessionId,
      messages: [
        { role: "user", content: "Përshëndetje" },
        { role: "assistant", content: "Përshëndetje!" },
      ],
    },
    { sessionId }
  );
}

function createStorage(backups = {}) {
  return {
    get: vi.fn(async (id) => backups[id] ?? null),

    verify: vi.fn(async (id) => {
      const backup = backups[id];

      if (!backup) {
        return { valid: false, exists: false };
      }

      return { valid: true, exists: true };
    }),
  };
}

describe("XSUS Memory Backup Recovery", () => {
  test("krijon recovery vetëm me storage dhe callback të vlefshëm", () => {
    expect(() =>
      createMemoryBackupRecovery()
    ).toThrow();

    expect(() =>
      createMemoryBackupRecovery({
        storage: createStorage(),
      })
    ).toThrow();
  });

  test("identifikon backup që mungon", async () => {
    const recovery = createMemoryBackupRecovery({
      storage: createStorage(),
      restoreSnapshot: vi.fn(),
    });

    await expect(recovery.inspect("missing")).resolves.toMatchObject({
      exists: false,
      valid: false,
      canRestore: false,
      reason: MEMORY_BACKUP_RECOVERY_ERRORS.NOT_FOUND,
    });
  });

  test("inspekton një backup të vlefshëm", async () => {
    const backup = createTestBackup();

    const recovery = createMemoryBackupRecovery({
      storage: createStorage({ "backup-001": backup }),
      restoreSnapshot: vi.fn(),
    });

    await expect(
      recovery.inspect("backup-001")
    ).resolves.toMatchObject({
      version: "1.0.0",
      backupId: "backup-001",
      exists: true,
      valid: true,
      canRestore: true,
      sessionId: "session-001",
    });
  });

  test("rikthen snapshot-in e backup-it", async () => {
    const backup = createTestBackup();
    const restoreSnapshot = vi.fn(async (snapshot) => ({
      restored: true,
      messageCount: snapshot.messages.length,
    }));

    const recovery = createMemoryBackupRecovery({
      storage: createStorage({ "backup-001": backup }),
      restoreSnapshot,
    });

    const result = await recovery.recover("backup-001");

    expect(result.success).toBe(true);
    expect(result.backupId).toBe("backup-001");
    expect(restoreSnapshot).toHaveBeenCalledTimes(1);

    expect(restoreSnapshot.mock.calls[0][0]).toEqual(
      backup.payload
    );

    expect(restoreSnapshot.mock.calls[0][1]).toMatchObject({
      sessionId: "session-001",
      backupId: "backup-001",
    });

    expect(result.result).toEqual({
      restored: true,
      messageCount: 2,
    });
  });

  test("nuk e rikthen backup-in që mungon", async () => {
    const restoreSnapshot = vi.fn();

    const recovery = createMemoryBackupRecovery({
      storage: createStorage(),
      restoreSnapshot,
    });

    await expect(
      recovery.recover("missing")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.NOT_FOUND,
    });

    expect(restoreSnapshot).not.toHaveBeenCalled();
  });

  test("refuzon backup me integritet të pavlefshëm", async () => {
    const backup = createTestBackup();

    backup.payload.messages[0].content = "Ndryshim i paautorizuar";

    const recovery = createMemoryBackupRecovery({
      storage: createStorage({ "backup-bad": backup }),
      restoreSnapshot: vi.fn(),
    });

    await expect(
      recovery.recover("backup-bad")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP,
    });
  });

  test("parandalon konfliktin me një sesion ekzistues", async () => {
    const backup = createTestBackup();

    const recovery = createMemoryBackupRecovery({
      storage: createStorage({ "backup-001": backup }),
      restoreSnapshot: vi.fn(),
      sessionExists: vi.fn(async () => true),
    });

    await expect(
      recovery.recover("backup-001")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.SESSION_CONFLICT,
    });
  });

  test("lejon mbishkrimin vetëm me leje të qartë", async () => {
    const backup = createTestBackup();
    const restoreSnapshot = vi.fn(async () => "restored");

    const recovery = createMemoryBackupRecovery({
      storage: createStorage({ "backup-001": backup }),
      restoreSnapshot,
      sessionExists: vi.fn(async () => true),
    });

    const result = await recovery.recover("backup-001", {
      allowOverwrite: true,
    });

    expect(result.success).toBe(true);
    expect(restoreSnapshot).toHaveBeenCalledTimes(1);
  });

  test("standardizon gabimet e callback-ut të rikthimit", async () => {
    const backup = createTestBackup();

    const recovery = createMemoryBackupRecovery({
      storage: createStorage({ "backup-001": backup }),
      restoreSnapshot: vi.fn(async () => {
        throw new Error("restore failure");
      }),
    });

    await expect(
      recovery.recover("backup-001")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.RESTORE_FAILED,
    });
  });

  test("refuzon ID bosh", async () => {
    const recovery = createMemoryBackupRecovery({
      storage: createStorage(),
      restoreSnapshot: vi.fn(),
    });

    await expect(
      recovery.inspect(" ")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_ID,
    });
  });
});
