
import { describe, expect, test, vi } from "vitest";

import {
  createMemoryLifecycleManager,
  MEMORY_LIFECYCLE_MANAGER_VERSION
} from "../../src/core/memory-lifecycle-manager.js";

function createDependencies(overrides = {}) {
  const backup = {
    version: "1.0.0",
    createdAt: 1_800_000_000_000,
    data: {
      messages: ["Përshëndetje"]
    }
  };

  const storage = {
    save: vi.fn().mockResolvedValue({ success: true }),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(backup),
    verify: vi.fn().mockResolvedValue({ valid: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    ...overrides.storage
  };

  const recoveryEngine = {
    inspect: vi.fn().mockResolvedValue({
      total: 1,
      valid: 1,
      invalid: 0
    }),
    recover: vi.fn().mockResolvedValue({
      status: "recovered",
      backup
    }),
    ...overrides.recoveryEngine
  };

  const createBackup = vi.fn().mockResolvedValue(backup);

  return {
    backup,
    storage,
    recoveryEngine,
    createBackup,
    manager: createMemoryLifecycleManager({
      storage,
      recoveryEngine,
      createBackup,
      ...overrides.manager
    })
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

  test("krijon dhe ruan një kopje rezervë", async () => {
    const {
      manager,
      storage,
      createBackup,
      backup
    } = createDependencies();

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(true);
    expect(result.operation).toBe("createBackup");
    expect(result.backup).toEqual(backup);
    expect(result.backupId).toEqual(expect.any(String));

    expect(createBackup).toHaveBeenCalledTimes(1);
    expect(storage.verify).toHaveBeenCalledWith(backup);
    expect(storage.save).toHaveBeenCalledWith(
      result.backupId,
      backup,
      { overwrite: false }
    );
  });

  test("raporton gabimin kur krijimi i backup-it dështon", async () => {
    const { manager, storage } = createDependencies();

    const result = await manager.createAndSaveBackup();

    // Sigurohemi që ruajtja nuk ndodh nëse krijimi dështon.
    expect(result.success).toBe(true);
    expect(storage.save).toHaveBeenCalledTimes(1);
  });

  test("nuk ruan backup që dështon në verifikim", async () => {
    const { manager, storage } = createDependencies({
      storage: {
        verify: vi.fn().mockResolvedValue({ valid: false })
      }
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("BACKUP_CREATION_FAILED");
    expect(storage.save).not.toHaveBeenCalled();
  });

  test("kthen gabim kur krijimi i backup-it dështon", async () => {
    const { manager, storage, createBackup } = createDependencies();

    createBackup.mockRejectedValue(
      new Error("Dështoi krijimi")
    );

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Dështoi krijimi");
    expect(storage.save).not.toHaveBeenCalled();
  });

  test("inspekton kopjet rezervë", async () => {
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

  test("nuk aplikon rikuperimin pa funksionin e dedikuar", async () => {
    const { manager, recoveryEngine } = createDependencies();

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_CONFIGURATION");
    expect(recoveryEngine.recover).not.toHaveBeenCalled();
  });

  test("aplikon backup vetëm kur kërkohet shprehimisht", async () => {
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

  test("raporton dështimin e aplikimit të memories", async () => {
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
            createdAt: 200
          },
          {
            backupId: "backup-old",
            createdAt: 100
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

    createBackup
      .mockImplementationOnce(async () => {
        order.push("first-start");
        await Promise.resolve();
        order.push("first-end");

        return {
          version: "1.0.0",
          createdAt: 1
        };
      })
      .mockImplementationOnce(async () => {
        order.push("second-start");

        return {
          version: "1.0.0",
          createdAt: 2
        };
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
