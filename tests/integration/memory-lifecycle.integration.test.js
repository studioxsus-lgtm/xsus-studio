/**
 * XSUS AI Core — Memory Lifecycle Integration Tests
 * Version: 1.0.0
 *
 * Teston integrimin real të:
 * - Memory Backup
 * - Memory Backup Storage
 * - Memory Recovery Engine
 * - Memory Lifecycle Manager
 *
 * Shënim:
 * Përdor një direktori të përkohshme për të mos prekur
 * backup-et reale të projektit.
 */

import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createMemoryBackup
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

async function createTestEnvironment() {
  const directory = await mkdtemp(
    path.join(tmpdir(), "xsus-memory-lifecycle-")
  );

  temporaryDirectories.push(directory);

  const storage = createMemoryBackupStorage({
    filePath: path.join(directory, "backups.json")
  });

  const recoveryEngine = createMemoryRecoveryEngine({
    storage
  });

  const lifecycleManager = createMemoryLifecycleManager({
    storage,
    recoveryEngine,
    createBackup: async (metadata = {}) => {
      const sessionId = metadata.sessionId ?? "integration-session";

      return createMemoryBackup(
        {
          example: "XSUS AI Core integration test",
          messages: [
            {
              role: "user",
              content: "Përshëndetje XSUS AI"
            }
          ]
        },
        { sessionId }
      );
    }
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

describe("XSUS AI Core — Memory Lifecycle Integration", () => {
  test("krijon dhe ruan një backup real", async () => {
    const { lifecycleManager, storage } =
      await createTestEnvironment();

    const result = await lifecycleManager.createAndSaveBackup({
      sessionId: "integration-session"
    });

    expect(result.success).toBe(true);
    expect(result.operation).toBe("createBackup");
    expect(result.backupId).toEqual(expect.any(String));

    const savedBackup = await storage.get(result.backupId);

    expect(savedBackup).toEqual(result.backup);
  });

  test("verifikon integritetin e backup-it të ruajtur", async () => {
    const { lifecycleManager, storage } =
      await createTestEnvironment();

    const result = await lifecycleManager.createAndSaveBackup();

    expect(result.success).toBe(true);

    const verification = await storage.verify(result.backupId);

    expect(verification.valid).toBe(true);
    expect(verification.exists).toBe(true);
  });

  test("liston backup-et përmes Recovery Engine", async () => {
    const { lifecycleManager, recoveryEngine } =
      await createTestEnvironment();

    const created = await lifecycleManager.createAndSaveBackup();

    expect(created.success).toBe(true);

    const report = await recoveryEngine.inspect();

    expect(report.total).toBe(1);
    expect(report.valid).toBe(1);
    expect(report.invalid).toBe(0);
  });

  test("rikuperon një backup pa aplikuar ndryshime në memorien aktive", async () => {
    const { lifecycleManager } = await createTestEnvironment();

    const created = await lifecycleManager.createAndSaveBackup();

    expect(created.success).toBe(true);

    const recovered = await lifecycleManager.recover(
      created.backupId
    );

    expect(recovered.success).toBe(true);
    expect(recovered.operation).toBe("recover");
    expect(recovered.applied).toBe(false);
    expect(recovered.result.recovered).toBe(true);
    expect(recovered.result.backup).toEqual(created.backup);
  });

  test("rikthen backup-in vetëm kur është konfiguruar callback-u", async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "xsus-memory-apply-")
    );

    temporaryDirectories.push(directory);

    const storage = createMemoryBackupStorage({
      filePath: path.join(directory, "backups.json")
    });

    const recoveryEngine = createMemoryRecoveryEngine({
      storage
    });

    let appliedBackup = null;
    let appliedMetadata = null;

    const lifecycleManager = createMemoryLifecycleManager({
      storage,
      recoveryEngine,

      createBackup: async () =>
        createMemoryBackup(
          {
            example: "backup për testin e restore"
          },
          { sessionId: "apply-session" }
        ),

      applyRecoveredMemory: async (backup, metadata) => {
        appliedBackup = backup;
        appliedMetadata = metadata;
      }
    });

    const created = await lifecycleManager.createAndSaveBackup();

    expect(created.success).toBe(true);

    const result = await lifecycleManager.recoverAndApply(
      created.backupId
    );

    expect(result.success).toBe(true);
    expect(result.applied).toBe(true);
    expect(appliedBackup).toEqual(created.backup);
    expect(appliedMetadata.backupId).toBe(created.backupId);
  });

  test("refuzon rikuperimin kur backup-i nuk ekziston", async () => {
    const { lifecycleManager } = await createTestEnvironment();

    const result = await lifecycleManager.recover(
      "backup-nuk-ekziston"
    );

    expect(result.success).toBe(false);
    expect(result.operation).toBe("recover");
    expect(result.error.code).toBe("RECOVERY_FAILED");
  });

  test("raporton saktë gjendjen e backup-eve", async () => {
    const { lifecycleManager } = await createTestEnvironment();

    const first = await lifecycleManager.createAndSaveBackup();

    expect(first.success).toBe(true);

    const second = await lifecycleManager.createAndSaveBackup();

    expect(second.success).toBe(true);

    const status = await lifecycleManager.getStatus();

    expect(status.success).toBe(true);
    expect(status.operation).toBe("getStatus");
    expect(status.backupCount).toBe(2);
    expect(status.newestBackup).toBeDefined();
    expect(status.oldestBackup).toBeDefined();
    expect(status.retention.enabled).toBe(false);
  });

  test("nuk fshin backup-e kur retention është i çaktivizuar", async () => {
    const { lifecycleManager, storage } =
      await createTestEnvironment();

    const first = await lifecycleManager.createAndSaveBackup();
    const second = await lifecycleManager.createAndSaveBackup();

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);

    const backups = await storage.list();

    expect(backups).toHaveLength(2);
    expect(backups.map((item) => item.backupId)).toContain(
      first.backupId
    );
    expect(backups.map((item) => item.backupId)).toContain(
      second.backupId
    );
  });

  test("ruan backup-et në storage edhe pas krijimit të një instance të re", async () => {
    const directory = await mkdtemp(
      path.join(tmpdir(), "xsus-memory-persistence-")
    );

    temporaryDirectories.push(directory);

    const filePath = path.join(directory, "backups.json");

    const firstStorage = createMemoryBackupStorage({ filePath });

    const firstManager = createMemoryLifecycleManager({
      storage: firstStorage,
      recoveryEngine: createMemoryRecoveryEngine({
        storage: firstStorage
      }),
      createBackup: async () =>
        createMemoryBackup(
          { persistent: true },
          { sessionId: "persistent-session" }
        )
    });

    const created = await firstManager.createAndSaveBackup();

    expect(created.success).toBe(true);

    const secondStorage = createMemoryBackupStorage({ filePath });

    const secondRecoveryEngine = createMemoryRecoveryEngine({
      storage: secondStorage
    });

    const secondManager = createMemoryLifecycleManager({
      storage: secondStorage,
      recoveryEngine: secondRecoveryEngine,
      createBackup: async () =>
        createMemoryBackup({ unused: true })
    });

    const loaded = await secondStorage.get(created.backupId);
    const status = await secondManager.getStatus();

    expect(loaded).toEqual(created.backup);
    expect(status.success).toBe(true);
    expect(status.backupCount).toBe(1);
  });
});
