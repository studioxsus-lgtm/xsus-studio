
import { afterEach, describe, expect, test } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import {
  createMemoryBackupStorage,
  MEMORY_BACKUP_STORAGE_ERRORS,
} from "../../src/core/memory-backup-storage.js";

describe("XSUS AI Core — Memory Backup Fault Tolerance", () => {
  let directories = [];

  async function createEnvironment(options = {}) {
    const directory = await mkdtemp(
      path.join(tmpdir(), "xsus-memory-fault-")
    );

    directories.push(directory);

    const filePath = path.join(directory, "backups.json");

    const storage = createMemoryBackupStorage({
      filePath,
      ...options,
    });

    return {
      directory,
      filePath,
      lockPath: `${path.resolve(filePath)}.lock`,
      storage,
    };
  }

  function createBackup(sessionId = "fault-session") {
    return createMemoryBackup(
      {
        sessionId,
        messages: [
          {
            role: "user",
            content: "Test i rikuperimit të XSUS AI",
          },
        ],
      },
      { sessionId }
    );
  }

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );

    directories = [];
  });

  test("rikuperon një kyçje të vjetruar", async () => {
    const { filePath, lockPath, storage } =
      await createEnvironment({
        lockTimeoutMs: 1500,
        lockStaleMs: 100,
      });

    const backup = createBackup("stale-lock-session");

    await writeFile(
      lockPath,
      JSON.stringify({
        token: "stale-test-token",
        pid: -1,
        createdAt: "2000-01-01T00:00:00.000Z",
      }),
      "utf8"
    );

    const oldTime = new Date(Date.now() - 5000);
    await utimes(lockPath, oldTime, oldTime);

    await expect(
      storage.save("recovered-backup", backup)
    ).resolves.toEqual({
      backupId: "recovered-backup",
      saved: true,
    });

    const reader = createMemoryBackupStorage({ filePath });
    const recoveredBackup = await reader.get("recovered-backup");

    expect(recoveredBackup).toEqual(backup);

    await expect(
      reader.verify("recovered-backup")
    ).resolves.toMatchObject({ valid: true });

    await expect(stat(lockPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  test("kthen LOCK_TIMEOUT kur kyçja nuk lirohet në kohë", async () => {
    const { lockPath, storage } = await createEnvironment({
      lockTimeoutMs: 100,
      lockStaleMs: 60_000,
    });

    await writeFile(
      lockPath,
      JSON.stringify({
        token: "another-process-token",
        pid: -1,
        createdAt: new Date().toISOString(),
      }),
      "utf8"
    );

    await expect(
      storage.save("timeout-backup", createBackup())
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.LOCK_TIMEOUT,
    });

    const lockContent = JSON.parse(
      await readFile(lockPath, "utf8")
    );

    expect(lockContent.token).toBe("another-process-token");
  });

  test("nuk e ndryshon JSON-in ekzistues kur ai është i dëmtuar", async () => {
    const { filePath, storage } = await createEnvironment();
    const corruptedJSON = "{ JSON i pavlefshëm";

    await writeFile(filePath, corruptedJSON, "utf8");

    await expect(
      storage.save("backup-1", createBackup())
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CORRUPTED,
    });

    await expect(
      readFile(filePath, "utf8")
    ).resolves.toBe(corruptedJSON);
  });

  test("liron kyçjen pas një konflikti të backup-it", async () => {
    const { lockPath, storage } = await createEnvironment();

    await storage.save("backup-1", createBackup());

    await expect(
      storage.save(
        "backup-1",
        createBackup("different-session")
      )
    ).rejects.toMatchObject({
      code: MEMORY_BACKUP_STORAGE_ERRORS.CONFLICT,
    });

    await expect(stat(lockPath)).rejects.toMatchObject({
      code: "ENOENT",
    });

    const originalBackup = await storage.get("backup-1");

    expect(originalBackup).not.toBeNull();
    expect(originalBackup.payload.sessionId).toBe("fault-session");
  });

  test("injoron skedarët e përkohshëm të mbetur pas ndërprerjes", async () => {
    const { filePath, storage } = await createEnvironment();

    const originalBackup = createBackup("crash-recovery-session");

    await storage.save("stable-backup", originalBackup);

    // Simulon një skedar të paplotë të mbetur pas ndërprerjes.
    const temporaryPath = `${filePath}.tmp-crash-test`;

    await writeFile(
      temporaryPath,
      '{"partial":',
      "utf8"
    );

    const recovered = await storage.get("stable-backup");

    expect(recovered).toEqual(originalBackup);

    await expect(
      storage.save("new-backup", createBackup("new-session"))
    ).resolves.toEqual({
      backupId: "new-backup",
      saved: true,
    });

    expect(await storage.get("stable-backup")).toEqual(
      originalBackup
    );

    expect(await storage.get("new-backup")).not.toBeNull();

    // Skedari i përkohshëm nuk duhet të interpretohet si backup.
    await expect(
      storage.get("crash-test")
    ).resolves.toBeNull();
  });

  test("ruan backup-in ekzistues kur mbetet një skedar i përkohshëm i dëmtuar", async () => {
    const { filePath, storage } = await createEnvironment();

    const originalBackup = createBackup("preserved-session");

    await storage.save("preserved-backup", originalBackup);

    await writeFile(
      `${filePath}.tmp-incomplete`,
      '{"format":"xsus-memory-backup","payload":',
      "utf8"
    );

    const storedBackup = await storage.get("preserved-backup");

    expect(storedBackup).toEqual(originalBackup);

    await expect(
      storage.verify("preserved-backup")
    ).resolves.toMatchObject({
      valid: true,
    });
  });
});
