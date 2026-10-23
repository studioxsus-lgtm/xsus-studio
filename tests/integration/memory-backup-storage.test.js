import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import {
  createMemoryBackupStorage,
  MEMORY_BACKUP_STORAGE_ERRORS,
} from "../../src/core/memory-backup-storage.js";

describe("XSUS Persistent Memory Backup Storage", () => {
  let temporaryDirectories = [];

  async function createTestStorage() {
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), "xsus-backup-storage-")
    );

    temporaryDirectories.push(temporaryDirectory);

    const filePath = join(temporaryDirectory, "backups.json");

    return {
      filePath,
      storage: createMemoryBackupStorage({ filePath }),
      storageFactory: () => createMemoryBackupStorage({ filePath }),
    };
  }

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

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );

    temporaryDirectories = [];
  });

  test("ruan backup-in në skedar JSON", async () => {
    const { filePath, storage } = await createTestStorage();
    const backup = createTestBackup();

    const result = await storage.save("backup-001", backup);

    expect(result).toEqual({
      backupId: "backup-001",
      saved: true,
    });

    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    expect(parsed["backup-001"]).toEqual(backup);
  });

  test("rikthen backup-in nga një instancë e re", async () => {
    const { filePath, storage } = await createTestStorage();
    const backup = createTestBackup("session-recovery");

    await storage.save("recovery-001", backup);

    const newStorage = createMemoryBackupStorage({ filePath });

    await expect(newStorage.get("recovery-001")).resolves.toEqual(backup);
  });

  test("kthen null kur backup-i nuk ekziston", async () => {
    const { storage } = await createTestStorage();

    await expect(storage.get("missing-backup")).resolves.toBeNull();
  });

  test("refuzon mbishkrimin pa leje", async () => {
    const { storage } = await createTestStorage();
    const original = createTestBackup("session-original");

    await storage.save("backup-001", original);

    await expect(
      storage.save("backup-001", createTestBackup("session-002"))
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CONFLICT,
    });

    await expect(storage.get("backup-001")).resolves.toEqual(original);
  });

  test("lejon mbishkrimin vetëm kur kërkohet shprehimisht", async () => {
    const { storage } = await createTestStorage();

    await storage.save("backup-001", createTestBackup("old-session"));

    const replacement = createTestBackup("new-session");

    await storage.save("backup-001", replacement, {
      overwrite: true,
    });

    await expect(storage.get("backup-001")).resolves.toEqual(replacement);
  });

  test("liston backup-et dhe statistikat", async () => {
    const { storage } = await createTestStorage();

    await storage.save("backup-a", createTestBackup("session-a"));
    await storage.save("backup-b", createTestBackup("session-b"));

    const items = await storage.list();
    const stats = await storage.getStats();

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.backupId).sort()).toEqual([
      "backup-a",
      "backup-b",
    ]);

    expect(stats.entries).toBe(2);
    expect(stats.version).toBe("1.2.0");
  });

  test("fshin vetëm backup-in e kërkuar", async () => {
    const { storage } = await createTestStorage();

    await storage.save("backup-a", createTestBackup("session-a"));
    await storage.save("backup-b", createTestBackup("session-b"));

    await expect(storage.delete("backup-a")).resolves.toBe(true);
    await expect(storage.delete("backup-a")).resolves.toBe(false);
    await expect(storage.get("backup-a")).resolves.toBeNull();
    await expect(storage.get("backup-b")).resolves.not.toBeNull();
  });

  test("refuzon backup me checksum të ndryshuar", async () => {
    const { storage } = await createTestStorage();
    const backup = createTestBackup();

    backup.payload.messages[0].content = "Përmbajtje e ndryshuar";

    await expect(
      storage.save("tampered-backup", backup)
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.INVALID_BACKUP,
    });
  });

  test("nuk e mbishkruan skedarin kur JSON ekzistues është i dëmtuar", async () => {
    const { filePath, storage } = await createTestStorage();
    const corruptedJSON = "{ JSON i pavlefshëm";

    await writeFile(filePath, corruptedJSON, "utf8");

    await expect(storage.list()).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
    });

    await expect(
      storage.save("backup-001", createTestBackup())
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
    });

    await expect(readFile(filePath, "utf8")).resolves.toBe(corruptedJSON);
  });

  test("ruan disa backup-e të krijuara njëkohësisht në të njëjtën instancë", async () => {
    const { storage } = await createTestStorage();

    const backups = Array.from({ length: 10 }, (_, index) => ({
      id: `backup-${index}`,
      value: createTestBackup(`session-${index}`),
    }));

    await Promise.all(
      backups.map(({ id, value }) => storage.save(id, value))
    );

    const stats = await storage.getStats();

    expect(stats.entries).toBe(10);

    for (const { id, value } of backups) {
      await expect(storage.get(id)).resolves.toEqual(value);
    }
  });

  test("ruan backup-et kur dy instanca shkruajnë njëkohësisht në të njëjtin skedar", async () => {
    const { storage, storageFactory } = await createTestStorage();

    const storageA = storage;
    const storageB = storageFactory();

    const backupA = createTestBackup("concurrent-session-A");
    const backupB = createTestBackup("concurrent-session-B");

    await Promise.all([
      storageA.save("backup-A", backupA),
      storageB.save("backup-B", backupB),
    ]);

    const reader = storageFactory();

    await expect(reader.get("backup-A")).resolves.toEqual(backupA);
    await expect(reader.get("backup-B")).resolves.toEqual(backupB);

    const stats = await reader.getStats();

    expect(stats.entries).toBe(2);
    expect(stats.version).toBe("1.2.0");
  });

  test("refuzon ID bosh", async () => {
    const { storage } = await createTestStorage();

    await expect(
      storage.save("   ", createTestBackup())
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.INVALID_ID,
    });
  });
});
