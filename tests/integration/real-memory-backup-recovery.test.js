
import { afterEach, describe, expect, test } from "vitest";
import {
  addMemoryMessage,
  clearAllMemory,
  exportMemorySession,
  getMemoryHistory,
  hasMemorySession,
  restoreMemorySession,
  createMemorySession,
} from "../../src/core/memory-engine.js";

import { createMemoryBackup } from "../../src/core/memory-backup.js";
import { createMemoryBackupStorage } from "../../src/core/memory-backup-storage.js";
import { createMemoryBackupRecovery } from "../../src/core/memory-backup-recovery.js";

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

describe("XSUS AI — Real Memory Backup Recovery", () => {
  let directory;
  let storage;

  afterEach(async () => {
    clearAllMemory();

    if (directory) {
      await rm(directory, {
        recursive: true,
        force: true,
      });

      directory = undefined;
    }

    storage = undefined;
  });

  async function setup() {
    directory = await mkdtemp(
      path.join(tmpdir(), "xsus-memory-recovery-")
    );

    storage = createMemoryBackupStorage({
      filePath: path.join(directory, "backups.json"),
    });

    return storage;
  }

  test("rikthen një sesion real nga backup-i", async () => {
    await setup();

    const sessionId = "real-recovery-session";

    createMemorySession({
      sessionId,
      metadata: {
        language: "sq",
        source: "integration-test",
      },
    });

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Përshëndetje XSUS AI!",
      metadata: {
        intent: "greeting",
      },
    });

    addMemoryMessage({
      sessionId,
      role: "assistant",
      content: "Përshëndetje! Si mund të të ndihmoj?",
    });

    const originalSnapshot = exportMemorySession(sessionId);

    expect(originalSnapshot).not.toBeNull();
    expect(originalSnapshot.session.messages).toHaveLength(2);

    const originalMessages = originalSnapshot.session.messages.map(
      (message) => ({
        id: message.id,
        timestamp: message.timestamp,
        role: message.role,
        content: message.content,
      })
    );

    const backup = createMemoryBackup(originalSnapshot, {
      sessionId,
    });

    await storage.save(sessionId, backup);

    // Simulojmë humbjen e memories aktive në RAM.
    clearAllMemory();

    expect(hasMemorySession(sessionId)).toBe(false);

    const recovery = createMemoryBackupRecovery({
      storage,
      sessionExists: hasMemorySession,
      restoreSnapshot: async (snapshot, options) => {
        return restoreMemorySession(
          options.sessionId,
          snapshot
        );
      },
    });

    const result = await recovery.recover(sessionId);

    expect(result).toBeDefined();
    expect(hasMemorySession(sessionId)).toBe(true);

    const restoredHistory = getMemoryHistory(sessionId);

    expect(restoredHistory).toHaveLength(2);

    expect(
      restoredHistory.map((message) => ({
        id: message.id,
        timestamp: message.timestamp,
        role: message.role,
        content: message.content,
      }))
    ).toEqual(originalMessages);

    const restoredSnapshot = exportMemorySession(sessionId);

    expect(restoredSnapshot.session.metadata).toEqual({
      language: "sq",
      source: "integration-test",
    });

    expect(restoredHistory[0].metadata).toEqual({
      intent: "greeting",
    });
  });

  test("nuk mbishkruan një sesion aktiv pa leje", async () => {
    await setup();

    const sessionId = "existing-session";

    createMemorySession(sessionId);

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Mesazhi origjinal",
    });

    const snapshot = exportMemorySession(sessionId);
    const backup = createMemoryBackup(snapshot, {
      sessionId,
    });

    await storage.save(sessionId, backup);

    const recovery = createMemoryBackupRecovery({
      storage,
      sessionExists: hasMemorySession,
      restoreSnapshot: async (data, options) =>
        restoreMemorySession(options.sessionId, data),
    });

    await expect(
      recovery.recover(sessionId)
    ).rejects.toThrow();

    expect(getMemoryHistory(sessionId)).toHaveLength(1);
    expect(getMemoryHistory(sessionId)[0].content).toBe(
      "Mesazhi origjinal"
    );
  });

  test("rikthen një sesion kur lejohet shprehimisht mbishkrimi", async () => {
    await setup();

    const sessionId = "overwrite-session";

    createMemorySession(sessionId);

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Mesazhi nga backup-i",
    });

    const snapshot = exportMemorySession(sessionId);
    const backup = createMemoryBackup(snapshot, {
      sessionId,
    });

    await storage.save(sessionId, backup);

    clearAllMemory();

    createMemorySession(sessionId);

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Mesazh i përkohshëm",
    });

    const recovery = createMemoryBackupRecovery({
      storage,
      sessionExists: hasMemorySession,
      restoreSnapshot: async (data, options) =>
        restoreMemorySession(options.sessionId, data),
    });

    // Rikuperimi i drejtpërdrejtë nuk mbishkruan sesionet.
    await expect(
      recovery.recover(sessionId)
    ).rejects.toThrow();

    // Fshijmë sesionin aktiv, pastaj rikthejmë backup-in.
    const { deleteMemorySession } = await import(
      "../../src/core/memory-engine.js"
    );

    deleteMemorySession(sessionId);

    const result = await recovery.recover(sessionId);

    expect(result).toBeDefined();
    expect(getMemoryHistory(sessionId)).toHaveLength(1);
    expect(getMemoryHistory(sessionId)[0].content).toBe(
      "Mesazhi nga backup-i"
    );
  });
});
