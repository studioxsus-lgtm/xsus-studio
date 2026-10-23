/**
 * XSUS AI Core — Memory Lifecycle Hardening Tests
 * Version: 1.1.0
 *
 * Qëllimet:
 * - Refuzimi i backup-eve të pavlefshme.
 * - Mbrojtja nga ID bosh ose të pavlefshme.
 * - Siguria e memories aktive gjatë rikuperimit.
 * - Kontrolli i dështimeve të storage.
 * - Kontrolli i retention.
 * - Serializimi i krijimit të backup-eve.
 */

import {
  afterEach,
  describe,
  expect,
  test,
  vi
} from "vitest";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createMemoryBackup,
  verifyMemoryBackup
} from "../../src/core/memory-backup.js";

import {
  createMemoryBackupStorage
} from "../../src/core/memory-backup-storage.js";

import {
  createMemoryRecoveryEngine
} from "../../src/core/memory-recovery-engine.js";

import {
  createMemoryLifecycleManager
} from "../../src/core/memory-lifecycle-manager.js";

const temporaryDirectories = [];

async function createEnvironment(options = {}) {
  const directory = await mkdtemp(
    path.join(tmpdir(), "xsus-memory-hardening-")
  );

  temporaryDirectories.push(directory);

  const storage = createMemoryBackupStorage({
    filePath: path.join(directory, "backups.json")
  });

  const recoveryEngine = createMemoryRecoveryEngine({ storage });

  const createBackup = options.createBackup ?? (async () =>
    createMemoryBackup(
      {
        example: "XSUS AI security test",
        messages: [
          {
            role: "user",
            content: "Test i memories"
          }
        ]
      },
      { sessionId: "hardening-session" }
    ));

  const lifecycleManager = createMemoryLifecycleManager({
    storage,
    recoveryEngine,
    createBackup,
    ...(options.applyRecoveredMemory
      ? { applyRecoveredMemory: options.applyRecoveredMemory }
      : {}),
    ...(options.enableRetention !== undefined
      ? { enableRetention: options.enableRetention }
      : {}),
    ...(options.maxBackups !== undefined
      ? { maxBackups: options.maxBackups }
      : {})
  });

  return {
    directory,
    storage,
    recoveryEngine,
    lifecycleManager
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("XSUS AI Core — Memory Lifecycle Hardening", () => {
  test("backup i krijuar ka integritet të vlefshëm", async () => {
    const { lifecycleManager } = await createEnvironment();

    const result = await lifecycleManager.createAndSaveBackup();

    expect(result.success).toBe(true);
    expect(verifyMemoryBackup(result.backup).valid).toBe(true);
  });

  test("refuzon backup-in me format të pavlefshëm", async () => {
    const { storage, recoveryEngine } = await createEnvironment();

    const invalidBackup = {
      format: "format-i-gabuar",
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      sessionId: null,
      checksum: "checksum-i-gabuar",
      payload: {}
    };

    const manager = createMemoryLifecycleManager({
      storage,
      recoveryEngine,
      createBackup: async () => invalidBackup
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("BACKUP_CREATION_FAILED");
    expect(await storage.list()).toHaveLength(0);
  });

  test("refuzon backup-in e manipuluar pas krijimit", async () => {
    const { storage, recoveryEngine } = await createEnvironment();

    const manager = createMemoryLifecycleManager({
      storage,
      recoveryEngine,
      createBackup: async () => {
        const backup = createMemoryBackup(
          { message: "origjinale" },
          { sessionId: "tamper-session" }
        );

        return {
          ...backup,
          payload: { message: "e manipuluar" }
        };
      }
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("BACKUP_CREATION_FAILED");
    expect(await storage.list()).toHaveLength(0);
  });

  test("refuzon ID bosh gjatë rikuperimit", async () => {
    const { lifecycleManager, recoveryEngine } =
      await createEnvironment();

    const recoverSpy = vi.spyOn(recoveryEngine, "recover");

    const result = await lifecycleManager.recover("   ");

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("RECOVERY_FAILED");
    expect(recoverSpy).not.toHaveBeenCalled();
  });

  test("nuk aplikon backup pa callback të konfiguruar", async () => {
    const { lifecycleManager } = await createEnvironment();

    const created = await lifecycleManager.createAndSaveBackup();

    expect(created.success).toBe(true);

    const result = await lifecycleManager.recoverAndApply(
      created.backupId
    );

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_CONFIGURATION");
  });

  test("nuk aplikon memorien nëse rikuperimi dështon", async () => {
    const applyRecoveredMemory = vi.fn();

    const { storage } = await createEnvironment();

    const recoveryEngine = {
      inspect: vi.fn().mockResolvedValue({
        total: 0,
        valid: 0,
        invalid: 0,
        backups: []
      }),
      recover: vi.fn().mockResolvedValue({
        status: "no_valid_backup",
        recovered: false,
        errors: ["Nuk u gjet backup i vlefshëm"]
      })
    };

    const manager = createMemoryLifecycleManager({
      storage,
      recoveryEngine,
      createBackup: async () =>
        createMemoryBackup({ message: "test" }),
      applyRecoveredMemory
    });

    const result = await manager.recoverAndApply("missing-backup");

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("RECOVERY_FAILED");
    expect(applyRecoveredMemory).not.toHaveBeenCalled();
  });

  test("raporton dështimin e storage gjatë ruajtjes", async () => {
    const { storage, recoveryEngine } = await createEnvironment();

    const saveSpy = vi
      .spyOn(storage, "save")
      .mockRejectedValue(new Error("Disku nuk është i disponueshëm"));

    const manager = createMemoryLifecycleManager({
      storage,
      recoveryEngine,
      createBackup: async () =>
        createMemoryBackup({ message: "test ruajtjeje" })
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("BACKUP_SAVE_FAILED");
    expect(result.error.message).toContain(
      "Disku nuk është i disponueshëm"
    );

    saveSpy.mockRestore();
  });

  test("verifikon backup-in pas ruajtjes", async () => {
    const { storage, recoveryEngine } = await createEnvironment();

    const verifySpy = vi
      .spyOn(storage, "verify")
      .mockResolvedValue({
        valid: false,
        exists: true,
        errors: ["integritet i pavlefshëm"]
      });

    const manager = createMemoryLifecycleManager({
      storage,
      recoveryEngine,
      createBackup: async () =>
        createMemoryBackup({ message: "post-save verification" })
    });

    const result = await manager.createAndSaveBackup();

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("BACKUP_SAVE_FAILED");
    expect(verifySpy).toHaveBeenCalledWith(result.backupId);

    verifySpy.mockRestore();
  });

  test("nuk fshin backup-e automatikisht kur retention është çaktivizuar", async () => {
    const { lifecycleManager, storage } = await createEnvironment();

    const deleteSpy = vi.spyOn(storage, "delete");

    const first = await lifecycleManager.createAndSaveBackup();
    const second = await lifecycleManager.createAndSaveBackup();

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(deleteSpy).not.toHaveBeenCalled();

    deleteSpy.mockRestore();
  });

  test("serializon krijimet paralele të backup-eve", async () => {
    const order = [];
    let callCount = 0;

    const createBackup = async () => {
      callCount += 1;
      const current = callCount;

      order.push(`start-${current}`);

      await Promise.resolve();

      order.push(`end-${current}`);

      return createMemoryBackup({
        sequence: current
      });
    };

    const { lifecycleManager } = await createEnvironment({
      createBackup
    });

    const [first, second] = await Promise.all([
      lifecycleManager.createAndSaveBackup(),
      lifecycleManager.createAndSaveBackup()
    ]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    expect(order.indexOf("end-1")).toBeLessThan(
      order.indexOf("start-2")
    );
  });

  test("ruan backup-et pas rindërtimit të storage nga i njëjti skedar", async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "xsus-memory-reopen-")
    );

    temporaryDirectories.push(directory);

    const filePath = path.join(directory, "backups.json");

    const storage1 = createMemoryBackupStorage({ filePath });
    const recovery1 = createMemoryRecoveryEngine({
      storage: storage1
    });

    const manager1 = createMemoryLifecycleManager({
      storage: storage1,
      recoveryEngine: recovery1,
      createBackup: async () =>
        createMemoryBackup(
          { durable: true },
          { sessionId: "durable-session" }
        )
    });

    const created = await manager1.createAndSaveBackup();

    expect(created.success).toBe(true);

    const storage2 = createMemoryBackupStorage({ filePath });
    const loaded = await storage2.get(created.backupId);

    expect(loaded).toEqual(created.backup);
    expect((await storage2.verify(created.backupId)).valid).toBe(true);
  });
});
