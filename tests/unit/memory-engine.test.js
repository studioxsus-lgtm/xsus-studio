
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
  restoreMemorySession
} from "../../src/core/memory-engine.js";

describe("XSUS AI Memory Engine", () => {
  beforeEach(() => {
    clearAllMemory();
  });

  describe("versioni", () => {
    test("ekspozon versionin 1.3.0", () => {
      expect(MEMORY_ENGINE_VERSION).toBe("1.3.0");
    });

    test("raporton versionin aktual në statistika", () => {
      const stats = getMemoryStats();

      expect(stats.version).toBe("1.3.0");
      expect(stats.maxSessions).toBe(1000);
      expect(stats.maxMessagesPerSession).toBe(100);
    });
  });

  describe("krijimi i sesioneve", () => {
    test("krijon një sesion me ID të dhënë", () => {
      const session = createMemorySession("session-1");

      expect(session).toBeTruthy();
      expect(session.sessionId).toBe("session-1");
      expect(hasMemorySession("session-1")).toBe(true);
    });

    test("pranon konfigurim me sessionId", () => {
      const session = createMemorySession({
        sessionId: "session-config",
        metadata: {
          language: "sq"
        }
      });

      expect(session.sessionId).toBe("session-config");
      expect(session.metadata.language).toBe("sq");
    });

    test("regjistron datat e krijimit dhe përditësimit", () => {
      const session = createMemorySession("session-dates");

      expect(session.createdAt).toBeTruthy();
      expect(session.updatedAt).toBeTruthy();
      expect(Number.isNaN(Date.parse(session.createdAt))).toBe(false);
      expect(Number.isNaN(Date.parse(session.updatedAt))).toBe(false);
    });

    test("krijon histori bosh", () => {
      const session = createMemorySession("session-empty");

      expect(session.messages).toEqual([]);
      expect(getMemoryHistory("session-empty")).toEqual([]);
    });

    test("refuzon ID bosh", () => {
      expect(() => createMemorySession("")).toThrow();
      expect(() => createMemorySession("   ")).toThrow();
    });

    test("refuzon ID që nuk është tekst", () => {
      expect(() => createMemorySession(null)).toThrow();
      expect(() => createMemorySession(123)).toThrow();
    });

    test("refuzon ID të përsëritur", () => {
      createMemorySession("duplicate-session");

      expect(() => createMemorySession("duplicate-session")).toThrow();
    });

    test("kontrollon ekzistencën e sesionit", () => {
      createMemorySession("existing-session");

      expect(hasMemorySession("existing-session")).toBe(true);
      expect(hasMemorySession("missing-session")).toBe(false);
    });

    test("kthen sesionin e kërkuar", () => {
      createMemorySession("get-session");

      const session = getMemorySession("get-session");

      expect(session).toBeTruthy();
      expect(session.sessionId).toBe("get-session");
    });

    test("kthen vlerë të munguar për sesionin që nuk ekziston", () => {
      expect(getMemorySession("missing-session")).toBeFalsy();
    });
  });

  describe("mesazhet", () => {
    beforeEach(() => {
      createMemorySession("messages-session");
    });

    test("shton mesazh nga përdoruesi", () => {
      const message = addMemoryMessage(
        "messages-session",
        "user",
        "Përshëndetje!"
      );

      expect(message).toBeTruthy();
      expect(message.role).toBe("user");
      expect(message.content).toBe("Përshëndetje!");
    });

    test("shton përgjigje nga asistenti", () => {
      const message = addMemoryMessage(
        "messages-session",
        "assistant",
        "Përshëndetje! Si mund të të ndihmoj?"
      );

      expect(message.role).toBe("assistant");
      expect(message.content).toBe(
        "Përshëndetje! Si mund të të ndihmoj?"
      );
    });

    test("ruan mesazhet sipas radhës", () => {
      addMemoryMessage("messages-session", "user", "Pyetja");
      addMemoryMessage("messages-session", "assistant", "Përgjigjja");

      const history = getMemoryHistory("messages-session");

      expect(history).toHaveLength(2);
      expect(history[0].content).toBe("Pyetja");
      expect(history[1].content).toBe("Përgjigjja");
    });

    test("gjeneron ID dhe datë për mesazhin", () => {
      const message = addMemoryMessage(
        "messages-session",
        "user",
        "Test"
      );

      expect(message.id).toBeTruthy();
      expect(message.timestamp).toBeTruthy();
      expect(Number.isNaN(Date.parse(message.timestamp))).toBe(false);
    });

    test("refuzon rolin e pavlefshëm", () => {
      expect(() =>
        addMemoryMessage(
          "messages-session",
          "system",
          "Mesazh i pavlefshëm"
        )
      ).toThrow();
    });

    test("refuzon përmbajtjen bosh", () => {
      expect(() =>
        addMemoryMessage("messages-session", "user", "")
      ).toThrow();

      expect(() =>
        addMemoryMessage("messages-session", "user", "   ")
      ).toThrow();
    });

    test("refuzon përmbajtjen që nuk është tekst", () => {
      expect(() =>
        addMemoryMessage("messages-session", "user", null)
      ).toThrow();
    });

    test("refuzon sesionin që nuk ekziston", () => {
      expect(() =>
        addMemoryMessage("missing-session", "user", "Test")
      ).toThrow();
    });

    test("refuzon mesazhe mbi kufirin prej 8000 karakteresh", () => {
      expect(() =>
        addMemoryMessage(
          "messages-session",
          "user",
          "a".repeat(8001)
        )
      ).toThrow();
    });

    test("nuk ndryshon historinë kur mesazhi është i pavlefshëm", () => {
      addMemoryMessage("messages-session", "user", "Mesazh i vlefshëm");

      expect(() =>
        addMemoryMessage("messages-session", "invalid", "Gabim")
      ).toThrow();

      expect(getMemoryHistory("messages-session")).toHaveLength(1);
    });
  });

  describe("historia dhe konteksti", () => {
    beforeEach(() => {
      createMemorySession("history-session");
      addMemoryMessage("history-session", "user", "Pyetja 1");
      addMemoryMessage("history-session", "assistant", "Përgjigjja 1");
      addMemoryMessage("history-session", "user", "Pyetja 2");
    });

    test("kthen historinë e plotë", () => {
      const history = getMemoryHistory("history-session");

      expect(history).toHaveLength(3);
    });

    test("kthen histori bosh për sesion që nuk ekziston", () => {
      expect(getMemoryHistory("missing-history")).toEqual([]);
    });

    test("kthen kontekstin e fundit të bisedës", () => {
      const context = getRecentMemoryContext("history-session");

      expect(context).toBeTruthy();
    });

    test("mbështet kufizimin e kontekstit të fundit", () => {
      const context = getRecentMemoryContext("history-session", 2);

      expect(context).toBeTruthy();
    });

    test("pastron historinë pa fshirë sesionin", () => {
      clearMemoryHistory("history-session");

      expect(hasMemorySession("history-session")).toBe(true);
      expect(getMemoryHistory("history-session")).toEqual([]);
    });
  });

  describe("metadata", () => {
    test("përditëson metadata të sesionit", () => {
      createMemorySession("metadata-session");

      updateMemorySessionMetadata("metadata-session", {
        language: "sq",
        source: "test"
      });

      const session = getMemorySession("metadata-session");

      expect(session.metadata.language).toBe("sq");
      expect(session.metadata.source).toBe("test");
    });

    test("ruan metadata ekzistuese gjatë përditësimit", () => {
      createMemorySession({
        sessionId: "metadata-merge",
        metadata: {
          language: "sq",
          source: "web"
        }
      });

      updateMemorySessionMetadata("metadata-merge", {
        source: "mobile"
      });

      const session = getMemorySession("metadata-merge");

      expect(session.metadata.language).toBe("sq");
      expect(session.metadata.source).toBe("mobile");
    });

    test("refuzon metadata për sesion që nuk ekziston", () => {
      expect(() =>
        updateMemorySessionMetadata("missing-metadata", {
          language: "sq"
        })
      ).toThrow();
    });
  });

  describe("qasja në sesion", () => {
    test("touchMemorySession përditëson kohën e qasjes", () => {
      createMemorySession("touch-session");

      const before = getMemorySession("touch-session").lastAccessedAt;

      touchMemorySession("touch-session");

      const after = getMemorySession("touch-session").lastAccessedAt;

      expect(after).toBeTruthy();

      if (before && after) {
        expect(Date.parse(after)).toBeGreaterThanOrEqual(
          Date.parse(before)
        );
      }
    });

    test("refuzon touch për sesion që nuk ekziston", () => {
      expect(() => touchMemorySession("missing-touch")).toThrow();
    });
  });

  describe("fshirja e sesioneve", () => {
    test("fshin një sesion ekzistues", () => {
      createMemorySession("delete-session");

      deleteMemorySession("delete-session");

      expect(hasMemorySession("delete-session")).toBe(false);
    });

    test("fshirja e sesionit heq edhe historinë", () => {
      createMemorySession("delete-history");
      addMemoryMessage("delete-history", "user", "Test");

      deleteMemorySession("delete-history");

      expect(getMemoryHistory("delete-history")).toEqual([]);
      expect(hasMemorySession("delete-history")).toBe(false);
    });

    test("clearAllMemory pastron të gjitha sesionet", () => {
      createMemorySession("clear-1");
      createMemorySession("clear-2");

      clearAllMemory();

      expect(hasMemorySession("clear-1")).toBe(false);
      expect(hasMemorySession("clear-2")).toBe(false);
      expect(getMemoryStats().sessions).toBe(0);
    });
  });

  describe("pastrimi i sesioneve të skaduara", () => {
    test("pastron sesionet që kanë kaluar afatin", () => {
      createMemorySession("expired-1");
      createMemorySession("expired-2");

      const sessions = [
        getMemorySession("expired-1"),
        getMemorySession("expired-2")
      ];

      const latestAccess = Math.max(
        ...sessions.map((session) =>
          Date.parse(
            session.lastAccessedAt ??
            session.updatedAt ??
            session.createdAt
          )
        )
      );

      const removed = cleanupExpiredMemorySessions({
        maxIdleMs: 1000,
        now: latestAccess + 2000
      });

      expect(removed).toBe(2);
      expect(hasMemorySession("expired-1")).toBe(false);
      expect(hasMemorySession("expired-2")).toBe(false);
    });

    test("ruan sesionin që është përdorur së fundmi", () => {
      createMemorySession("active-session");

      const removed = cleanupExpiredMemorySessions({
        maxIdleMs: 60_000,
        now: Date.now()
      });

      expect(removed).toBe(0);
      expect(hasMemorySession("active-session")).toBe(true);
    });
  });

  describe("eksportimi i memories", () => {
    test("eksporton sesionin dhe historinë e tij", () => {
      createMemorySession({
        sessionId: "export-session",
        metadata: {
          language: "sq"
        }
      });

      addMemoryMessage("export-session", "user", "Përshëndetje");
      addMemoryMessage("export-session", "assistant", "Përshëndetje!");

      const snapshot = exportMemorySession("export-session");

      expect(snapshot).toBeTruthy();
      expect(snapshot.schemaVersion).toBe(1);
      expect(snapshot.engineVersion).toBe("1.3.0");
      expect(snapshot.session.sessionId).toBe("export-session");
      expect(snapshot.session.messages).toHaveLength(2);
      expect(snapshot.session.metadata.language).toBe("sq");
      expect(snapshot.exportedAt).toBeTruthy();
    });

    test("kthen null për sesion që nuk ekziston", () => {
      expect(exportMemorySession("missing-export")).toBeNull();
    });

    test("eksporti nuk ndryshon sesionin origjinal", () => {
      createMemorySession("immutable-export");
      addMemoryMessage("immutable-export", "user", "Origjinali");

      const snapshot = exportMemorySession("immutable-export");

      snapshot.session.messages[0].content = "Ndryshuar";

      expect(
        getMemoryHistory("immutable-export")[0].content
      ).toBe("Origjinali");
    });
  });

  describe("rikthimi i memories", () => {
    test("rikthen sesionin nga snapshot", () => {
      createMemorySession({
        sessionId: "restore-source",
        metadata: {
          language: "sq"
        }
      });

      addMemoryMessage("restore-source", "user", "Pyetje");
      addMemoryMessage("restore-source", "assistant", "Përgjigje");

      const snapshot = exportMemorySession("restore-source");

      deleteMemorySession("restore-source");

      const restored = restoreMemorySession(
        "restore-source",
        snapshot
      );

      expect(restored).toBeTruthy();
      expect(restored.sessionId).toBe("restore-source");
      expect(restored.messages).toHaveLength(2);
      expect(restored.metadata.language).toBe("sq");
      expect(getMemoryHistory("restore-source")).toHaveLength(2);
    });

    test("ruan ID-të dhe datat origjinale të mesazheve", () => {
      createMemorySession("restore-identity");
      addMemoryMessage("restore-identity", "user", "Mesazhi origjinal");

      const originalHistory = getMemoryHistory("restore-identity");
      const snapshot = exportMemorySession("restore-identity");

      deleteMemorySession("restore-identity");

      restoreMemorySession("restore-identity", snapshot);

      const restoredHistory = getMemoryHistory("restore-identity");

      expect(restoredHistory[0].id).toBe(originalHistory[0].id);
      expect(restoredHistory[0].timestamp).toBe(
        originalHistory[0].timestamp
      );
      expect(restoredHistory[0].content).toBe("Mesazhi origjinal");
    });

    test("refuzon snapshot të pavlefshëm", () => {
      expect(() =>
        restoreMemorySession("invalid-snapshot", null)
      ).toThrow();

      expect(() =>
        restoreMemorySession("invalid-schema", {
          schemaVersion: 999,
          session: {
            sessionId: "invalid-schema",
            messages: []
          }
        })
      ).toThrow();
    });

    test("refuzon mospërputhjen e ID-së së sesionit", () => {
      createMemorySession("snapshot-source");

      const snapshot = exportMemorySession("snapshot-source");

      expect(() =>
        restoreMemorySession("different-session", snapshot)
      ).toThrow();
    });

    test("refuzon rikthimin mbi një sesion ekzistues", () => {
      createMemorySession("restore-duplicate-source");

      const snapshot = exportMemorySession(
        "restore-duplicate-source"
      );

      expect(() =>
        restoreMemorySession(
          "restore-duplicate-source",
          snapshot
        )
      ).toThrow();
    });

    test("nuk regjistron sesion pas rikthimit të dështuar", () => {
      expect(() =>
        restoreMemorySession("failed-restore", {
          schemaVersion: 1,
          session: {
            sessionId: "failed-restore",
            messages: "not-an-array"
          }
        })
      ).toThrow();

      expect(hasMemorySession("failed-restore")).toBe(false);
    });
  });

  describe("statistikat", () => {
    test("raporton zero sesione kur memoria është bosh", () => {
      const stats = getMemoryStats();

      expect(stats.sessions).toBe(0);
      expect(stats.version).toBe("1.3.0");
    });

    test("numëron sesionet dhe mesazhet", () => {
      createMemorySession("stats-1");
      createMemorySession("stats-2");

      addMemoryMessage("stats-1", "user", "Pyetje");
      addMemoryMessage("stats-1", "assistant", "Përgjigje");
      addMemoryMessage("stats-2", "user", "Një pyetje tjetër");

      const stats = getMemoryStats();

      expect(stats.sessions).toBe(2);
      expect(stats.messages).toBe(3);
      expect(stats.maxSessions).toBe(1000);
      expect(stats.maxMessagesPerSession).toBe(100);
    });
  });
});
