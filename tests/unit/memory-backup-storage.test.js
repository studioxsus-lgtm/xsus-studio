
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  createMemoryBackupStorage,
  MEMORY_BACKUP_STORAGE_ERRORS,
} from "../../src/core/memory-backup-storage.js";

import { createMemoryBackup } from "../../src/core/memory-backup.js";

describe("XSUS AI Core — Memory Backup Storage", () => {
  let directories = [];

  async function createStorage() {
    const directory = await mkdtemp(
      path.join(tmpdir(), "xsus-backup-storage-")
    );

    directories.push(directory);

    const filePath = path.join(directory, "backups.json");

    return {
      filePath,
      storage: createMemoryBackupStorage({ filePath }),
    };
  }

  function createSnapshot(sessionId = "session-1") {
    return {
      sessionId,
      messages: [
        {
          role: "user",
          content: "Përshëndetje XSUS AI",
          timestamp: "2026-10-22T10:00:00.000Z",
        },
      ],
    };
  }

  function createBackup(sessionId = "session-1") {
    return createMemoryBackup(createSnapshot(sessionId), { sessionId });
  }

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );

    directories = [];
  });

  test("ruan dhe lexon një backup", async () => {
    const { storage } = await createStorage();
    const backup = createBackup();

    await expect(storage.save("backup-1", backup)).resolves.toEqual({
      backupId: "backup-1",
      saved: true,
    });

    await expect(storage.get("backup-1")).resolves.toEqual(backup);
  });

  test("kthen null kur backup-i nuk ekziston", async () => {
    const { storage } = await createStorage();

    await expect(storage.get("missing")).resolves.toBeNull();
  });

  test("refuzon mbishkrimin pa autorizim", async () => {
    const { storage } = await createStorage();
    const originalBackup = createBackup();

    await storage.save("backup-1", originalBackup);

    await expect(
      storage.save("backup-1", createBackup("session-2"))
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CONFLICT,
    });

    await expect(storage.get("backup-1")).resolves.toEqual(
      originalBackup
    );
  });

  test("lejon mbishkrimin kur autorizohet shprehimisht", async () => {
    const { storage } = await createStorage();
    const originalBackup = createBackup();
    const replacement = createBackup("session-2");

    await storage.save("backup-1", originalBackup);

    await storage.save("backup-1", replacement, {
      overwrite: true,
    });

    await expect(storage.get("backup-1")).resolves.toEqual(
      replacement
    );
  });

  test("refuzon backup me checksum të pavlefshëm", async () => {
    const { storage } = await createStorage();
    const backup = createBackup();

    backup.payload.messages[0].content = "Të dhëna të ndryshuara";

    await expect(
      storage.save("invalid-backup", backup)
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.INVALID_BACKUP,
    });
  });

  test("refuzon ID bosh", async () => {
    const { storage } = await createStorage();

    await expect(
      storage.save("   ", createBackup())
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.INVALID_ID,
    });
  });

  test("verifikon backup ekzistues", async () => {
    const { storage } = await createStorage();

    await storage.save("backup-1", createBackup());

    await expect(storage.verify("backup-1")).resolves.toMatchObject({
      valid: true,
      exists: true,
      backupId: "backup-1",
    });
  });

  test("raporton backup që mungon gjatë verifikimit", async () => {
    const { storage } = await createStorage();

    await expect(storage.verify("missing")).resolves.toMatchObject({
      valid: false,
      exists: false,
      backupId: "missing",
    });
  });

  test("liston backup-et e ruajtura", async () => {
    const { storage } = await createStorage();

    await storage.save("backup-1", createBackup("session-1"));
    await storage.save("backup-2", createBackup("session-2"));

    const backups = await storage.list();

    expect(backups).toHaveLength(2);
    expect(backups.map((item) => item.backupId).sort()).toEqual([
      "backup-1",
      "backup-2",
    ]);
  });

  test("fshin vetëm backup-in e kërkuar", async () => {
    const { storage } = await createStorage();
    const backup1 = createBackup("session-1");
    const backup2 = createBackup("session-2");

    await storage.save("backup-1", backup1);
    await storage.save("backup-2", backup2);

    await expect(storage.delete("backup-1")).resolves.toBe(true);
    await expect(storage.delete("backup-1")).resolves.toBe(false);

    await expect(storage.get("backup-1")).resolves.toBeNull();
    await expect(storage.get("backup-2")).resolves.toEqual(backup2);
  });

  test("rikthen backup pas krijimit të një instance të re", async () => {
    const { filePath, storage } = await createStorage();
    const backup = createBackup();

    await storage.save("backup-1", backup);

    const restartedStorage = createMemoryBackupStorage({ filePath });

    await expect(restartedStorage.get("backup-1")).resolves.toEqual(
      backup
    );
  });

  test("ruan backup-et nga shkrimet e njëpasnjëshme brenda një instance", async () => {
    const { storage } = await createStorage();

    const backups = [
      createBackup("session-1"),
      createBackup("session-2"),
      createBackup("session-3"),
    ];

    await Promise.all([
      storage.save("backup-1", backups[0]),
      storage.save("backup-2", backups[1]),
      storage.save("backup-3", backups[2]),
    ]);

    const storedBackups = await storage.list();

    expect(storedBackups).toHaveLength(3);
    await expect(storage.get("backup-1")).resolves.toEqual(backups[0]);
    await expect(storage.get("backup-2")).resolves.toEqual(backups[1]);
    await expect(storage.get("backup-3")).resolves.toEqual(backups[2]);
  });

  test("kthen statistikat e storage-it", async () => {
    const { filePath, storage } = await createStorage();

    await storage.save("backup-1", createBackup());

    await expect(storage.getStats()).resolves.toMatchObject({
      version: "1.1.0",
      entries: 1,
      filePath,
    });
  });
});
