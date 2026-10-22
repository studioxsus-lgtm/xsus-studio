
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import { createMemoryBackupStorage } from "../../src/core/memory-backup-storage.js";

describe("XSUS AI — Memory Backup Durability", () => {
  let directory;

  afterEach(async () => {
    if (directory) {
      await rm(directory, {
        recursive: true,
        force: true,
      });

      directory = undefined;
    }
  });

  async function createStorage() {
    directory = await mkdtemp(
      path.join(tmpdir(), "xsus-backup-durability-")
    );

    const filePath = path.join(directory, "backups.json");

    return {
      filePath,
      storage: createMemoryBackupStorage({ filePath }),
    };
  }

  test("backup-i mbijeton krijimit të një instance të re të storage", async () => {
    const { filePath, storage } = await createStorage();

    const snapshot = {
      schemaVersion: 1,
      engineVersion: "1.3.0",
      exportedAt: new Date().toISOString(),
      session: {
        sessionId: "durability-session",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        metadata: { language: "sq" },
        messages: [
          {
            id: "message-1",
            role: "user",
            content: "Test i qëndrueshmërisë",
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        ],
      },
    };

    const backup = createMemoryBackup(snapshot, {
      sessionId: "durability-session",
    });

    await storage.save("durability-session", backup);

    // Simulohet rinisja duke krijuar një instancë të re.
    const restartedStorage = createMemoryBackupStorage({
      filePath,
    });

    const recoveredBackup = await restartedStorage.get(
      "durability-session"
    );

    expect(recoveredBackup).toEqual(backup);

    const verification = await restartedStorage.verify(
      "durability-session"
    );

    expect(verification).toBeTruthy();
  });

  test("backup-i mbetet i lexueshëm pas disa hapjeve të storage", async () => {
    const { filePath, storage } = await createStorage();

    const snapshot = {
      schemaVersion: 1,
      engineVersion: "1.3.0",
      exportedAt: new Date().toISOString(),
      session: {
        sessionId: "reopen-session",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        metadata: {},
        messages: [],
      },
    };

    const backup = createMemoryBackup(snapshot, {
      sessionId: "reopen-session",
    });

    await storage.save("reopen-session", backup);

    for (let index = 0; index < 3; index += 1) {
      const reopenedStorage = createMemoryBackupStorage({
        filePath,
      });

      expect(
        await reopenedStorage.get("reopen-session")
      ).toEqual(backup);
    }
  });
});
