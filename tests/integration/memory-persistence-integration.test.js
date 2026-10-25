import { afterEach, describe, expect, test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createMemorySession,
  addMemoryMessage,
  getMemorySession,
  getMemoryHistory,
  hasMemorySession,
  clearAllMemory,
} from "../../src/core/memory-engine.js";

import {
  createMemoryPersistence,
} from "../../src/core/memory-persistence-integration.js";

import {
  createJSONMemoryStorage,
} from "../../src/core/json-memory-storage.js";

import {
  processAIRequest,
  configureAICoreMemoryPersistence,
} from "../../src/core/ai-core.js";

describe("XSUS AI Memory Persistence Integration", () => {
  let tempDirectory;
  let persistence;

  afterEach(async () => {
    configureAICoreMemoryPersistence(null);
    clearAllMemory();

    if (tempDirectory) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });

      tempDirectory = undefined;
    }

    persistence = undefined;
  });

  async function setup() {
    tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), "xsus-memory-test-")
    );

    const filePath = path.join(
      tempDirectory,
      "memory.json"
    );

    persistence = createMemoryPersistence({ filePath });

    return { filePath };
  }

  test("ruan dhe rikthen një sesion me historikun", async () => {
    await setup();

    createMemorySession("integration-1");

    addMemoryMessage({
      sessionId: "integration-1",
      role: "user",
      content: "Përshëndetje XSUS AI",
    });

    addMemoryMessage({
      sessionId: "integration-1",
      role: "assistant",
      content: "Përshëndetje! Si mund të të ndihmoj?",
    });

    const saved = await persistence.saveSession(
      "integration-1"
    );

    expect(saved.success).toBe(true);

    clearAllMemory();

    expect(hasMemorySession("integration-1")).toBe(false);

    const restored = await persistence.restoreSession(
      "integration-1"
    );

    expect(restored.restored).toBe(true);
    expect(hasMemorySession("integration-1")).toBe(true);

    const history = getMemoryHistory("integration-1");

    expect(history).toHaveLength(2);
    expect(history[0].content).toBe("Përshëndetje XSUS AI");
    expect(history[1].content).toBe(
      "Përshëndetje! Si mund të të ndihmoj?"
    );
  });

  test("ruan të dhënat në JSON edhe pas krijimit të storage të ri", async () => {
    const { filePath } = await setup();

    createMemorySession("integration-2");

    addMemoryMessage({
      sessionId: "integration-2",
      role: "user",
      content: "Test i ruajtjes në disk",
    });

    await persistence.saveSession("integration-2");

    const newStorage = createJSONMemoryStorage({ filePath });

    const record = await newStorage.get(
      "xsus:memory:session:integration-2"
    );

    expect(record).not.toBeNull();
    expect(record.sessionId).toBe("integration-2");
    expect(record.snapshot.session.messages).toHaveLength(1);
    expect(record.snapshot.session.messages[0].content).toBe(
      "Test i ruajtjes në disk"
    );
  });

  test("kthen rezultat kur sesioni i ruajtur nuk ekziston", async () => {
    await setup();

    const result = await persistence.restoreSession(
      "missing-integration-session"
    );

    expect(result).toMatchObject({
      success: false,
      restored: false,
      reason: "SESSION_NOT_FOUND",
    });
  });

  test("fshin sesionin e ruajtur dhe atë aktiv", async () => {
    await setup();

    createMemorySession("integration-delete");

    addMemoryMessage({
      sessionId: "integration-delete",
      role: "user",
      content: "Mesazh për fshirje",
    });

    await persistence.saveSession("integration-delete");

    const result = await persistence.deleteSessionCompletely(
      "integration-delete"
    );

    expect(result.success).toBe(true);
    expect(hasMemorySession("integration-delete")).toBe(false);

    expect(
      await persistence.hasSavedSession("integration-delete")
    ).toBe(false);
  });

  test("nuk lejon rikthimin mbi një sesion ekzistues", async () => {
    await setup();

    createMemorySession("integration-duplicate");

    addMemoryMessage({
      sessionId: "integration-duplicate",
      role: "user",
      content: "Mesazhi origjinal",
    });

    await persistence.saveSession("integration-duplicate");

    await expect(
      persistence.restoreSession("integration-duplicate")
    ).rejects.toMatchObject({
      code: "SESSION_RESTORE_FAILED",
    });

    expect(
      getMemorySession("integration-duplicate").messages[0].content
    ).toBe("Mesazhi origjinal");
  });

  test("rikthen historikun pas pastrimit të memories aktive", async () => {
    await setup();

    const sessionId = "integration-recovery";

    createMemorySession(sessionId);

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Dua të mësoj JavaScript.",
    });

    addMemoryMessage({
      sessionId,
      role: "assistant",
      content: "Mund të fillosh me bazat e JavaScript.",
    });

    const saved = await persistence.saveSession(sessionId);

    expect(saved.success).toBe(true);

    clearAllMemory();

    expect(hasMemorySession(sessionId)).toBe(false);

    const restored = await persistence.restoreSession(sessionId);

    expect(restored.success).toBe(true);
    expect(restored.restored).toBe(true);

    const history = getMemoryHistory(sessionId);

    expect(history).toHaveLength(2);
    expect(history[0].content).toBe(
      "Dua të mësoj JavaScript."
    );
    expect(history[1].content).toBe(
      "Mund të fillosh me bazat e JavaScript."
    );
  });

  test("izolon historikun e dy sesioneve të ndryshme", async () => {
    await setup();

    const sessionA = "integration-isolation-a";
    const sessionB = "integration-isolation-b";

    createMemorySession(sessionA);
    createMemorySession(sessionB);

    addMemoryMessage({
      sessionId: sessionA,
      role: "user",
      content: "Mesazh vetëm për sesionin A.",
    });

    addMemoryMessage({
      sessionId: sessionB,
      role: "user",
      content: "Mesazh vetëm për sesionin B.",
    });

    addMemoryMessage({
      sessionId: sessionA,
      role: "assistant",
      content: "Përgjigjja e sesionit A.",
    });

    const historyA = getMemoryHistory(sessionA);
    const historyB = getMemoryHistory(sessionB);

    expect(historyA).toHaveLength(2);
    expect(historyB).toHaveLength(1);

    expect(
      historyA.some((message) =>
        message.content.includes("sesionin B")
      )
    ).toBe(false);

    expect(
      historyB.some((message) =>
        message.content.includes("sesionin A")
      )
    ).toBe(false);

    expect(historyB[0].content).toBe(
      "Mesazh vetëm për sesionin B."
    );
  });

  test("ruan dhe rikthen sesionet në mënyrë të pavarur", async () => {
    await setup();

    createMemorySession("integration-independent-a");
    createMemorySession("integration-independent-b");

    addMemoryMessage({
      sessionId: "integration-independent-a",
      role: "user",
      content: "Të dhënat e sesionit A.",
    });

    addMemoryMessage({
      sessionId: "integration-independent-b",
      role: "user",
      content: "Të dhënat e sesionit B.",
    });

    await persistence.saveSession("integration-independent-a");
    await persistence.saveSession("integration-independent-b");

    clearAllMemory();

    expect(hasMemorySession("integration-independent-a")).toBe(false);
    expect(hasMemorySession("integration-independent-b")).toBe(false);

    const restoredA = await persistence.restoreSession(
      "integration-independent-a"
    );

    expect(restoredA.restored).toBe(true);
    expect(hasMemorySession("integration-independent-a")).toBe(true);
    expect(hasMemorySession("integration-independent-b")).toBe(false);

    const restoredB = await persistence.restoreSession(
      "integration-independent-b"
    );

    expect(restoredB.restored).toBe(true);

    expect(
      getMemoryHistory("integration-independent-a")[0].content
    ).toBe("Të dhënat e sesionit A.");

    expect(
      getMemoryHistory("integration-independent-b")[0].content
    ).toBe("Të dhënat e sesionit B.");
  });

  test("orkestruesi përdor historikun e bisedës pasuese", async () => {
    await setup();

    configureAICoreMemoryPersistence(persistence);

    const conversationId = "integration-ai-core-follow-up";

    const firstResult = await processAIRequest({
      query: "Dua të mësoj programim.",
      language: "sq",
      conversationId,
    });

    expect(firstResult.answer).toBeTruthy();

    const secondResult = await processAIRequest({
      query: "Cilin hap duhet të ndjek më pas?",
      language: "sq",
      conversationId,
    });

    expect(secondResult.answer).toBeTruthy();

    expect(secondResult.metadata.context).toBeDefined();

    expect(secondResult.metadata.context.conversationId).toBe(
      conversationId
    );

    expect(secondResult.metadata.context.hasPreviousContext).toBe(true);

    expect(
      secondResult.metadata.context.historyMessageCount
    ).toBeGreaterThanOrEqual(2);

    expect(
      await persistence.hasSavedSession(conversationId)
    ).toBe(true);

    const record = await createJSONMemoryStorage({
      filePath: path.join(tempDirectory, "memory.json"),
    }).get(`xsus:memory:session:${conversationId}`);

    expect(record).not.toBeNull();
    expect(record.sessionId).toBe(conversationId);
    expect(record.snapshot.session.messages.length).toBeGreaterThanOrEqual(3);
  });

  test("vazhdon ruajtjen pas dështimit të një operacioni", async () => {
    await setup();

    const sessionId = "integration-queue-recovery";

    createMemorySession(sessionId);

    addMemoryMessage({
      sessionId,
      role: "user",
      content: "Të dhëna për rikuperim",
    });

    const storage = createJSONMemoryStorage({
      filePath: path.join(tempDirectory, "recovery.json"),
    });

    const originalSet = storage.set.bind(storage);
    let shouldFail = true;

    storage.set = async (...args) => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("Dështim i simuluar i shkrimit");
      }

      return originalSet(...args);
    };

    const recoveryPersistence = createMemoryPersistence({
      storage,
    });

    await expect(
      recoveryPersistence.saveSession(sessionId)
    ).rejects.toBeDefined();

    const saved = await recoveryPersistence.saveSession(sessionId);

    expect(saved.success).toBe(true);

    const record = await storage.get(
      `xsus:memory:session:${sessionId}`
    );

    expect(record).not.toBeNull();
    expect(record.snapshot.session.messages[0].content).toBe(
      "Të dhëna për rikuperim"
    );
  });

  test("rikthen sesionet e shëndosha edhe kur një rekord ka version të pambështetur", async () => {
    await setup();

    const storage = createJSONMemoryStorage({
      filePath: path.join(tempDirectory, "isolation.json"),
    });

    const healthySessionId = "integration-healthy-session";
    const damagedSessionId = "integration-damaged-session";

    const isolatedPersistence = createMemoryPersistence({
      storage,
    });

    createMemorySession(healthySessionId);

    addMemoryMessage({
      sessionId: healthySessionId,
      role: "user",
      content: "Sesioni i shëndoshë duhet të ruhet",
    });

    await isolatedPersistence.saveSession(healthySessionId);

    await storage.set(
      `xsus:memory:session:${damagedSessionId}`,
      {
        version: "999.0.0",
        sessionId: damagedSessionId,
        savedAt: new Date().toISOString(),
        snapshot: {
          session: {
            messages: [],
          },
        },
      }
    );

    clearAllMemory();

    await expect(
      isolatedPersistence.restoreSession(damagedSessionId)
    ).rejects.toMatchObject({
      code: "UNSUPPORTED_SESSION_VERSION",
    });

    const restored = await isolatedPersistence.restoreSession(
      healthySessionId
    );

    expect(restored.success).toBe(true);
    expect(restored.restored).toBe(true);

    expect(getMemoryHistory(healthySessionId)[0].content).toBe(
      "Sesioni i shëndoshë duhet të ruhet"
    );

    const healthyRecord = await storage.get(
      `xsus:memory:session:${healthySessionId}`
    );

    expect(healthyRecord).not.toBeNull();
    expect(healthyRecord.sessionId).toBe(healthySessionId);
  });
});
