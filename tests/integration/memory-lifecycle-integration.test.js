
import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import {
  createMemoryLifecycleIntegration,
} from "../../src/core/memory-lifecycle-integration.js";

import {
  addMemoryMessage,
  deleteMemorySession,
  hasMemorySession,
  getMemoryHistory,
} from "../../src/core/memory-engine.js";

describe("XSUS AI Core - Memory Lifecycle Integration", () => {
  let directory;
  const sessionIds = [];

  afterEach(async () => {
    for (const sessionId of sessionIds.splice(0)) {
      deleteMemorySession(sessionId);
    }

    if (directory) {
      await rm(directory, {
        recursive: true,
        force: true,
      });

      directory = undefined;
    }
  });

  async function setup() {
    directory = await mkdtemp(
      join(tmpdir(), "xsus-memory-lifecycle-")
    );

    return createMemoryLifecycleIntegration({
      filePath: join(directory, "backups.json"),
    });
  }

  function createSessionId() {
    const sessionId = `test-${randomUUID()}`;
    sessionIds.push(sessionId);
    return sessionId;
  }

  function addMessage(sessionId, role, content) {
    return addMemoryMessage({
      sessionId,
      role,
      content,
    });
  }

  test("krijon dhe liston një backup të vlefshëm", async () => {
    const lifecycle = await setup();
    const sessionId = createSessionId();

    lifecycle.createSession(sessionId);

    addMessage(
      sessionId,
      "user",
      "Përshëndetje XSUS AI"
    );

    addMessage(
      sessionId,
      "assistant",
      "Përshëndetje!"
    );

    await lifecycle.createBackup(sessionId);

    const backups = await lifecycle.listBackups();

    expect(backups).toHaveLength(1);
    expect(backups[0].sessionId).toBe(sessionId);
  });

  test("verifikon backup-in e ruajtur", async () => {
    const lifecycle = await setup();
    const sessionId = createSessionId();

    lifecycle.createSession(sessionId);

    addMessage(
      sessionId,
      "user",
      "Test integriteti"
    );

    await lifecycle.createBackup(sessionId);

    const backups = await lifecycle.listBackups();

    expect(backups).toHaveLength(1);

    const result = await lifecycle.verifyBackup(
      backups[0].backupId
    );

    expect(result.exists).toBe(true);
    expect(result.valid).toBe(true);
  });

  test("nuk mbishkruan një sesion aktiv gjatë rikuperimit", async () => {
    const lifecycle = await setup();
    const sessionId = createSessionId();

    lifecycle.createSession(sessionId);

    addMessage(
      sessionId,
      "user",
      "Mesazhi origjinal"
    );

    await lifecycle.createBackup(sessionId);

    const backups = await lifecycle.listBackups();

    expect(backups).toHaveLength(1);

    const result = await lifecycle.recoverAndApply(
      backups[0].backupId
    );

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("APPLY_FAILED");
    expect(result.error.message).toMatch(
      /ekziston tashmë|Rikuperimi u ndal/i
    );

    expect(hasMemorySession(sessionId)).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(1);
    expect(history[0].content).toBe("Mesazhi origjinal");
  });

  test("refuzon backup për sesion që nuk ekziston", async () => {
    const lifecycle = await setup();
    const sessionId = `missing-${randomUUID()}`;

    await expect(
      lifecycle.createBackup(sessionId)
    ).rejects.toThrow(/nuk ekziston/i);
  });

  test("rikthen backup-in kur sesioni nuk është aktiv", async () => {
    const lifecycle = await setup();
    const sessionId = createSessionId();

    lifecycle.createSession(sessionId);

    addMessage(
      sessionId,
      "user",
      "Mesazh për rikuperim"
    );

    addMessage(
      sessionId,
      "assistant",
      "Përgjigje për rikuperim"
    );

    await lifecycle.createBackup(sessionId);

    const backups = await lifecycle.listBackups();

    expect(backups).toHaveLength(1);

    deleteMemorySession(sessionId);

    expect(hasMemorySession(sessionId)).toBe(false);

    const result = await lifecycle.recoverAndApply(
      backups[0].backupId
    );

    expect(result).toBeDefined();
    expect(hasMemorySession(sessionId)).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history[0].content).toBe("Mesazh për rikuperim");
    expect(history[1].content).toBe("Përgjigje për rikuperim");
  });
});
