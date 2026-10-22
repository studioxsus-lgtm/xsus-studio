
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import { createMemoryBackupStorage } from "../../src/core/memory-backup-storage.js";

const execFileAsync = promisify(execFile);

describe("XSUS AI — Memory Process Recovery", () => {
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

  test("backup-i lexohet dhe verifikohet nga një proces i ri Node.js", async () => {
    directory = await mkdtemp(
      path.join(tmpdir(), "xsus-process-recovery-")
    );

    const filePath = path.join(directory, "backups.json");
    const backupId = "process-recovery-session";

    const snapshot = {
      schemaVersion: 1,
      engineVersion: "1.3.0",
      exportedAt: new Date().toISOString(),
      session: {
        sessionId: backupId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        metadata: { language: "sq" },
        messages: [
          {
            id: "process-message-1",
            role: "user",
            content: "Backup pas rinisjes së procesit",
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        ],
      },
    };

    const backup = createMemoryBackup(snapshot, {
      sessionId: backupId,
    });

    const storage = createMemoryBackupStorage({ filePath });

    await storage.save(backupId, backup);

    // Procesi i dytë importon storage dhe lexon skedarin nga disku.
    const storageModuleUrl = pathToFileURL(
      fileURLToPath(
        new URL("../../src/core/memory-backup-storage.js", import.meta.url)
      )
    ).href;

    const script = `
      import { createMemoryBackupStorage } from ${JSON.stringify(storageModuleUrl)};

      const filePath = ${JSON.stringify(filePath)};
      const backupId = ${JSON.stringify(backupId)};

      const storage = createMemoryBackupStorage({ filePath });
      const backup = await storage.get(backupId);

      if (!backup) {
        console.log(JSON.stringify({ found: false, valid: false }));
        process.exitCode = 2;
      } else {
        const verification = await storage.verify(backupId);

        console.log(JSON.stringify({
          found: true,
          valid: Boolean(verification),
          sessionId: backup.sessionId,
          message: backup.payload?.session?.messages?.[0]?.content ?? null
        }));

        if (!verification) {
          process.exitCode = 3;
        }
      }
    `;

    const { stdout } = await execFileAsync(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        timeout: 10_000,
        maxBuffer: 1024 * 1024,
      }
    );

    const result = JSON.parse(stdout.trim());

    expect(result.found).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.sessionId).toBe(backupId);
    expect(result.message).toBe(
      "Backup pas rinisjes së procesit"
    );
  });
});
