
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import { createMemoryBackupStorage } from "../../src/core/memory-backup-storage.js";
import {
  createMemoryBackupRecovery,
  MEMORY_BACKUP_RECOVERY_ERRORS,
} from "../../src/core/memory-backup-recovery.js";

describe("XSUS Memory Backup Recovery Integration", () => {
  let tempDirectory;

  async function setup() {
    tempDirectory = await mkdtemp(
      join(tmpdir(), "xsus-recovery-integration-")
    );

    const filePath = join(tempDirectory, "backups.json");
    const storage = createMemoryBackupStorage({ filePath });

    return { filePath, storage };
  }

  function makeBackup(sessionId = "session-001") {
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

  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
      tempDirectory = undefined;
    }
  });

  test("ruan, lexon, verifikon dhe rikthen backup-in nga disku", async () => {
    const { filePath, storage } = await setup();
    const backup = makeBackup();

    await storage.save("backup-001", backup);

    // Simulojmë një instancë të re pas ruajtjes.
    const newStorage = createMemoryBackupStorage({ filePath });
    const restoreSnapshot = vi.fn(async (snapshot) => ({
      restored: true,
      messageCount: snapshot.messages.length,
    }));

    const recovery = createMemoryBackupRecovery({
      storage: newStorage,
      restoreSnapshot,
      sessionExists: async () => false,
    });

    const inspection = await recovery.inspect("backup-001");

    expect(inspection).toMatchObject({
      version: "1.0.0",
      exists: true,
      valid: true,
      canRestore: true,
      sessionId: "session-001",
    });

    const result = await recovery.recover("backup-001");

    expect(result).toMatchObject({
      version: "1.0.0",
      backupId: "backup-001",
      success: true,
      sessionId: "session-001",
      result: {
        restored: true,
        messageCount: 2,
      },
    });

    expect(restoreSnapshot).toHaveBeenCalledTimes(1);
    expect(restoreSnapshot.mock.calls[0][0]).toEqual(backup.payload);
  });

  test("nuk rikthen backup që nuk ekziston", async () => {
    const { storage } = await setup();
    const restoreSnapshot = vi.fn();

    const recovery = createMemoryBackupRecovery({
      storage,
      restoreSnapshot,
    });

    await expect(
      recovery.recover("missing-backup")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.NOT_FOUND,
    });

    expect(restoreSnapshot).not.toHaveBeenCalled();
  });

  test("refuzon backup të ndryshuar pas ruajtjes", async () => {
    const { filePath, storage } = await setup();

    await storage.save("backup-tampered", makeBackup());

    // Ndryshojmë të dhënat në disk pa përditësuar checksum-in.
    const stored = JSON.parse(
      await (await import("node:fs/promises")).readFile(filePath, "utf8")
    );

    stored["backup-tampered"].payload.messages[0].content =
      "Përmbajtje e manipuluar";

    await writeFile(filePath, JSON.stringify(stored, null, 2), "utf8");

    const recovery = createMemoryBackupRecovery({
      storage: createMemoryBackupStorage({ filePath }),
      restoreSnapshot: vi.fn(),
    });

    await expect(
      recovery.recover("backup-tampered")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP,
    });
  });

  test("parandalon mbishkrimin e një sesioni ekzistues", async () => {
    const { storage } = await setup();

    await storage.save("backup-conflict", makeBackup("session-existing"));

    const restoreSnapshot = vi.fn();

    const recovery = createMemoryBackupRecovery({
      storage,
      restoreSnapshot,
      sessionExists: async () => true,
    });

    await expect(
      recovery.recover("backup-conflict")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.SESSION_CONFLICT,
    });

    expect(restoreSnapshot).not.toHaveBeenCalled();
  });

  test("lejon mbishkrimin vetëm kur autorizohet", async () => {
    const { storage } = await setup();

    await storage.save("backup-overwrite", makeBackup("session-existing"));

    const restoreSnapshot = vi.fn(async () => ({
      restored: true,
    }));

    const recovery = createMemoryBackupRecovery({
      storage,
      restoreSnapshot,
      sessionExists: async () => true,
    });

    const result = await recovery.recover("backup-overwrite", {
      allowOverwrite: true,
    });

    expect(result.success).toBe(true);
    expect(restoreSnapshot).toHaveBeenCalledTimes(1);
  });

  test("standardizon gabimet e callback-ut të rikthimit", async () => {
    const { storage } = await setup();

    await storage.save("backup-failure", makeBackup());

    const recovery = createMemoryBackupRecovery({
      storage,
      restoreSnapshot: async () => {
        throw new Error("Unexpected restore failure");
      },
    });

    await expect(
      recovery.recover("backup-failure")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.RESTORE_FAILED,
    });
  });

  test("nuk rikthen skedar JSON të dëmtuar", async () => {
    const { filePath, storage } = await setup();

    await storage.save("backup-001", makeBackup());
    await writeFile(filePath, "{ invalid json", "utf8");

    const recovery = createMemoryBackupRecovery({
      storage,
      restoreSnapshot: vi.fn(),
    });

    await expect(
      recovery.recover("backup-001")
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_RECOVERY_ERRORS.INVALID_BACKUP,
    });
  });
});
