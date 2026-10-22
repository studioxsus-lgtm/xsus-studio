
import { beforeEach, describe, expect, test } from "vitest";

import {
  MEMORY_ENGINE_VERSION,
  createMemorySession,
  hasMemorySession,
  getMemorySession,
  touchMemorySession,
  addMemoryMessage,
  getMemoryHistory,
  getRecentMemoryContext,
  updateMemorySessionMetadata,
  clearMemoryHistory,
  deleteMemorySession,
  getMemoryStats,
  clearAllMemory,
  cleanupExpiredMemorySessions,
  exportMemorySession,
  restoreMemorySession,
} from "../../src/core/memory-engine.js";

describe("XSUS AI Memory Engine", () => {
  beforeEach(() => {
    clearAllMemory();
  });

  describe("versioni dhe statistikat", () => {
    test("ekspozon versionin 1.3.0", () => {
      expect(MEMORY_ENGINE_VERSION).toBe("1.3.0");
    });

    test("raporton statistikat fillestare", () => {
      expect(getMemoryStats()).toEqual({
        activeSessions: 0,
        totalMessages: 0,
        maxSessions: 1000,
        maxMessagesPerSession: 100,
        version: "1.3.0",
      });
    });

    test("numëron sesionet dhe mesazhet", () => {
      createMemorySession("stats-1");
      createMemorySession("stats-2");

      addMemoryMessage({
        sessionId: "stats-1",
        role: "user",
        content: "Pyetje",
      });

      addMemoryMessage({
        sessionId: "stats-1",
        role: "assistant",
        content: "Përgjigje",
      });

      addMemoryMessage({
        sessionId: "stats-2",
        role: "user",
        content: "Pyetje tjetër",
      });

      expect(getMemoryStats()).toEqual({
        activeSessions: 2,
        totalMessages: 3,
        maxSessions: 1000,
        maxMessagesPerSession: 100,
        version: "1.3.0",
      });
    });
  });

  describe("krijimi i sesioneve", () => {
    test("krijon sesion me ID tekstuale", () => {
      const session = createMemorySession("session-1");

      expect(session.sessionId).toBe("session-1");
      expect(session.messages).toEqual([]);
      expect(hasMemorySession("session-1")).toBe(true);
    });

    test("pranon konfigurim me metadata", () => {
      const session = createMemorySession({
        sessionId: "session-config",
        metadata: {
          language: "sq",
          settings: {
            theme: "dark",
          },
        },
      });

      expect(session.metadata.language).toBe("sq");
      expect(session.metadata.settings.theme).toBe("dark");
    });

    test("krijon data të vlefshme", () => {
      const session = createMemorySession("session-dates");

      expect(Number.isFinite(Date.parse(session.createdAt))).toBe(true);
      expect(Number.isFinite(Date.parse(session.updatedAt))).toBe(true);
      expect(Number.isFinite(Date.parse(session.lastAccessedAt))).toBe(true);
    });

    test("refuzon ID bosh ose të pavlefshëm", () => {
      expect(() => createMemorySession("")).toThrow();
      expect(() => createMemorySession("   ")).toThrow();
      expect(() => createMemorySession(null)).toThrow();
      expect(() => createMemorySession(123)).toThrow();
    });

    test("refuzon ID tepër të gjatë", () => {
      expect(() => createMemorySession("a".repeat(129))).toThrow();
    });

    test("refuzon konfigurimin që nuk është objekt", () => {
      expect(() => createMemorySession(null)).toThrow();
      expect(() => createMemorySession([])).toThrow();
    });

    test("refuzon sesion me ID të përsëritur", () => {
      createMemorySession("duplicate");

      expect(() => createMemorySession("duplicate")).toThrow();
    });

    test("kthen true vetëm për sesionet ekzistuese", () => {
      createMemorySession("exists");

      expect(hasMemorySession("exists")).toBe(true);
      expect(hasMemorySession("missing")).toBe(false);
    });

    test("kthen null kur sesioni nuk ekziston", () => {
      expect(getMemorySession("missing")).toBeNull();
    });

    test("kthen kopje të pavarur të sesionit", () => {
      createMemorySession({
        sessionId: "clone-session",
        metadata: {
          nested: {
            value: 1,
          },
        },
      });

      const session = getMemorySession("clone-session");
      session.metadata.nested.value = 99;
      session.messages.push({
        id: "fake",
        role: "user",
        content: "fake",
        timestamp: new Date().toISOString(),
      });

      const original = getMemorySession("clone-session");

      expect(original.metadata.nested.value).toBe(1);
      expect(original.messages).toEqual([]);
    });
  });

  describe("mesazhet", () => {
    beforeEach(() => {
      createMemorySession("messages-session");
    });

    test("shton mesazh nga përdoruesi", () => {
      const message = addMemoryMessage({
        sessionId: "messages-session",
        role: "user",
        content: "Përshëndetje!",
      });

      expect(message.role).toBe("user");
      expect(message.content).toBe("Përshëndetje!");
      expect(message.id).toBeTruthy();
      expect(message.timestamp).toBeTruthy();
    });

    test("shton përgjigje nga asistenti", () => {
      const message = addMemoryMessage({
        sessionId: "messages-session",
        role: "assistant",
        content: "Përshëndetje! Si mund të të ndihmoj?",
      });

      expect(message.role).toBe("assistant");
      expect(message.content).toBe(
        "Përshëndetje! Si mund të të ndihmoj?"
      );
    });

    test("ruan mesazhet sipas radhës", () => {
      addMemoryMessage({
        sessionId: "messages-session",
        role: "user",
        content: "Pyetja",
      });

      addMemoryMessage({
        sessionId: "messages-session",
        role: "assistant",
        content: "Përgjigjja",
      });

      expect(getMemoryHistory("messages-session").map((m) => m.content))
        .toEqual(["Pyetja", "Përgjigjja"]);
    });

    test("pastron hapësirat e tepërta rreth mesazhit", () => {
      const message = addMemoryMessage({
        sessionId: "messages-session",
        role: "user",
        content: "  Përshëndetje  ",
      });

      expect(message.content).toBe("Përshëndetje");
    });

    test("refuzon input që nuk është objekt", () => {
      expect(() => addMemoryMessage(null)).toThrow();
      expect(() => addMemoryMessage("tekst")).toThrow();
      expect(() => addMemoryMessage([])).toThrow();
    });

    test("refuzon sesion që nuk ekziston", () => {
      expect(() =>
        addMemoryMessage({
          sessionId: "missing",
          role: "user",
          content: "Test",
        })
      ).toThrow("Sesioni nuk ekziston.");
    });

    test("refuzon rolin e pavlefshëm", () => {
      expect(() =>
        addMemoryMessage({
          sessionId: "messages-session",
          role: "system",
          content: "Test",
        })
      ).toThrow();
    });

    test("refuzon përmbajtjen bosh", () => {
      expect(() =>
        addMemoryMessage({
          sessionId: "messages-session",
          role: "user",
          content: "",
        })
      ).toThrow();

      expect(() =>
        addMemoryMessage({
          sessionId: "messages-session",
          role: "user",
          content: "   ",
        })
      ).toThrow();
    });

    test("refuzon mesazhin që nuk është tekst", () => {
      expect(() =>
        addMemoryMessage({
          sessionId: "messages-session",
          role: "user",
          content: null,
        })
      ).toThrow();
    });

    test("refuzon mesazhe mbi 8000 karaktere", () => {
      expect(() =>
        addMemoryMessage({
          sessionId: "messages-session",
          role: "user",
          content: "a".repeat(8001),
        })
      ).toThrow();
    });

    test("pranon mesazh me 8000 karaktere", () => {
      const message = addMemoryMessage({
        sessionId: "messages-session",
        role: "user",
        content: "a".repeat(8000),
      });

      expect(message.content).toHaveLength(8000);
    });

    test("ruan metadata të mesazhit si kopje", () => {
      const metadata = {
        source: "test",
        details: {
          language: "sq",
        },
      };

      addMemoryMessage({
        sessionId: "messages-session",
        role: "user",
        content: "Test",
        metadata,
      });

      metadata.details.language = "en";

      expect(getMemoryHistory("messages-session")[0].metadata.details.language)
        .toBe("sq");
    });

    test("kufizon historikun në 100 mesazhe", () => {
      for (let i = 0; i < 105; i += 1) {
        addMemoryMessage({
          sessionId: "messages-session",
          role: "user",
          content: `Mesazhi ${i}`,
        });
      }

      const history = getMemoryHistory("messages-session");

      expect(history).toHaveLength(100);
      expect(history[0].content).toBe("Mesazhi 5");
      expect(history[99].content).toBe("Mesazhi 104");
    });
  });

  describe("historia dhe konteksti", () => {
    beforeEach(() => {
      createMemorySession("history-session");

      addMemoryMessage({
        sessionId: "history-session",
        role: "user",
        content: "Pyetja 1",
      });

      addMemoryMessage({
        sessionId: "history-session",
        role: "assistant",
        content: "Përgjigjja 1",
      });

      addMemoryMessage({
        sessionId: "history-session",
        role: "user",
        content: "Pyetja 2",
      });
    });

    test("kthen historinë e plotë", () => {
      expect(getMemoryHistory("history-session")).toHaveLength(3);
    });

    test("kthen histori bosh për sesion që mungon", () => {
      expect(getMemoryHistory("missing")).toEqual([]);
    });

    test("kufizon historinë me options.limit", () => {
      const history = getMemoryHistory("history-session", {
        limit: 2,
      });

      expect(history).toHaveLength(2);
      expect(history[0].content).toBe("Përgjigjja 1");
      expect(history[1].content).toBe("Pyetja 2");
    });

    test("kthen histori bosh kur limiti është zero", () => {
      expect(
        getMemoryHistory("history-session", { limit: 0 })
      ).toEqual([]);
    });

    test("kthen kontekstin e fundit të bisedës", () => {
      const context = getRecentMemoryContext("history-session", 2);

      expect(context).toHaveLength(2);
      expect(context[0].content).toBe("Përgjigjja 1");
      expect(context[1].content).toBe("Pyetja 2");
    });

    test("konteksti nuk përfshin metadata të mesazheve", () => {
      addMemoryMessage({
        sessionId: "history-session",
        role: "user",
        content: "Me metadata",
        metadata: { source: "test" },
      });

      const context = getRecentMemoryContext("history-session", 1);

      expect(context[0]).not.toHaveProperty("metadata");
    });

    test("pastron historinë pa fshirë sesionin", () => {
      const result = clearMemoryHistory("history-session");

      expect(result).toEqual({
        cleared: true,
        removedMessages: 3,
      });
      expect(hasMemorySession("history-session")).toBe(true);
      expect(getMemoryHistory("history-session")).toEqual([]);
    });

    test("kthen rezultat të përcaktuar kur sesioni mungon", () => {
      expect(clearMemoryHistory("missing")).toEqual({
        cleared: false,
        removedMessages: 0,
      });
    });
  });

  describe("metadata dhe aktiviteti", () => {
    test("përditëson metadata të sesionit", () => {
      createMemorySession({
        sessionId: "metadata-session",
        metadata: {
          language: "sq",
          source: "web",
        },
      });

      const updated = updateMemorySessionMetadata(
        "metadata-session",
        { source: "mobile" }
      );

      expect(updated.metadata).toEqual({
        language: "sq",
        source: "mobile",
      });
    });

    test("refuzon metadata që nuk është objekt", () => {
      createMemorySession("metadata-invalid");

      expect(() =>
        updateMemorySessionMetadata("metadata-invalid", null)
      ).toThrow();

      expect(() =>
        updateMemorySessionMetadata("metadata-invalid", [])
      ).toThrow();
    });

    test("kthen null kur sesioni për metadata nuk ekziston", () => {
      expect(
        updateMemorySessionMetadata("missing", { language: "sq" })
      ).toBeNull();
    });

    test("touch përditëson lastAccessedAt", () => {
      createMemorySession("touch-session");

      const before = getMemorySession("touch-session").lastAccessedAt;
      const touched = touchMemorySession("touch-session");

      expect(touched.lastAccessedAt).toBeTruthy();
      expect(Date.parse(touched.lastAccessedAt))
        .toBeGreaterThanOrEqual(Date.parse(before));
    });

    test("touch kthen null kur sesioni nuk ekziston", () => {
      expect(touchMemorySession("missing")).toBeNull();
    });
  });

  describe("fshirja e sesioneve", () => {
    test("fshin sesionin dhe kthen rezultatin", () => {
      createMemorySession("delete-session");

      expect(deleteMemorySession("delete-session")).toEqual({
        deleted: true,
      });

      expect(hasMemorySession("delete-session")).toBe(false);
    });

    test("raporton kur sesioni nuk ekziston", () => {
      expect(deleteMemorySession("missing")).toEqual({
        deleted: false,
      });
    });

    test("refuzon ID të pavlefshme gjatë fshirjes", () => {
      expect(() => deleteMemorySession("")).toThrow();
    });

    test("pastron të gjitha sesionet dhe kthen statistikat e fshirjes", () => {
      createMemorySession("clear-1");
      createMemorySession("clear-2");

      addMemoryMessage({
        sessionId: "clear-1",
        role: "user",
        content: "Test",
      });

      expect(clearAllMemory()).toEqual({
        removedSessions: 2,
        cleared: true,
      });

      expect(getMemoryStats().activeSessions).toBe(0);
      expect(getMemoryStats().totalMessages).toBe(0);
    });
  });

  describe("pastrimi i sesioneve joaktive", () => {
    test("pastron sesionet që kanë kaluar afatin", () => {
      createMemorySession("expired-1");
      createMemorySession("expired-2");

      const sessions = [
        getMemorySession("expired-1"),
        getMemorySession("expired-2"),
      ];

      const latestActivity = Math.max(
        ...sessions.map((session) =>
          Date.parse(session.lastAccessedAt)
        )
      );

      const result = cleanupExpiredMemorySessions({
        maxIdleMs: 1000,
        now: latestActivity + 2000,
      });

      expect(result).toEqual({
        removed: 2,
        remaining: 0,
      });

      expect(hasMemorySession("expired-1")).toBe(false);
      expect(hasMemorySession("expired-2")).toBe(false);
    });

    test("ruan sesionin që është përdorur së fundmi", () => {
      createMemorySession("active-session");

      const result = cleanupExpiredMemorySessions({
        maxIdleMs: 60_000,
        now: Date.now(),
      });

      expect(result).toEqual({
        removed: 0,
        remaining: 1,
      });

      expect(hasMemorySession("active-session")).toBe(true);
    });

    test("refuzon maxIdleMs të pavlefshëm", () => {
      expect(() =>
        cleanupExpiredMemorySessions({ maxIdleMs: -1 })
      ).toThrow();

      expect(() =>
        cleanupExpiredMemorySessions({ maxIdleMs: NaN })
      ).toThrow();
    });

    test("refuzon kohën now të pavlefshme", () => {
      expect(() =>
        cleanupExpiredMemorySessions({
          maxIdleMs: 1000,
          now: NaN,
        })
      ).toThrow();
    });
  });

  describe("eksportimi i memories", () => {
    test("eksporton sesionin, metadata-n dhe historinë", () => {
      createMemorySession({
        sessionId: "export-session",
        metadata: { language: "sq" },
      });

      addMemoryMessage({
        sessionId: "export-session",
        role: "user",
        content: "Përshëndetje",
      });

      addMemoryMessage({
        sessionId: "export-session",
        role: "assistant",
        content: "Përshëndetje!",
      });

      const snapshot = exportMemorySession("export-session");

      expect(snapshot.schemaVersion).toBe(1);
      expect(snapshot.engineVersion).toBe("1.3.0");
      expect(snapshot.session.sessionId).toBe("export-session");
      expect(snapshot.session.metadata.language).toBe("sq");
      expect(snapshot.session.messages).toHaveLength(2);
      expect(Number.isFinite(Date.parse(snapshot.exportedAt))).toBe(true);
    });

    test("kthen null për sesion që nuk ekziston", () => {
      expect(exportMemorySession("missing")).toBeNull();
    });

    test("snapshot-i është kopje e pavarur", () => {
      createMemorySession("export-copy");

      addMemoryMessage({
        sessionId: "export-copy",
        role: "user",
        content: "Origjinali",
      });

      const snapshot = exportMemorySession("export-copy");
      snapshot.session.messages[0].content = "Ndryshuar";

      expect(getMemoryHistory("export-copy")[0].content).toBe(
        "Origjinali"
      );
    });
  });

  describe("rikthimi i memories", () => {
    test("rikthen sesionin nga snapshot", () => {
      createMemorySession({
        sessionId: "restore-source",
        metadata: { language: "sq" },
      });

      addMemoryMessage({
        sessionId: "restore-source",
        role: "user",
        content: "Pyetje",
      });

      addMemoryMessage({
        sessionId: "restore-source",
        role: "assistant",
        content: "Përgjigje",
      });

      const snapshot = exportMemorySession("restore-source");
      deleteMemorySession("restore-source");

      const restored = restoreMemorySession(
        "restore-source",
        snapshot
      );

      expect(restored.sessionId).toBe("restore-source");
      expect(restored.metadata.language).toBe("sq");
      expect(restored.messages).toHaveLength(2);
      expect(getMemoryHistory("restore-source")).toHaveLength(2);
    });

    test("ruan ID-të dhe timestamp-et e mesazheve", () => {
      createMemorySession("restore-identity");

      addMemoryMessage({
        sessionId: "restore-identity",
        role: "user",
        content: "Mesazhi origjinal",
      });

      const original = getMemoryHistory("restore-identity")[0];
      const snapshot = exportMemorySession("restore-identity");

      deleteMemorySession("restore-identity");
      restoreMemorySession("restore-identity", snapshot);

      const restored = getMemoryHistory("restore-identity")[0];

      expect(restored.id).toBe(original.id);
      expect(restored.timestamp).toBe(original.timestamp);
      expect(restored.content).toBe(original.content);
    });

    test("refuzon snapshot bosh ose me skemë të pavlefshme", () => {
      expect(() =>
        restoreMemorySession("invalid-1", null)
      ).toThrow();

      expect(() =>
        restoreMemorySession("invalid-2", {
          schemaVersion: 999,
          session: {},
        })
      ).toThrow();
    });

    test("refuzon mospërputhjen e ID-së", () => {
      createMemorySession("snapshot-source");

      const snapshot = exportMemorySession("snapshot-source");

      expect(() =>
        restoreMemorySession("different-session", snapshot)
      ).toThrow();
    });

    test("refuzon rikthimin mbi sesion ekzistues", () => {
      createMemorySession("restore-duplicate");

      const snapshot = exportMemorySession("restore-duplicate");

      expect(() =>
        restoreMemorySession("restore-duplicate", snapshot)
      ).toThrow();
    });

    test("refuzon historikun që nuk është varg", () => {
      expect(() =>
        restoreMemorySession("invalid-history", {
          schemaVersion: 1,
          session: {
            sessionId: "invalid-history",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: "not-an-array",
          },
        })
      ).toThrow();

      expect(hasMemorySession("invalid-history")).toBe(false);
    });

    test("refuzon ID të përsëritura të mesazheve në snapshot", () => {
      createMemorySession("duplicate-message-source");

      addMemoryMessage({
        sessionId: "duplicate-message-source",
        role: "user",
        content: "Test",
      });

      const snapshot = exportMemorySession(
        "duplicate-message-source"
      );

      snapshot.session.messages.push({
        ...snapshot.session.messages[0],
      });

      deleteMemorySession("duplicate-message-source");

      expect(() =>
        restoreMemorySession(
          "duplicate-message-source",
          snapshot
        )
      ).toThrow();

      expect(hasMemorySession("duplicate-message-source")).toBe(false);
    });
  });
});
