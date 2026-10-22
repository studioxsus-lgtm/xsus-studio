
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

  test("pranon ID tekstuale për krijimin e sesionit", () => {
    const session = createMemorySession("session-1");

    expect(session.sessionId).toBe("session-1");
    expect(hasMemorySession("session-1")).toBe(true);
  });

  test("refuzon konfigurimin e pavlefshëm të sesionit", () => {
    expect(() => createMemorySession()).toThrow(
      "Konfigurimi i sesionit"
    );

    expect(() => createMemorySession(null)).toThrow(
      "Konfigurimi i sesionit"
    );

    expect(() => createMemorySession([])).toThrow(
      "Konfigurimi i sesionit"
    );
  });

  test("refuzon ID bosh ose tepër të gjatë", () => {
    expect(() =>
      createMemorySession({ sessionId: "   " })
    ).toThrow("ID e sesionit");

    expect(() =>
      createMemorySession({
        sessionId: "x".repeat(129),
      })
    ).toThrow("ID e sesionit");
  });

  test("normalizon hapësirat në ID-në e sesionit", () => {
    createMemorySession({ sessionId: " session-1 " });

    expect(hasMemorySession("session-1")).toBe(true);
    expect(hasMemorySession(" session-1 ")).toBe(true);
  });

  test("refuzon sesionet e dyfishta", () => {
    createMemorySession({ sessionId: "session-1" });

    expect(() =>
      createMemorySession({ sessionId: "session-1" })
    ).toThrow("ekziston tashmë");
  });

  test("kthen kopje të pavarur të sesionit", () => {
    createMemorySession({
      sessionId: "session-1",
      metadata: { language: "sq" },
    });

    const session = getMemorySession("session-1");
    session.metadata.language = "en";
    session.messages.push({ content: "ndryshim" });

    const original = getMemorySession("session-1");

    expect(original.metadata.language).toBe("sq");
    expect(original.messages).toEqual([]);
  });

  test("kthen null për sesion që nuk ekziston", () => {
    expect(getMemorySession("missing-session")).toBeNull();
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
    expect(message.timestamp).toBeTruthy();

    expect(getMemoryHistory("session-1")).toHaveLength(1);
  });

  test("normalizon tekstin e mesazhit", () => {
    createMemorySession({ sessionId: "session-1" });

    const message = addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "  Përshëndetje  ",
    });

    expect(message.content).toBe("Përshëndetje");
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
      getMemoryHistory("session-1").map(item => item.role)
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
        item => item.content
      )
    ).toEqual(["Mesazhi 4", "Mesazhi 5"]);
  });

  test("kthen listë bosh kur limiti është zero", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Test",
    });

    expect(
      getMemoryHistory("session-1", { limit: 0 })
    ).toEqual([]);
  });

  test("përdor kufirin maksimal për limit të pavlefshëm", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Test",
    });

    expect(
      getMemoryHistory("session-1", { limit: -1 })
    ).toHaveLength(1);

    expect(
      getMemoryHistory("session-1", { limit: 1.5 })
    ).toHaveLength(1);
  });

  test("kthen listë bosh për sesion që nuk ekziston", () => {
    expect(getMemoryHistory("missing-session")).toEqual([]);
    expect(getRecentMemoryContext("missing-session")).toEqual([]);
  });

  test("krijon kontekst të thjeshtuar pa metadata", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Si funksionon XSUS AI?",
      metadata: { source: "test" },
    });

    const context = getRecentMemoryContext("session-1");

    expect(context).toHaveLength(1);
    expect(context[0].role).toBe("user");
    expect(context[0].content).toBe("Si funksionon XSUS AI?");
    expect(context[0]).not.toHaveProperty("metadata");
  });

  test("kthen kontekst bosh kur limiti është zero", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Test",
    });

    expect(
      getRecentMemoryContext("session-1", 0)
    ).toEqual([]);
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

  test("ruan metadata-n e ndërthurur në kopje të pavarur", () => {
    const metadata = {
      language: "sq",
      preferences: {
        theme: "dark",
        options: ["a", "b"],
      },
    };

    createMemorySession({
      sessionId: "session-1",
      metadata,
    });

    metadata.preferences.theme = "light";
    metadata.preferences.options.push("c");

    const session = getMemorySession("session-1");

    expect(session.metadata.preferences.theme).toBe("dark");
    expect(session.metadata.preferences.options).toEqual(["a", "b"]);
  });

  test("kopjon metadata-n e mesazhit në mënyrë të pavarur", () => {
    createMemorySession({ sessionId: "session-1" });

    const metadata = {
      details: {
        source: "web",
      },
    };

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Test",
      metadata,
    });

    metadata.details.source = "changed";

    expect(
      getMemoryHistory("session-1")[0].metadata.details.source
    ).toBe("web");
  });

  test("përditëson metadata-n pa humbur vlerat ekzistuese", () => {
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

  test("kthen kopje të pavarur pas përditësimit të metadata-s", () => {
    createMemorySession({
      sessionId: "session-1",
      metadata: { settings: { theme: "dark" } },
    });

    const updated = updateMemorySessionMetadata(
      "session-1",
      { source: "web" }
    );

    updated.metadata.settings.theme = "light";

    expect(
      getMemorySession("session-1").metadata.settings.theme
    ).toBe("dark");
  });

  test("kthen null kur përditësohet sesion që nuk ekziston", () => {
    expect(
      updateMemorySessionMetadata("missing-session", {
        source: "web",
      })
    ).toBeNull();
  });

  test("refuzon metadata të pavlefshme", () => {
    createMemorySession({ sessionId: "session-1" });

    expect(() =>
      updateMemorySessionMetadata("session-1", null)
    ).toThrow("Metadata duhet të jetë objekt.");

    expect(() =>
      updateMemorySessionMetadata("session-1", [])
    ).toThrow("Metadata duhet të jetë objekt.");
  });

  test("refuzon mesazhe për sesion që nuk ekziston", () => {
    expect(() =>
      addMemoryMessage({
        sessionId: "missing-session",
        role: "user",
        content: "Test",
      })
    ).toThrow("Sesioni nuk ekziston.");
  });

  test("refuzon mesazhe të pavlefshme", () => {
    createMemorySession({ sessionId: "session-1" });

    expect(() => addMemoryMessage(null)).toThrow(
      "Mesazhi nuk është i vlefshëm."
    );

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

  test("refuzon mesazhe që tejkalojnë gjatësinë e lejuar", () => {
    createMemorySession({ sessionId: "session-1" });

    expect(() =>
      addMemoryMessage({
        sessionId: "session-1",
        role: "user",
        content: "x".repeat(8001),
      })
    ).toThrow("gjatësinë e lejuar");
  });

  test("ruan maksimumi 100 mesazhe për sesion", () => {
    createMemorySession({ sessionId: "session-1" });

    for (let i = 1; i <= 105; i += 1) {
      addMemoryMessage({
        sessionId: "session-1",
        role: "user",
        content: `Mesazhi ${i}`,
      });
    }

    const history = getMemoryHistory("session-1");

    expect(history).toHaveLength(100);
    expect(history[0].content).toBe("Mesazhi 6");
    expect(history[99].content).toBe("Mesazhi 105");
  });

  test("izolon historikun e sesioneve të ndryshme", () => {
    createMemorySession({ sessionId: "session-1" });
    createMemorySession({ sessionId: "session-2" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Biseda e parë",
    });

    addMemoryMessage({
      sessionId: "session-2",
      role: "user",
      content: "Biseda e dytë",
    });

    expect(getMemoryHistory("session-1").map(item => item.content))
      .toEqual(["Biseda e parë"]);

    expect(getMemoryHistory("session-2").map(item => item.content))
      .toEqual(["Biseda e dytë"]);
  });

  test("pastron historikun pa fshirë sesionin", () => {
    createMemorySession({ sessionId: "session-1" });

    addMemoryMessage({
      sessionId: "session-1",
      role: "user",
      content: "Test",
    });

    const result = clearMemoryHistory("session-1");

    expect(result.cleared).toBe(true);
    expect(result.removedMessages).toBe(1);
    expect(getMemoryHistory("session-1")).toEqual([]);
    expect(hasMemorySession("session-1")).toBe(true);
  });

  test("kthen rezultat të parashikueshëm kur pastrohet sesion që mungon", () => {
    expect(clearMemoryHistory("missing-session")).toEqual({
      cleared: false,
      removedMessages: 0,
    });
  });

  test("fshin një sesion", () => {
    createMemorySession({ sessionId: "session-1" });

    expect(deleteMemorySession("session-1").deleted).toBe(true);
    expect(hasMemorySession("session-1")).toBe(false);
  });

  test("kthen false kur fshihet sesion që mungon", () => {
    expect(deleteMemorySession("missing-session").deleted).toBe(false);
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
    expect(stats.maxSessions).toBe(1000);
    expect(stats.maxMessagesPerSession).toBe(100);
    expect(stats.version).toBe("1.0.0");
  });

  test("pastron të gjithë memorien", () => {
    createMemorySession({ sessionId: "session-1" });
    createMemorySession({ sessionId: "session-2" });

    const result = clearAllMemory();

    expect(result.removedSessions).toBe(2);
    expect(result.cleared).toBe(true);
    expect(getMemoryStats().activeSessions).toBe(0);
    expect(hasMemorySession("session-1")).toBe(false);
    expect(hasMemorySession("session-2")).toBe(false);
  });
});
