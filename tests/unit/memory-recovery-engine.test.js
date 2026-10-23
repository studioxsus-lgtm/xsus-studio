
import { describe, expect, test, vi } from "vitest";

import {
  createMemoryRecoveryEngine,
  MEMORY_RECOVERY_ENGINE_VERSION,
} from "../../src/core/memory-recovery-engine.js";

function createStorageMock(backups = []) {
  const records = new Map(
    backups.map((item) => [item.backupId, item.backup])
  );

  return {
    list: vi.fn(async () =>
      backups.map(({ backupId, createdAt }) => ({
        backupId,
        createdAt,
      }))
    ),

    verify: vi.fn(async (backupId) => ({
      exists: records.has(backupId),
      valid: records.has(backupId),
    })),

    get: vi.fn(async (backupId) =>
      records.get(backupId) ?? null
    ),
  };
}

describe("XSUS Memory Recovery Engine", () => {
  test("ka versionin e pritshëm", () => {
    const engine = createMemoryRecoveryEngine({
      storage: createStorageMock(),
    });

    expect(engine.version).toBe(
      MEMORY_RECOVERY_ENGINE_VERSION
    );
  });

  test("refuzon storage të pavlefshëm", () => {
    expect(() =>
      createMemoryRecoveryEngine({ storage: {} })
    ).toThrow();
  });

  test("rikuperon backup-in e kërkuar", async () => {
    const backup = {
      id: "backup-1",
      version: "1.0.0",
    };

    const storage = createStorageMock([
      {
        backupId: "backup-1",
        createdAt: "2026-10-20T10:00:00.000Z",
        backup,
      },
    ]);

    const engine = createMemoryRecoveryEngine({ storage });
    const result = await engine.recover({
      backupId: "backup-1",
    });

    expect(result.status).toBe("recovered");
    expect(result.recovered).toBe(true);
    expect(result.backupId).toBe("backup-1");
    expect(result.backup).toEqual(backup);
  });

  test("zgjedh backup-in më të ri të vlefshëm", async () => {
    const olderBackup = { id: "older" };
    const newerBackup = { id: "newer" };

    const storage = createStorageMock([
      {
        backupId: "older",
        createdAt: "2026-10-19T10:00:00.000Z",
        backup: olderBackup,
      },
      {
        backupId: "newer",
        createdAt: "2026-10-20T10:00:00.000Z",
        backup: newerBackup,
      },
    ]);

    const engine = createMemoryRecoveryEngine({ storage });
    const result = await engine.recover();

    expect(result.status).toBe("recovered");
    expect(result.backupId).toBe("newer");
    expect(result.backup).toEqual(newerBackup);
  });

  test("raporton kur nuk ka backup-e", async () => {
    const storage = createStorageMock();
    const engine = createMemoryRecoveryEngine({ storage });

    const result = await engine.recover();

    expect(result.status).toBe("no_valid_backup");
    expect(result.recovered).toBe(false);
    expect(result.checked).toBe(0);
  });

  test("refuzon rikuperimin e një ID-je që mungon", async () => {
    const storage = createStorageMock();
    const engine = createMemoryRecoveryEngine({ storage });

    await expect(
      engine.recoverById("missing-backup")
    ).rejects.toMatchObject({
      code: "MEMORY_RECOVERY_BACKUP_NOT_FOUND",
    });
  });

  test("inspekton backup-et pa i ndryshuar", async () => {
    const storage = createStorageMock([
      {
        backupId: "backup-1",
        createdAt: "2026-10-20T10:00:00.000Z",
        backup: { id: "backup-1" },
      },
    ]);

    const engine = createMemoryRecoveryEngine({ storage });
    const result = await engine.inspect();

    expect(result.total).toBe(1);
    expect(result.valid).toBe(1);
    expect(result.invalid).toBe(0);
    expect(storage.get).not.toHaveBeenCalled();
  });
});
