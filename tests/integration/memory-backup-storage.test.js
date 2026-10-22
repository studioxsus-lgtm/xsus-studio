
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
  let temporaryDirectory;

  async function createTestStorage() {
    temporaryDirectory = await mkdtemp(
      join(tmpdir(), "xsus-backup-storage-")
    );

    const filePath = join(
      temporaryDirectory,
      "backups.json"
    );

    return {
      filePath,
      storage: createMemoryBackupStorage({ filePath }),
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
    if (temporaryDirectory) {
      await rm(temporaryDirectory, {
        recursive: true,
        force: true,
      });

      temporaryDirectory = undefined;
    }
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
    const restored = await newStorage.get("recovery-001");

    expect(restored).toEqual(backup);
  });

  test("kthen null kur backup-i nuk ekziston", async () => {
    const { storage } = await createTestStorage();

    await expect(storage.get("missing-backup")).resolves.toBeNull();
  });

  test("refuzon mbishkrimin pa leje", async () => {
    const { storage } = await createTestStorage();

    await storage.save("backup-001", createTestBackup());

    await expect(
      storage.save(
        "backup-001",
        createTestBackup("session-002")
      )
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CONFLICT,
    });
  });

  test("lejon mbishkrimin vetëm kur kërkohet shprehimisht", async () => {
    const { storage } = await createTestStorage();

    await storage.save("backup-001", createTestBackup("old-session"));

    const replacement = createTestBackup("new-session");

    await storage.save("backup-001", replacement, {
      overwrite: true,
    });

    await expect(storage.get("backup-001")).resolves.toEqual(
      replacement
    );
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
    expect(stats.version).toBe("1.0.0");
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

    // Ndryshojmë payload-in pa përditësuar checksum-in.
    backup.payload.messages[0].content = "Përmbajtje e ndryshuar";

    await expect(
      storage.save("tampered-backup", backup)
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.INVALID_BACKUP,
    });
  });

  test("nuk e mbishkruan skedarin kur JSON ekzistues është i dëmtuar", async () => {
    const { filePath, storage } = await createTestStorage();

    await writeFile(filePath, "{ JSON i pavlefshëm", "utf8");

    await expect(storage.list()).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
    });

    await expect(
      storage.save("backup-001", createTestBackup())
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
    });

    const raw = await readFile(filePath, "utf8");
    expect(raw).toBe("{ JSON i pavlefshëm");
  });

  test("ruan disa backup-e të krijuara njëkohësisht", async () => {
    const { storage } = await createTestStorage();

    await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        storage.save(
          `backup-${index}`,
          createTestBackup(`session-${index}`)
        )
      )
    );

    const stats = await storage.getStats();
    expect(stats.entries).toBe(10);
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
