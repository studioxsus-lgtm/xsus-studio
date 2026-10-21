import { beforeEach, describe, expect, test } from "vitest";

import {
  MEMORY_ENGINE_VERSION,
  createMemorySession,
  hasMemorySession,
  getMemorySession,
  addMemoryMessage,
  getMemoryHistory,
  getRecentMemoryContext,
  updateMemorySessionMetadata,
  clearMemoryHistory,
  deleteMemorySession,
  getMemoryStats,
  clearAllMemory,
} from "../../src/core/memory-engine.js";

describe("XSUS AI Memory Engine", () => {
  beforeEach(() => {
    clearAllMemory();
  });

  test("ekspozon versionin", () => {
    expect(MEMORY_ENGINE_VERSION).toBe("1.0.0");
  });

  test("krijon një sesion", () => {
    const session = createMemorySession({
      sessionId: "session-1",
    });

    expect(session.sessionId).toBe("session-1");
    expect(session.messages).toEqual([]);
    expect(hasMemorySession("session-1")).toBe(true);
  });

  test("refuzon sesionet e dyfishta", () => {
    createMemorySession({ sessionId: "session-1" });

    expect(() =>
      createMemorySession({ sessionId: "session-1" })
    ).toThrow("ekziston tashmë");
  });

  test("shton dhe lexon mesazhe", () => {
    createMemorySession({ sessionId: "session-1" });

    const message = addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Përshëndetje",
    });

    expect(message.role).toBe("user");
    expect(message.content).toBe("Përshëndetje");
    expect(message.id).toBeTruthy();

    expect(getMemoryHistory("session-1")).toHaveLength(1);
  });

  test("ruan rendin e bisedës", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Përshëndetje",
    });

    addMemoryMessage({
      sessionId: "session-1",
      role: "assistant",
      content: "Përshëndetje! Si mund të të ndihmoj?",
    });

    expect(
      getMemoryHistory("session-1").map((item) => item.role)
    ).toEqual(["user", "assistant"]);
  });

  test("kthen vetëm mesazhet e fundit", () => {
    createMemorySession({ sessionId: "session-1" });

    for (let i = 1; i <= 5; i += 1) {
      addMemoryMessage({
        sessionId: "session-1",
        role: "user",
        content: `Mesazhi ${i}`,
      });
    }

    expect(
      getMemoryHistory("session-1", { limit: 2 }).map(
        (item) => item.content
      )
    ).toEqual(["Mesazhi 4", "Mesazhi 5"]);
  });

  test("krijon kontekst të thjeshtuar", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Si funksionon XSUS AI?",
    });

    const context = getRecentMemoryContext("session-1");

    expect(context).toHaveLength(1);
    expect(context[0].role).toBe("user");
    expect(context[0].content).toBe("Si funksionon XSUS AI?");
    expect(context[0]).not.toHaveProperty("metadata");
  });

  test("nuk lejon ndryshimin e historikut përmes kopjes së lexuar", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Teksti origjinal",
    });

    const history = getMemoryHistory("session-1");
    history[0].content = "Tekst i ndryshuar";

    expect(getMemoryHistory("session-1")[0].content).toBe(
      "Teksti origjinal"
    );
  });

  test("përditëson metadata-n", () => {
    createMemorySession({
      sessionId: "session-1",
      metadata: { language: "sq" },
    });

    const session = updateMemorySessionMetadata(
      "session-1",
      { source: "web" }
    );

    expect(session.metadata).toEqual({
      language: "sq",
      source: "web",
    });
  });

  test("pastron historikun pa fshirë sesionin", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Test",
    });

    const result = clearMemoryHistory("session-1");

    expect(result.removedMessages).toBe(1);
    expect(getMemoryHistory("session-1")).toEqual([]);
    expect(hasMemorySession("session-1")).toBe(true);
  });

  test("fshin një sesion", () => {
    createMemorySession({ sessionId: "session-1" });

    expect(deleteMemorySession("session-1").deleted).toBe(true);
    expect(hasMemorySession("session-1")).toBe(false);
  });

  test("refuzon mesazhe të pavlefshme", () => {
    createMemorySession({ sessionId: "session-1" });

    expect(() =>
      addMemoryMessage({
        sessionId: "session-1",
        role: "system",
        content: "Test",
      })
    ).toThrow("Roli duhet të jetë");

    expect(() =>
      addMemoryMessage({
        sessionId: "session-1",
        role: "user",
        content: "   ",
      })
    ).toThrow("tekst jo bosh");
  });

  test("raporton statistikat", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Test",
    });

    const stats = getMemoryStats();

    expect(stats.activeSessions).toBe(1);
    expect(stats.totalMessages).toBe(1);
  });

  test("pastron të gjithë memorien", () => {
    createMemorySession({ sessionId: "session-1" });
    createMemorySession({ sessionId: "session-2" });

    const result = clearAllMemory();

    expect(result.removedSessions).toBe(2);
    expect(getMemoryStats().activeSessions).toBe(0);
  });
});
