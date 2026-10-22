
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import { createMemoryBackupStorage } from "../../src/core/memory-backup-storage.js";
import {
  createMemorySession,
  addMemoryMessage,
  exportMemorySession,
  clearAllMemory,
} from "../../src/core/memory-engine.js";

const execFileAsync = promisify(execFile);

const memoryEngineUrl = new URL(
  "../../src/core/memory-engine.js",
  import.meta.url
).href;

const backupStorageUrl = new URL(
  "../../src/core/memory-backup-storage.js",
  import.meta.url
).href;

const backupModuleUrl = new URL(
  "../../src/core/memory-backup.js",
  import.meta.url
).href;

describe("XSUS AI — Memory Process Restore", () => {
  let directory;

  afterEach(async () => {
    await clearAllMemory();

    if (directory) {
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });

  test("rikthen sesionin real nga backup-i në një proces të ri Node.js", async () => {
    directory = await mkdtemp(
      path.join(tmpdir(), "xsus-process-restore-")
    );

    const filePath = path.join(directory, "backups.json");
    const sessionId = "process-restore-session";

    // Procesi i parë krijon një sesion real dhe historikun e tij.
    createMemorySession(sessionId, {
      language: "sq",
      source: "process-recovery-test",
    });

    addMemoryMessage(sessionId, {
      role: "user",
      content: "Përshëndetje XSUS AI",
    });

    addMemoryMessage(sessionId, {
      role: "assistant",
      content: "Përshëndetje! Si mund të të ndihmoj?",
    });

    const snapshot = exportMemorySession(sessionId);

    expect(snapshot).not.toBeNull();
    expect(snapshot.session.messages).toHaveLength(2);

    const backup = createMemoryBackup(snapshot, { sessionId });
    const storage = createMemoryBackupStorage({ filePath });

    await storage.save(sessionId, backup);

    // Sigurohemi që sesioni nuk mbetet aktiv në procesin testues.
    await clearAllMemory();

    // Procesi i dytë lexon backup-in dhe rikthen sesionin real.
    const script = `
      import { createMemoryBackupStorage } from ${JSON.stringify(backupStorageUrl)};
      import { restoreMemoryBackup } from ${JSON.stringify(backupModuleUrl)};
      import {
        hasMemorySession,
        getMemoryHistory,
        getMemorySession,
        restoreMemorySession
      } from ${JSON.stringify(memoryEngineUrl)};

      const storage = createMemoryBackupStorage({
        filePath: ${JSON.stringify(filePath)}
      });

      const sessionId = ${JSON.stringify(sessionId)};
      const backup = await storage.get(sessionId);

      if (!backup) {
        throw new Error("BACKUP_NOT_FOUND");
      }

      const result = await restoreMemoryBackup(backup, {
        restoreSnapshot: async (id, snapshot) => {
          return restoreMemorySession(id, snapshot);
        },
        sessionExists: (id) => hasMemorySession(id)
      });

      const session = getMemorySession(sessionId);
      const history = getMemoryHistory(sessionId);

      console.log(JSON.stringify({
        restored: Boolean(result),
        sessionExists: hasMemorySession(sessionId),
        sessionId: session?.sessionId ?? null,
        language: session?.metadata?.language ?? null,
        messageCount: history.length,
        messages: history.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp
        }))
      }));
    `;

    const { stdout } = await execFileAsync(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        timeout: 15000,
        maxBuffer: 1024 * 1024,
      }
    );

    const result = JSON.parse(stdout.trim());

    expect(result.restored).toBe(true);
    expect(result.sessionExists).toBe(true);
    expect(result.sessionId).toBe(sessionId);
    expect(result.language).toBe("sq");
    expect(result.messageCount).toBe(2);

    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toBe("Përshëndetje XSUS AI");

    expect(result.messages[1].role).toBe("assistant");
    expect(result.messages[1].content).toBe(
      "Përshëndetje! Si mund të të ndihmoj?"
    );

    // ID-të dhe kohët origjinale duhet të ruhen.
    expect(result.messages[0].id).toBe(snapshot.session.messages[0].id);
    expect(result.messages[1].id).toBe(snapshot.session.messages[1].id);
    expect(result.messages[0].timestamp).toBe(
      snapshot.session.messages[0].timestamp
    );
    expect(result.messages[1].timestamp).toBe(
      snapshot.session.messages[1].timestamp
    );
  });
});
