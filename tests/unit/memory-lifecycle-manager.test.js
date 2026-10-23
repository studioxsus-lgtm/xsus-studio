
import { describe, expect, test, vi } from "vitest";
import {
  createMemoryLifecycleManager,
  MEMORY_LIFECYCLE_MANAGER_VERSION
} from "../../src/core/memory-lifecycle-manager.js";
import { createMemoryBackup } from "../../src/core/memory-backup.js";

function createDependencies(overrides = {}) {
  const backup = createMemoryBackup(
    {
      schemaVersion: "1.0.0",
      session: {
        sessionId: "session-123",
        messages: [
          {
            role: "user",
            content: "Përshëndetje"
          }
        ]
      }
    },
    { sessionId: "session-123" }
  );

  const storedBackups = new Map([
    ["backup-123", backup]
  ]);

  const storage = {
    save: vi.fn(async (backupId, value) => {
      storedBackups.set(backupId, value);
      return { backupId, saved: true };
    }),

    list: vi.fn(async () =>
      [...storedBackups.entries()].map(([backupId, value]) => ({
        backupId,
        createdAt: value.createdAt,
        sessionId: value.sessionId,
        version: value.version
      }))
    ),

    get: vi.fn(async (backupId) =>
      storedBackups.get(backupId) ?? null
    ),

    verify: vi.fn(async (backupId) => ({
      valid: storedBackups.has(backupId),
      exists: storedBackups.has(backupId),
      backupId
    })),

    delete: vi.fn(async (backupId) =>
      storedBackups.delete(backupId)
    ),

    ...overrides.storage
  };

  const recoveryEngine = {
    inspect: vi.fn().mockResolvedValue({
      total: 1,
      valid: 1,
      invalid: 0,
      backups: []
    }),

    recover: vi.fn().mockResolvedValue({
      status: "recovered",
      recovered: true,
      backupId: "backup-123",
      backup,
      errors: []
    }),

    ...overrides.recoveryEngine
  };

  const createBackup = vi.fn().mockResolvedValue(backup);

  const manager = createMemoryLifecycleManager({
    storage,
    recoveryEngine,
    createBackup,
    ...overrides.manager
  });

  return {
    backup,
    storage,
    recoveryEngine,
    createBackup,
    manager
  };
}

describe("Memory Lifecycle Manager", () => {
  test("ka versionin e pritshëm", () => {
    const { manager } = createDependencies();

    expect(manager.version).toBe(
      MEMORY_LIFECYCLE_MANAGER_VERSION
    );
    expect(manager.version).toBe("1.0.0");
  });

  test("refuzon konfigurimin e pavlefshëm", () => {
    expect(() =>
      createMemoryLifecycleManager({})
    ).toThrow(TypeError);
  });

  test("krijon dhe ruan një backup", async () => {
    const { manager, storage, createBackup, backup } =
      createDependencies();

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(true);
    expect(result.operation).toBe("createBackup");
    expect(result.backup).toEqual(backup);
    expect(result.backupId).toEqual(expect.any(String));

    expect(createBackup).toHaveBeenCalledTimes(1);
    expect(storage.save).toHaveBeenCalledWith(
      result.backupId,
      backup,
      { overwrite: false }
    );

    expect(storage.verify).toHaveBeenCalledWith(
      result.backupId
    );
  });

  test("raporton dështimin gjatë krijimit të backup-it", async () => {
    const { manager, storage, createBackup } =
      createDependencies();

    createBackup.mockRejectedValue(
      new Error("Dështoi krijimi")
    );

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Dështoi krijimi");
    expect(storage.save).not.toHaveBeenCalled();
  });

  test("nuk ruan backup të pavlefshëm", async () => {
    const { manager, storage, createBackup } =
      createDependencies();

    createBackup.mockResolvedValue({
      format: "format-i-gabuar",
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      sessionId: null,
      checksum: "gabim",
      payload: {}
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(storage.save).not.toHaveBeenCalled();
  });

  test("raporton dështimin e ruajtjes", async () => {
    const { manager, storage } = createDependencies({
      storage: {
        save: vi.fn().mockRejectedValue(
          new Error("Dështoi ruajtja")
        )
      }
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("BACKUP_SAVE_FAILED");
  });

  test("nuk e pranon backup-in nëse verifikimi pas ruajtjes dështon", async () => {
    const { manager } = createDependencies({
      storage: {
        verify: vi.fn().mockResolvedValue({
          valid: false,
          exists: true
        })
      }
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
  });

  test("inspekton backup-et", async () => {
    const { manager, recoveryEngine } = createDependencies();

    const result = await manager.inspect();

    expect(result.success).toBe(true);
    expect(result.operation).toBe("inspect");
    expect(result.report.valid).toBe(1);
    expect(recoveryEngine.inspect).toHaveBeenCalledTimes(1);
  });

  test("rikuperon pa ndryshuar memorien aktive", async () => {
    const { manager, recoveryEngine } = createDependencies();

    const result = await manager.recover("backup-123");

    expect(result.success).toBe(true);
    expect(result.applied).toBe(false);
    expect(recoveryEngine.recover).toHaveBeenCalledWith({
      backupId: "backup-123"
    });
  });

  test("refuzon ID bosh për rikuperim", async () => {
    const { manager, recoveryEngine } = createDependencies();

    const result = await manager.recover(" ");

    expect(result.success).toBe(false);
    expect(recoveryEngine.recover).not.toHaveBeenCalled();
  });

  test("refuzon aplikimin pa funksion të dedikuar", async () => {
    const { manager, recoveryEngine } = createDependencies();

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_CONFIGURATION");
    expect(recoveryEngine.recover).not.toHaveBeenCalled();
  });

  test("aplikon backup-in vetëm kur kërkohet shprehimisht", async () => {
    const applyRecoveredMemory = vi.fn().mockResolvedValue(undefined);

    const {
      backup,
      storage,
      recoveryEngine,
      createBackup,
      manager
    } = createDependencies({
      manager: { applyRecoveredMemory }
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(true);
    expect(result.applied).toBe(true);
    expect(applyRecoveredMemory).toHaveBeenCalledWith(
      backup,
      expect.objectContaining({
        backupId: "backup-123"
      })
    );

    expect(storage.save).not.toHaveBeenCalled();
    expect(createBackup).not.toHaveBeenCalled();
    expect(recoveryEngine.recover).toHaveBeenCalledTimes(1);
  });

  test("raporton dështimin e aplikimit", async () => {
    const applyRecoveredMemory = vi.fn().mockRejectedValue(
      new Error("Aplikimi dështoi")
    );

    const { manager } = createDependencies({
      manager: { applyRecoveredMemory }
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("APPLY_FAILED");
  });

  test("jep statusin e backup-eve dhe politikës retention", async () => {
    const { manager, recoveryEngine } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue([
          {
            backupId: "backup-new",
            createdAt: "2026-10-21T12:00:00.000Z"
          },
          {
            backupId: "backup-old",
            createdAt: "2026-10-20T12:00:00.000Z"
          }
        ])
      }
    });

    const result = await manager.getStatus();

    expect(result.success).toBe(true);
    expect(result.backupCount).toBe(2);
    expect(result.newestBackup.backupId).toBe("backup-new");
    expect(result.oldestBackup.backupId).toBe("backup-old");
    expect(result.retention.enabled).toBe(false);
    expect(recoveryEngine.inspect).toHaveBeenCalledTimes(1);
  });

  test("nuk fshin backup-e automatikisht si parazgjedhje", async () => {
    const { manager, storage } = createDependencies();

    await manager.createAndSaveBackup();

    expect(storage.delete).not.toHaveBeenCalled();
  });

  test("serializon krijimet e backup-eve në të njëjtin manager", async () => {
    const order = [];
    const { manager, createBackup } = createDependencies();

    const firstBackup = createMemoryBackup({
      example: "first"
    });

    const secondBackup = createMemoryBackup({
      example: "second"
    });

    createBackup
      .mockImplementationOnce(async () => {
        order.push("first-start");
        await Promise.resolve();
        order.push("first-end");
        return firstBackup;
      })
      .mockImplementationOnce(async () => {
        order.push("second-start");
        return secondBackup;
      });

    const [first, second] = await Promise.all([
      manager.createAndSaveBackup(),
      manager.createAndSaveBackup()
    ]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(order.indexOf("first-end")).toBeLessThan(
      order.indexOf("second-start")
    );
  });
});
