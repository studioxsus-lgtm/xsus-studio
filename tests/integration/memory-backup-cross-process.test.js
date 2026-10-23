
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createMemoryBackupStorage } from "../../src/core/memory-backup-storage.js";

describe("XSUS AI Core — Memory Backup Cross-Process", () => {
  let directories = [];

  const workerPath = fileURLToPath(
    new URL("../helpers/memory-backup-storage-worker.js", import.meta.url)
  );

  async function createTestEnvironment() {
    const directory = await mkdtemp(
      path.join(tmpdir(), "xsus-cross-process-")
    );

    directories.push(directory);

    return {
      directory,
      filePath: path.join(directory, "backups.json"),
    };
  }

  function runWorker(filePath, backupId, sessionId) {
    return new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [workerPath, filePath, backupId, sessionId],
        {
          stdio: ["ignore", "pipe", "pipe"],
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");

      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });

      child.once("error", reject);

      child.once("close", (code, signal) => {
        if (code !== 0) {
          reject(
            new Error(
              `Worker dështoi: backup=${backupId}, ` +
                `code=${code}, signal=${signal ?? "none"}\n${stderr}`
            )
          );
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());

          resolve(result);
        } catch (error) {
          reject(
            new Error(
              `Worker-i ktheu rezultat të pavlefshëm për ${backupId}: ` +
                `${stdout}\n${stderr}\n${error.message}`
            )
          );
        }
      });
    });
  }

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );

    directories = [];
  });

  test("ruan të gjitha backup-et kur katër procese shkruajnë njëkohësisht", async () => {
    const { filePath } = await createTestEnvironment();

    const jobs = [
      { backupId: "cross-backup-1", sessionId: "cross-session-1" },
      { backupId: "cross-backup-2", sessionId: "cross-session-2" },
      { backupId: "cross-backup-3", sessionId: "cross-session-3" },
      { backupId: "cross-backup-4", sessionId: "cross-session-4" },
    ];

    const results = await Promise.all(
      jobs.map(({ backupId, sessionId }) =>
        runWorker(filePath, backupId, sessionId)
      )
    );

    expect(results).toHaveLength(4);

    for (const result of results) {
      expect(result.success).toBe(true);
    }

    // Hapet një instancë e re pasi të gjitha proceset kanë përfunduar.
    const storage = createMemoryBackupStorage({ filePath });

    const backups = await storage.list();
    const stats = await storage.getStats();

    expect(stats.entries).toBe(4);

    expect(backups.map((item) => item.backupId).sort()).toEqual([
      "cross-backup-1",
      "cross-backup-2",
      "cross-backup-3",
      "cross-backup-4",
    ]);

    for (const job of jobs) {
      const backup = await storage.get(job.backupId);

      expect(backup).not.toBeNull();
      expect(backup.payload.sessionId).toBe(job.sessionId);

      await expect(storage.verify(job.backupId)).resolves.toMatchObject({
        valid: true,
        exists: true,
        backupId: job.backupId,
      });
    }
  });
});
