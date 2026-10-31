import { describe, expect, test, vi } from "vitest";

import {
  createMemoryLifecycleManager,
  MEMORY_LIFECYCLE_MANAGER_VERSION,
  MEMORY_LIFECYCLE_ERRORS,
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
            content: "Përshëndetje",
          },
        ],
      },
    },
    { sessionId: "session-123" }
  );

  const storedBackups = new Map([
    ["backup-123", backup],
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
        version: value.version,
      }))
    ),

    get: vi.fn(async (backupId) =>
      storedBackups.get(backupId) ?? null
    ),

    verify: vi.fn(async (backupId) => ({
      valid: storedBackups.has(backupId),
      exists: storedBackups.has(backupId),
      backupId,
    })),

    delete: vi.fn(async (backupId) =>
      storedBackups.delete(backupId)
    ),

    ...overrides.storage,
  };

  const recoveryEngine = {
    inspect: vi.fn().mockResolvedValue({
      total: 1,
      valid: 1,
      invalid: 0,
      backups: [],
    }),

    recover: vi.fn().mockResolvedValue({
      status: "recovered",
      recovered: true,
      backupId: "backup-123",
      backup,
      errors: [],
    }),

    ...overrides.recoveryEngine,
  };

  const createBackup = vi.fn().mockResolvedValue(backup);

  const manager = createMemoryLifecycleManager({
    storage,
    recoveryEngine,
    createBackup,
    ...overrides.manager,
  });

  return {
    backup,
    storedBackups,
    storage,
    recoveryEngine,
    createBackup,
    manager,
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

  test.each([
    [
      "storage pa save",
      {
        storage: {
          save: undefined,
        },
      },
    ],
    [
      "storage pa list",
      {
        storage: {
          list: undefined,
        },
      },
    ],
    [
      "storage pa get",
      {
        storage: {
          get: undefined,
        },
      },
    ],
    [
      "storage pa verify",
      {
        storage: {
          verify: undefined,
        },
      },
    ],
    [
      "recoveryEngine pa inspect",
      {
        recoveryEngine: {
          inspect: undefined,
        },
      },
    ],
    [
      "recoveryEngine pa recover",
      {
        recoveryEngine: {
          recover: undefined,
        },
      },
    ],
    [
      "createBackup jo funksion",
      {
        createBackup: null,
      },
    ],
  ])("refuzon konfigurimin: %s", (_label, overrides) => {
    const dependencies = createDependencies();

    expect(() =>
      createMemoryLifecycleManager({
        storage: dependencies.storage,
        recoveryEngine: dependencies.recoveryEngine,
        createBackup: dependencies.createBackup,
        ...overrides,
      })
    ).toThrow(TypeError);
  });

  test.each([0, -1, 1.5, NaN, Infinity, "20"])(
    "refuzon maxBackups të pavlefshëm: %s",
    (maxBackups) => {
      const dependencies = createDependencies();

      expect(() =>
        createMemoryLifecycleManager({
          storage: dependencies.storage,
          recoveryEngine: dependencies.recoveryEngine,
          createBackup: dependencies.createBackup,
          maxBackups,
        })
      ).toThrow(TypeError);
    }
  );

  test("refuzon applyRecoveredMemory kur nuk është funksion", () => {
    const dependencies = createDependencies();

    expect(() =>
      createMemoryLifecycleManager({
        storage: dependencies.storage,
        recoveryEngine: dependencies.recoveryEngine,
        createBackup: dependencies.createBackup,
        applyRecoveredMemory: {},
      })
    ).toThrow(TypeError);
  });

  test("refuzon retention pa storage.delete", () => {
    const dependencies = createDependencies();

    expect(() =>
      createMemoryLifecycleManager({
        storage: {
          ...dependencies.storage,
          delete: undefined,
        },
        recoveryEngine: dependencies.recoveryEngine,
        createBackup: dependencies.createBackup,
        enableRetention: true,
      })
    ).toThrow(TypeError);
  });

  test("ekspozon API të ngrirë", () => {
    const { manager } = createDependencies();

    expect(Object.isFrozen(manager)).toBe(true);
    expect(typeof manager.createAndSaveBackup).toBe("function");
    expect(typeof manager.inspect).toBe("function");
    expect(typeof manager.recover).toBe("function");
    expect(typeof manager.recoverAndApply).toBe("function");
    expect(typeof manager.getStatus).toBe("function");
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

  test("kalon metadata te funksioni createBackup", async () => {
    const { manager, createBackup } = createDependencies();

    const metadata = {
      source: "unit-test",
      label: "backup-test",
    };

    await manager.createAndSaveBackup(metadata);

    expect(createBackup).toHaveBeenCalledWith(metadata);
  });

  test.each([null, [], "invalid", 123])(
    "refuzon metadata të pavlefshme: %s",
    async (metadata) => {
      const { manager, createBackup, storage } =
        createDependencies();

      const result = await manager.createAndSaveBackup(metadata);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED
      );
      expect(createBackup).not.toHaveBeenCalled();
      expect(storage.save).not.toHaveBeenCalled();
    }
  );

  test("raporton dështimin gjatë krijimit të backup-it", async () => {
    const { manager, storage, createBackup } =
      createDependencies();

    createBackup.mockRejectedValue(
      new Error("Dështoi krijimi")
    );

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Dështoi krijimi");
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  test("trajton gabime jo-Error gjatë krijimit", async () => {
    const { manager, createBackup } = createDependencies();

    createBackup.mockRejectedValue("Gabim i panjohur");

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Gabim i panjohur");
  });

  test.each([null, [], "invalid", 123])(
    "refuzon objekt backup të pavlefshëm: %s",
    async (invalidBackup) => {
      const { manager, createBackup, storage } =
        createDependencies();

      createBackup.mockResolvedValue(invalidBackup);

      const result = await manager.createAndSaveBackup();

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED
      );
      expect(storage.save).not.toHaveBeenCalled();
    }
  );

  test("nuk ruan backup të pavlefshëm", async () => {
    const { manager, storage, createBackup } =
      createDependencies();

    createBackup.mockResolvedValue({
      format: "format-i-gabuar",
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      sessionId: null,
      checksum: "gabim",
      payload: {},
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  test("refuzon ID backup bosh", async () => {
    const { manager, createBackup, storage } =
      createDependencies();

    createBackup.mockResolvedValue({
      ...createMemoryBackup({ example: "test" }),
      id: "valid-id",
    });

    const result = await manager.createAndSaveBackup({
      backupId: " ",
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.BACKUP_CREATION_FAILED
    );
    expect(storage.save).not.toHaveBeenCalled();
  });

  test("përdor metadata.backupId si identifikues me përparësi", async () => {
    const { manager, storage, backup } = createDependencies();

    const result = await manager.createAndSaveBackup({
      backupId: "custom-backup-id",
    });

    expect(result.success).toBe(true);
    expect(result.backupId).toBe("custom-backup-id");
    expect(storage.save).toHaveBeenCalledWith(
      "custom-backup-id",
      backup,
      { overwrite: false }
    );
  });

  test("raporton dështimin e ruajtjes", async () => {
    const { manager, storage } = createDependencies({
      storage: {
        save: vi.fn().mockRejectedValue(
          new Error("Dështoi ruajtja")
        ),
      },
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.BACKUP_SAVE_FAILED
    );
    expect(result.error.message).toBe("Dështoi ruajtja");
    expect(storage.verify).not.toHaveBeenCalled();
  });

  test.each([
    false,
    { valid: false },
    { valid: true, exists: false },
    { valid: true, success: false },
    null,
  ])(
    "refuzon verifikimin pas ruajtjes: %s",
    async (verification) => {
      const { manager } = createDependencies({
        storage: {
          verify: vi.fn().mockResolvedValue(verification),
        },
      });

      const result = await manager.createAndSaveBackup();

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        MEMORY_LIFECYCLE_ERRORS.BACKUP_SAVE_FAILED
      );
      expect(result.saved).toBe(true);
    }
  );

  test("raporton gabim nëse verifikimi pas ruajtjes hedh exception", async () => {
    const { manager } = createDependencies({
      storage: {
        verify: vi.fn().mockRejectedValue(
          new Error("Verifikimi dështoi")
        ),
      },
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.BACKUP_SAVE_FAILED
    );
    expect(result.error.message).toContain(
      "Verifikimi dështoi"
    );
    expect(result.saved).toBe(true);
  });

  test("inspekton backup-et", async () => {
    const { manager, recoveryEngine } = createDependencies();

    const result = await manager.inspect();

    expect(result.success).toBe(true);
    expect(result.operation).toBe("inspect");
    expect(result.report.valid).toBe(1);
    expect(recoveryEngine.inspect).toHaveBeenCalledTimes(1);
  });

  test("raporton dështimin e inspektimit", async () => {
    const { manager } = createDependencies({
      recoveryEngine: {
        inspect: vi.fn().mockRejectedValue(
          new Error("Inspektimi dështoi")
        ),
      },
    });

    const result = await manager.inspect();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.INSPECTION_FAILED
    );
    expect(result.error.message).toBe("Inspektimi dështoi");
  });

  test("rikuperon pa ndryshuar memorien aktive", async () => {
    const { manager, recoveryEngine } = createDependencies();

    const result = await manager.recover("backup-123");

    expect(result.success).toBe(true);
    expect(result.applied).toBe(false);
    expect(recoveryEngine.recover).toHaveBeenCalledWith({
      backupId: "backup-123",
    });
  });

  test.each([null, undefined, "", " "])(
    "refuzon ID të pavlefshme për rikuperim: %s",
    async (backupId) => {
      const { manager, recoveryEngine } = createDependencies();

      const result = await manager.recover(backupId);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED
      );
      expect(recoveryEngine.recover).not.toHaveBeenCalled();
    }
  );

  test("normalizon ID para rikuperimit", async () => {
    const { manager, recoveryEngine } = createDependencies();

    const result = await manager.recover("  backup-123  ");

    expect(result.success).toBe(true);
    expect(result.backupId).toBe("backup-123");
    expect(recoveryEngine.recover).toHaveBeenCalledWith({
      backupId: "backup-123",
    });
  });

  test.each([
    null,
    { success: false, message: "Dështoi" },
    { recovered: false, message: "Nuk u rikuperua" },
    { status: "error", message: "Gabim" },
    { status: "not_found", message: "Nuk u gjet" },
    { status: "no_valid_backup", message: "Pa backup" },
  ])(
    "trajton rezultat të pasuksesshëm të rikuperimit: %s",
    async (recoveryResult) => {
      const { manager } = createDependencies({
        recoveryEngine: {
          recover: vi.fn().mockResolvedValue(recoveryResult),
        },
      });

      const result = await manager.recover("backup-123");

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(
        MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED
      );
    }
  );

  test("raporton exception gjatë rikuperimit", async () => {
    const { manager } = createDependencies({
      recoveryEngine: {
        recover: vi.fn().mockRejectedValue(
          new Error("Rikuperimi dështoi")
        ),
      },
    });

    const result = await manager.recover("backup-123");

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Rikuperimi dështoi");
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
      manager,
    } = createDependencies({
      manager: { applyRecoveredMemory },
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(true);
    expect(result.applied).toBe(true);
    expect(applyRecoveredMemory).toHaveBeenCalledWith(
      backup,
      expect.objectContaining({
        backupId: "backup-123",
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
      manager: { applyRecoveredMemory },
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("APPLY_FAILED");
  });

  test("refuzon ID bosh në recoverAndApply", async () => {
    const applyRecoveredMemory = vi.fn();
    const { manager, recoveryEngine } = createDependencies({
      manager: { applyRecoveredMemory },
    });

    const result = await manager.recoverAndApply(" ");

    expect(result.success).toBe(false);
    expect(recoveryEngine.recover).not.toHaveBeenCalled();
    expect(applyRecoveredMemory).not.toHaveBeenCalled();
  });

  test("raporton exception gjatë rikuperimit për aplikim", async () => {
    const applyRecoveredMemory = vi.fn();

    const { manager } = createDependencies({
      manager: { applyRecoveredMemory },
      recoveryEngine: {
        recover: vi.fn().mockRejectedValue(
          new Error("Recovery exception")
        ),
      },
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED
    );
    expect(applyRecoveredMemory).not.toHaveBeenCalled();
  });

  test("nuk aplikon rezultat të pasuksesshëm të rikuperimit", async () => {
    const applyRecoveredMemory = vi.fn();

    const { manager } = createDependencies({
      manager: { applyRecoveredMemory },
      recoveryEngine: {
        recover: vi.fn().mockResolvedValue({
          success: false,
          message: "Backup i pavlefshëm",
        }),
      },
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(false);
    expect(applyRecoveredMemory).not.toHaveBeenCalled();
  });

  test("refuzon rikuperimin pa objekt backup", async () => {
    const applyRecoveredMemory = vi.fn();

    const { manager } = createDependencies({
      manager: { applyRecoveredMemory },
      recoveryEngine: {
        recover: vi.fn().mockResolvedValue({
          success: true,
          recovered: true,
          status: "recovered",
        }),
      },
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.RECOVERY_FAILED
    );
    expect(applyRecoveredMemory).not.toHaveBeenCalled();
  });

  test("pranon backup nga recovery.data.backup", async () => {
    const applyRecoveredMemory = vi.fn();

    const backup = createMemoryBackup({
      example: "recovered",
    });

    const { manager } = createDependencies({
      manager: { applyRecoveredMemory },
      recoveryEngine: {
        recover: vi.fn().mockResolvedValue({
          success: true,
          data: { backup },
        }),
      },
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(true);
    expect(applyRecoveredMemory).toHaveBeenCalledWith(
      backup,
      expect.any(Object)
    );
  });

  test("pranon backup nga recovery.result.backup", async () => {
    const applyRecoveredMemory = vi.fn();

    const backup = createMemoryBackup({
      example: "recovered",
    });

    const { manager } = createDependencies({
      manager: { applyRecoveredMemory },
      recoveryEngine: {
        recover: vi.fn().mockResolvedValue({
          success: true,
          result: { backup },
        }),
      },
    });

    const result = await manager.recoverAndApply("backup-123");

    expect(result.success).toBe(true);
    expect(applyRecoveredMemory).toHaveBeenCalledWith(
      backup,
      expect.any(Object)
    );
  });

  test("jep statusin e backup-eve dhe politikës retention", async () => {
    const { manager, recoveryEngine } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue([
          {
            backupId: "backup-new",
            createdAt: "2026-10-21T12:00:00.000Z",
          },
          {
            backupId: "backup-old",
            createdAt: "2026-10-20T12:00:00.000Z",
          },
        ]),
      },
    });

    const result = await manager.getStatus();

    expect(result.success).toBe(true);
    expect(result.backupCount).toBe(2);
    expect(result.newestBackup.backupId).toBe("backup-new");
    expect(result.oldestBackup.backupId).toBe("backup-old");
    expect(result.retention.enabled).toBe(false);
    expect(recoveryEngine.inspect).toHaveBeenCalledTimes(1);
  });

  test("trajton listën bosh të backup-eve", async () => {
    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue([]),
      },
    });

    const result = await manager.getStatus();

    expect(result.success).toBe(true);
    expect(result.backupCount).toBe(0);
    expect(result.newestBackup).toBeNull();
    expect(result.oldestBackup).toBeNull();
  });

  test("pranon backup list të mbështjellë në property backups", async () => {
    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue({
          backups: [
            {
              backupId: "backup-a",
              createdAt: "2026-10-21T12:00:00.000Z",
            },
          ],
        }),
      },
    });

    const result = await manager.getStatus();

    expect(result.success).toBe(true);
    expect(result.backupCount).toBe(1);
    expect(result.newestBackup.backupId).toBe("backup-a");
  });

  test("pranon backup list të mbështjellë në property items", async () => {
    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue({
          items: [
            {
              id: "backup-item",
              metadata: {
                createdAt: "2026-10-21T12:00:00.000Z",
              },
            },
          ],
        }),
      },
    });

    const result = await manager.getStatus();

    expect(result.success).toBe(true);
    expect(result.backupCount).toBe(1);
    expect(result.newestBackup.id).toBe("backup-item");
  });

  test("raporton gabimin e getStatus", async () => {
    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockRejectedValue(
          new Error("Storage unavailable")
        ),
      },
    });

    const result = await manager.getStatus();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.INSPECTION_FAILED
    );
    expect(result.error.message).toBe("Storage unavailable");
  });

  test("raporton gabimin e inspect brenda getStatus", async () => {
    const { manager } = createDependencies({
      recoveryEngine: {
        inspect: vi.fn().mockRejectedValue(
          new Error("Inspection unavailable")
        ),
      },
    });

    const result = await manager.getStatus();

    expect(result.success).toBe(false);
    expect(result.error.message).toBe(
      "Inspection unavailable"
    );
  });

  test("nuk fshin backup-e automatikisht si parazgjedhje", async () => {
    const { manager, storage } = createDependencies();

    await manager.createAndSaveBackup();

    expect(storage.delete).not.toHaveBeenCalled();
  });

  test("aplikon retention dhe ruan numrin maksimal të backup-eve", async () => {
    const deleteBackup = vi.fn().mockResolvedValue(true);

    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue([
          {
            backupId: "newest",
            createdAt: "2026-10-23T12:00:00.000Z",
          },
          {
            backupId: "middle",
            createdAt: "2026-10-22T12:00:00.000Z",
          },
          {
            backupId: "oldest",
            createdAt: "2026-10-20T12:00:00.000Z",
          },
        ]),
        delete: deleteBackup,
      },
      manager: {
        enableRetention: true,
        maxBackups: 2,
      },
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(true);
    expect(result.retention.enabled).toBe(true);
    expect(result.retention.deleted).toEqual(["oldest"]);
    expect(result.retention.retained).toBe(2);
    expect(deleteBackup).toHaveBeenCalledWith("oldest");
  });

  test("mbështet ID backup të tipit string gjatë retention", async () => {
    const deleteBackup = vi.fn().mockResolvedValue(true);

    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue([
          "newest",
          "oldest",
        ]),
        delete: deleteBackup,
      },
      manager: {
        enableRetention: true,
        maxBackups: 1,
      },
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(true);
    expect(deleteBackup).toHaveBeenCalledWith("oldest");
  });

  test("anashkalon elementet pa ID të vlefshme gjatë retention", async () => {
    const deleteBackup = vi.fn().mockResolvedValue(true);

    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue([
          {
            backupId: "newest",
            createdAt: "2026-10-23T12:00:00.000Z",
          },
          {
            createdAt: "2026-10-22T12:00:00.000Z",
          },
          {
            backupId: " ",
            createdAt: "2026-10-21T12:00:00.000Z",
          },
        ]),
        delete: deleteBackup,
      },
      manager: {
        enableRetention: true,
        maxBackups: 1,
      },
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(true);
    expect(deleteBackup).not.toHaveBeenCalled();
  });

  test("llogarit backup-et e mbajtura kur fshirja dështon", async () => {
    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockResolvedValue([
          {
            backupId: "newest",
            createdAt: "2026-10-23T12:00:00.000Z",
          },
          {
            backupId: "oldest",
            createdAt: "2026-10-20T12:00:00.000Z",
          },
        ]),
        delete: vi.fn().mockResolvedValue(false),
      },
      manager: {
        enableRetention: true,
        maxBackups: 1,
      },
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(true);
    expect(result.retention.deleted).toEqual([]);
    expect(result.retention.retained).toBe(2);
  });

  test("raporton dështimin e retention", async () => {
    const { manager } = createDependencies({
      storage: {
        list: vi.fn().mockRejectedValue(
          new Error("Retention list failed")
        ),
      },
      manager: {
        enableRetention: true,
      },
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe(
      MEMORY_LIFECYCLE_ERRORS.RETENTION_FAILED
    );
    expect(result.saved).toBe(true);
  });

  test("serializon krijimet e backup-eve në të njëjtin manager", async () => {
    const order = [];
    const { manager, createBackup } = createDependencies();

    const firstBackup = createMemoryBackup({
      example: "first",
    });

    const secondBackup = createMemoryBackup({
      example: "second",
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
      manager.createAndSaveBackup(),
    ]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(order.indexOf("first-end")).toBeLessThan(
      order.indexOf("second-start")
    );
  });

  test("serializon edhe operacionet e rikuperimit", async () => {
    const order = [];

    const { manager, recoveryEngine } = createDependencies({
      recoveryEngine: {
        recover: vi.fn().mockImplementation(async () => {
          order.push("recover-start");
          await Promise.resolve();
          order.push("recover-end");

          return {
            success: true,
            recovered: true,
            status: "recovered",
            backup: createMemoryBackup({
              example: "recovered",
            }),
          };
        }),
      },
    });

    const applyRecoveredMemory = vi.fn();

    const configuredManager = createMemoryLifecycleManager({
      storage: createDependencies().storage,
      recoveryEngine,
      createBackup: vi.fn(),
      applyRecoveredMemory,
    });

    await Promise.all([
      configuredManager.recoverAndApply("backup-a"),
      configuredManager.recoverAndApply("backup-b"),
    ]);

    expect(order).toEqual([
      "recover-start",
      "recover-end",
      "recover-start",
      "recover-end",
    ]);
  });
});
