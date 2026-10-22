
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import { createMemoryBackupStorage } from "../../src/core/memory-backup-storage.js";

describe("XSUS AI Core — Concurrent Backup Instances", () => {
  let directories = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );

    directories = [];
  });

  async function createTestEnvironment() {
    const directory = await mkdtemp(
      path.join(tmpdir(), "xsus-backup-concurrency-")
    );

    directories.push(directory);

    const filePath = path.join(directory, "backups.json");

    return {
      filePath,
      storageA: createMemoryBackupStorage({ filePath }),
      storageB: createMemoryBackupStorage({ filePath }),
    };
  }

  function createTestBackup(sessionId, content) {
    const timestamp = new Date().toISOString();

    const snapshot = {
      schemaVersion: 1,
      engineVersion: "1.3.0",
      exportedAt: timestamp,
      session: {
        sessionId,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAccessedAt: timestamp,
        metadata: { language: "sq" },
        messages: [
          {
            id: `message-${sessionId}`,
            role: "user",
            content,
            timestamp,
            metadata: {},
          },
        ],
      },
    };

    return createMemoryBackup(snapshot, { sessionId });
  }

  test("ruan të dy backup-et kur dy instanca shkruajnë njëkohësisht", async () => {
    const { storageA, storageB } = await createTestEnvironment();

    const backupA = createTestBackup("session-A", "Backup nga instanca A");
    const backupB = createTestBackup("session-B", "Backup nga instanca B");

    await Promise.all([
      storageA.save("backup-A", backupA),
      storageB.save("backup-B", backupB),
    ]);

    const reader = createMemoryBackupStorage({
      filePath: path.join(
        directories[0],
        "backups.json"
      ),
    });

    const recoveredA = await reader.get("backup-A");
    const recoveredB = await reader.get("backup-B");

    expect(recoveredA).toEqual(backupA);
    expect(recoveredB).toEqual(backupB);
  });
});
