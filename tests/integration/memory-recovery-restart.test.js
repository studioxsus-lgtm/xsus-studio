
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createMemoryBackup,
  verifyMemoryBackup,
} from "../../src/core/memory-backup.js";

import {
  createMemoryBackupStorage,
  MEMORY_BACKUP_STORAGE_ERRORS,
} from "../../src/core/memory-backup-storage.js";

import {
  createMemoryRecoveryEngine,
  MEMORY_RECOVERY_ERRORS,
} from "../../src/core/memory-recovery-engine.js";

describe("XSUS AI Core — Memory Recovery After Restart", () => {
  let temporaryDirectories = [];

  async function createEnvironment() {
    const directory = await mkdtemp(
      join(tmpdir(), "xsus-memory-restart-")
    );

    temporaryDirectories.push(directory);

    const filePath = join(directory, "backups.json");

    return {
      directory,
      filePath,
      storage: createMemoryBackupStorage({ filePath }),
    };
  }

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );

    temporaryDirectories = [];
  });

  function createSampleBackup() {
    return createMemoryBackup(
      {
        schemaVersion: "1.0.0",
        sessionId: "session-restart-001",
        messages: [
          { role: "user", content: "Përshëndetje XSUS AI" },
          { role: "assistant", content: "Përshëndetje! Si mund të ndihmoj?" },
        ],
        metadata: {
          language: "sq",
          source: "restart-integration-test",
        },
      },
      { sessionId: "session-restart-001" }
    );
  }

  test("ruan backup-in në një skedar JSON real", async () => {
    const { filePath, storage } = await createEnvironment();
    const backup = createSampleBackup();

    const result = await storage.save("backup-001", backup);

    expect(result).toEqual({
      backupId: "backup-001",
      saved: true,
    });

    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    expect(parsed["backup-001"]).toEqual(backup);
    expect(verifyMemoryBackup(parsed["backup-001"]).valid).toBe(true);
  });

  test("rikuperon backup-in përmes një instance të re storage-i", async () => {
    const { filePath, storage } = await createEnvironment();
    const backup = createSampleBackup();

    await storage.save("backup-002", backup);

    // Simulon rinisjen duke krijuar instanca të reja.
    const restartedStorage = createMemoryBackupStorage({ filePath });
    const recovery = createMemoryRecoveryEngine({
      storage: restartedStorage,
    });

    const result = await recovery.recover({
      backupId: "backup-002",
    });

    expect(result.status).toBe("recovered");
    expect(result.recovered).toBe(true);
    expect(result.backupId).toBe("backup-002");
    expect(result.backup).toEqual(backup);
    expect(verifyMemoryBackup(result.backup).valid).toBe(true);
  });

  test("ruan mesazhet dhe metadata-n pa ndryshime", async () => {
    const { filePath, storage } = await createEnvironment();
    const backup = createSampleBackup();

    await storage.save("backup-003", backup);

    const restartedStorage = createMemoryBackupStorage({ filePath });
    const recovered = await restartedStorage.get("backup-003");

    expect(recovered.payload.messages).toEqual(
      backup.payload.messages
    );
    expect(recovered.payload.metadata).toEqual(
      backup.payload.metadata
    );
    expect(recovered.sessionId).toBe("session-restart-001");
    expect(recovered.checksum).toBe(backup.checksum);
  });

  test("raporton mungesën e backup-it të kërkuar", async () => {
    const { storage } = await createEnvironment();
    const recovery = createMemoryRecoveryEngine({ storage });

    await expect(
      recovery.recover({ backupId: "missing-backup" })
    ).rejects.toMatchObject({
      code: MEMORY_RECOVERY_ERRORS.BACKUP_NOT_FOUND,
    });
  });

  test("nuk rikuperon një backup me checksum të dëmtuar", async () => {
    const { filePath, storage } = await createEnvironment();
    const backup = createSampleBackup();

    await storage.save("backup-004", backup);

    // Simulon dëmtim të të dhënave në disk.
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    parsed["backup-004"].payload.messages[0].content =
      "Përmbajtje e ndryshuar pa përditësuar checksum-in";

    await writeFile(filePath, JSON.stringify(parsed), "utf8");

    const restartedStorage = createMemoryBackupStorage({ filePath });
    const verification = await restartedStorage.verify("backup-004");

    expect(verification.exists).toBe(true);
    expect(verification.valid).toBe(false);

    const recovery = createMemoryRecoveryEngine({
      storage: restartedStorage,
    });

    await expect(
      recovery.recover({ backupId: "backup-004" })
    ).rejects.toMatchObject({
      code: MEMORY_RECOVERY_ERRORS.VERIFICATION_FAILED,
    });
  });

  test("raporton JSON të dëmtuar në skedarin e storage-it", async () => {
    const { filePath, storage } = await createEnvironment();

    await storage.save("backup-005", createSampleBackup());
    await writeFile(filePath, '{"backup-005":', "utf8");

    await expect(storage.list()).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
    });
  });

  test("rikuperimi i fundit i vlefshëm dështon në mënyrë të kontrolluar kur skedari është bosh", async () => {
    const { storage } = await createEnvironment();
    const recovery = createMemoryRecoveryEngine({ storage });

    const result = await recovery.recover();

    expect(result.status).toBe("no_valid_backup");
    expect(result.recovered).toBe(false);
    expect(result.backupId).toBeNull();
    expect(result.checked).toBe(0);
  });
});
