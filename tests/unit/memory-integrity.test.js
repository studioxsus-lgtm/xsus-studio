import { describe, expect, test } from "vitest";

import {
  MEMORY_INTEGRITY_VERSION,
  inspectMemoryMessage,
  inspectMemorySnapshot,
} from "../../src/core/memory-integrity.js";

function createValidSnapshot() {
  return {
    schemaVersion: 1,
    engineVersion: "1.3.0",
    exportedAt: "2026-10-21T10:00:00.000Z",
    session: {
      sessionId: "integrity-test-session",
      createdAt: "2026-10-21T09:00:00.000Z",
      updatedAt: "2026-10-21T09:05:00.000Z",
      lastAccessedAt: "2026-10-21T09:05:00.000Z",
      metadata: { language: "sq" },
      messages: [
        {
          id: "message-1",
          role: "user",
          content: "Përshëndetje XSUS AI",
          timestamp: "2026-10-21T09:01:00.000Z",
        },
        {
          id: "message-2",
          role: "assistant",
          content: "Përshëndetje! Si mund të të ndihmoj?",
          timestamp: "2026-10-21T09:01:01.000Z",
        },
      ],
    },
  };
}

describe("XSUS AI — Memory Integrity", () => {
  describe("Versioni dhe struktura bazë", () => {
    test("ka versionin e pritshëm", () => {
      expect(MEMORY_INTEGRITY_VERSION).toBe("1.0.0");
    });

    test("pranon një snapshot të vlefshëm", () => {
      const result = inspectMemorySnapshot(createValidSnapshot());

      expect(result).toEqual({
        valid: true,
        issues: [],
      });
    });

    test.each([
      ["null", null],
      ["undefined", undefined],
      ["tekst", "snapshot"],
      ["numër", 123],
      ["array bosh", []],
    ])("refuzon snapshot-in që nuk është objekt: %s", (_, snapshot) => {
      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_SNAPSHOT",
          path: "snapshot",
        }),
      );
    });

    test("kthen vetëm një problem për snapshot që nuk është objekt", () => {
      const result = inspectMemorySnapshot([]);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("INVALID_SNAPSHOT");
    });
  });

  describe("Versioni dhe koha e snapshot-it", () => {
    test.each([0, 2, 99, "1", null, undefined])(
      "zbulon versionin e pambështetur të skemës: %s",
      (schemaVersion) => {
        const snapshot = createValidSnapshot();
        snapshot.schemaVersion = schemaVersion;

        const result = inspectMemorySnapshot(snapshot);

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: "UNSUPPORTED_SCHEMA_VERSION",
            path: "snapshot.schemaVersion",
          }),
        );
      },
    );

    test("pranon versionin e skemës 1", () => {
      const snapshot = createValidSnapshot();

      expect(inspectMemorySnapshot(snapshot).issues).not.toContainEqual(
        expect.objectContaining({
          code: "UNSUPPORTED_SCHEMA_VERSION",
        }),
      );
    });

    test.each(["", "   ", null, undefined, 123, {}])(
      "zbulon versionin e pavlefshëm të motorit: %s",
      (engineVersion) => {
        const snapshot = createValidSnapshot();
        snapshot.engineVersion = engineVersion;

        const result = inspectMemorySnapshot(snapshot);

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: "INVALID_ENGINE_VERSION",
            path: "snapshot.engineVersion",
          }),
        );
      },
    );

    test.each([
      "",
      "   ",
      "datë-e-gabuar",
      null,
      undefined,
      {},
      [],
      Infinity,
      NaN,
    ])("zbulon datën e pavlefshme të eksportimit: %s", (exportedAt) => {
      const snapshot = createValidSnapshot();
      snapshot.exportedAt = exportedAt;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_EXPORT_TIMESTAMP",
          path: "snapshot.exportedAt",
        }),
      );
    });

    test("pranon timestamp numerik të fundëm për eksportimin", () => {
      const snapshot = createValidSnapshot();
      snapshot.exportedAt = 1800000000000;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).not.toContainEqual(
        expect.objectContaining({
          code: "INVALID_EXPORT_TIMESTAMP",
        }),
      );
    });

    test("pranon timestamp tekstual që Date.parse e njeh", () => {
      const snapshot = createValidSnapshot();
      snapshot.exportedAt = "2026-10-21T10:00:00.000Z";

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).not.toContainEqual(
        expect.objectContaining({
          code: "INVALID_EXPORT_TIMESTAMP",
        }),
      );
    });
  });

  describe("Validimi i sesionit", () => {
    test.each([
      ["null", null],
      ["undefined", undefined],
      ["tekst", "session"],
      ["numër", 123],
      ["array", []],
    ])("refuzon sesionin që nuk është objekt: %s", (_, session) => {
      const snapshot = createValidSnapshot();
      snapshot.session = session;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_SESSION",
          path: "snapshot.session",
        }),
      );
    });

    test("ndalon kontrollin e sesionit kur struktura e tij është e pavlefshme", () => {
      const snapshot = createValidSnapshot();
      snapshot.session = null;

      const result = inspectMemorySnapshot(snapshot);
      const codes = result.issues.map((issue) => issue.code);

      expect(codes).toContain("INVALID_SESSION");
      expect(codes).not.toContain("INVALID_SESSION_ID");
      expect(codes).not.toContain("INVALID_MESSAGES_COLLECTION");
    });

    test.each(["", "   ", null, undefined, 123, {}])(
      "zbulon ID të pavlefshme të sesionit: %s",
      (sessionId) => {
        const snapshot = createValidSnapshot();
        snapshot.session.sessionId = sessionId;

        const result = inspectMemorySnapshot(snapshot);

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: "INVALID_SESSION_ID",
            path: "snapshot.session.sessionId",
          }),
        );
      },
    );

    test.each([
      "createdAt",
      "updatedAt",
      "lastAccessedAt",
    ])("zbulon timestamp të pavlefshëm te sesioni: %s", (field) => {
      const snapshot = createValidSnapshot();
      snapshot.session[field] = "datë-e-gabuar";

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_SESSION_TIMESTAMP",
          path: `snapshot.session.${field}`,
        }),
      );
    });

    test.each([
      ["createdAt", 1800000000000],
      ["updatedAt", "2026-10-21T09:05:00.000Z"],
      ["lastAccessedAt", 0],
    ])("pranon timestamp të vlefshëm për %s", (field, timestamp) => {
      const snapshot = createValidSnapshot();
      snapshot.session[field] = timestamp;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).not.toContainEqual(
        expect.objectContaining({
          code: "INVALID_SESSION_TIMESTAMP",
          path: `snapshot.session.${field}`,
        }),
      );
    });

    test("pranon metadata kur mungon", () => {
      const snapshot = createValidSnapshot();
      delete snapshot.session.metadata;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test("pranon metadata bosh", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.metadata = {};

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test.each([null, "tekst", 123, [], undefined])(
      "zbulon metadata të pavlefshme kur fusha është e pranishme: %s",
      (metadata) => {
        const snapshot = createValidSnapshot();
        snapshot.session.metadata = metadata;

        const result = inspectMemorySnapshot(snapshot);

        if (metadata === undefined) {
          expect(result.issues).not.toContainEqual(
            expect.objectContaining({
              code: "INVALID_SESSION_METADATA",
            }),
          );
        } else {
          expect(result.issues).toContainEqual(
            expect.objectContaining({
              code: "INVALID_SESSION_METADATA",
              path: "snapshot.session.metadata",
            }),
          );
        }
      },
    );

    test("pranon metadata si objekt me vlera të ndryshme", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.metadata = {
        language: "sq",
        enabled: true,
        count: 3,
        nested: { source: "test" },
      };

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  });

  describe("Koleksioni i mesazheve", () => {
    test.each([
      ["null", null],
      ["undefined", undefined],
      ["tekst", "tekst"],
      ["objekt", {}],
      ["numër", 123],
    ])("zbulon koleksionin e pavlefshëm: %s", (_, messages) => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages = messages;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGES_COLLECTION",
          path: "snapshot.session.messages",
        }),
      );
    });

    test("ndalon kontrollin e mesazheve kur koleksioni nuk është array", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages = {};

      const result = inspectMemorySnapshot(snapshot);
      const messageIssues = result.issues.filter((issue) =>
        issue.path.startsWith("snapshot.session.messages["),
      );

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGES_COLLECTION",
        }),
      );
      expect(messageIssues).toHaveLength(0);
    });

    test("pranon një koleksion bosh mesazhesh", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages = [];

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test("kontrollon çdo mesazh të koleksionit", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages.push(null, {
        id: "message-3",
        role: "system",
        content: "",
        timestamp: "gabim",
      });

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE",
          path: "snapshot.session.messages[2]",
        }),
      );

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_ROLE",
          path: "snapshot.session.messages[3].role",
        }),
      );

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_CONTENT",
          path: "snapshot.session.messages[3].content",
        }),
      );

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_TIMESTAMP",
          path: "snapshot.session.messages[3].timestamp",
        }),
      );
    });
  });

  describe("Validimi i mesazheve", () => {
    test.each([
      ["null", null],
      ["undefined", undefined],
      ["tekst", "tekst"],
      ["numër", 123],
      ["array", []],
    ])("refuzon mesazhin që nuk është objekt: %s", (_, message) => {
      const result = inspectMemoryMessage(message);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE",
          path: "message",
        }),
      );
    });

    test("kthen vetëm një problem kur mesazhi nuk është objekt", () => {
      const result = inspectMemoryMessage(null);

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe("INVALID_MESSAGE");
    });

    test.each(["", "   ", null, undefined, 123, {}])(
      "zbulon ID të pavlefshme të mesazhit: %s",
      (id) => {
        const result = inspectMemoryMessage({
          id,
          role: "user",
          content: "Test",
          timestamp: 1800000000000,
        });

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: "INVALID_MESSAGE_ID",
            path: "message.id",
          }),
        );
      },
    );

    test.each([
      ["system", "system"],
      ["developer", "developer"],
      ["tool", "tool"],
      ["bosh", ""],
      ["null", null],
      ["numër", 123],
    ])("refuzon rolin e pavlefshëm: %s", (_, role) => {
      const result = inspectMemoryMessage({
        id: "message-1",
        role,
        content: "Test",
        timestamp: 1800000000000,
      });

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_ROLE",
          path: "message.role",
        }),
      );
    });

    test.each(["user", "assistant"])(
      "pranon rolin e lejuar: %s",
      (role) => {
        const result = inspectMemoryMessage({
          id: "message-1",
          role,
          content: "Test",
          timestamp: 1800000000000,
        });

        expect(result.valid).toBe(true);
        expect(result.issues).toEqual([]);
      },
    );

    test.each(["", "   ", null, undefined, 123, {}])(
      "zbulon përmbajtje të pavlefshme: %s",
      (content) => {
        const result = inspectMemoryMessage({
          id: "message-1",
          role: "user",
          content,
          timestamp: 1800000000000,
        });

        expect(result.issues).toContainEqual(
          expect.objectContaining({
            code: "INVALID_MESSAGE_CONTENT",
            path: "message.content",
          }),
        );
      },
    );

    test.each([
      null,
      undefined,
      "",
      "   ",
      "datë-e-gabuar",
      Infinity,
      -Infinity,
      NaN,
      {},
      [],
    ])("zbulon timestamp të pavlefshëm: %s", (timestamp) => {
      const result = inspectMemoryMessage({
        id: "message-1",
        role: "user",
        content: "Test",
        timestamp,
      });

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_TIMESTAMP",
          path: "message.timestamp",
        }),
      );
    });

    test.each([0, 1, -1, 1800000000000, 1.5])(
      "pranon timestamp numerik të fundëm: %s",
      (timestamp) => {
        const result = inspectMemoryMessage({
          id: "message-1",
          role: "user",
          content: "Test",
          timestamp,
        });

        expect(result.valid).toBe(true);
        expect(result.issues).toEqual([]);
      },
    );

    test("pranon timestamp tekstual të vlefshëm", () => {
      const result = inspectMemoryMessage({
        id: "message-1",
        role: "assistant",
        content: "Përgjigje",
        timestamp: "2026-10-21T09:01:00.000Z",
      });

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test("kthen të gjitha problemet e një mesazhi të pavlefshëm", () => {
      const result = inspectMemoryMessage({
        id: "",
        role: "system",
        content: "",
        timestamp: "gabim",
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(4);

      expect(result.issues.map((issue) => issue.code)).toEqual([
        "INVALID_MESSAGE_ID",
        "INVALID_MESSAGE_ROLE",
        "INVALID_MESSAGE_CONTENT",
        "INVALID_MESSAGE_TIMESTAMP",
      ]);
    });

    test("përdor path të personalizuar", () => {
      const result = inspectMemoryMessage(
        {
          id: "",
          role: "system",
          content: "",
          timestamp: "gabim",
        },
        "custom.message",
      );

      expect(result.issues.map((issue) => issue.path)).toEqual([
        "custom.message.id",
        "custom.message.role",
        "custom.message.content",
        "custom.message.timestamp",
      ]);
    });

    test("përdor path-in e parazgjedhur kur nuk jepet path", () => {
      const result = inspectMemoryMessage({
        id: "",
        role: "user",
        content: "",
        timestamp: "gabim",
      });

      expect(result.issues.map((issue) => issue.path)).toEqual([
        "message.id",
        "message.content",
        "message.timestamp",
      ]);
    });
  });

  describe("Integriteti i ID-ve të mesazheve", () => {
    test("zbulon ID të dyfishta", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages[1].id =
        snapshot.session.messages[0].id;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "DUPLICATE_MESSAGE_ID",
          path: "snapshot.session.messages[1].id",
        }),
      );
    });

    test("zbulon ID të dyfishta edhe kur mesazhi ka përmbajtje të pavlefshme", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages[1].id =
        snapshot.session.messages[0].id;
      snapshot.session.messages[1].content = "";

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "DUPLICATE_MESSAGE_ID",
        }),
      );

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_CONTENT",
        }),
      );
    });

    test("nuk i trajton ID-të bosh si ID të dyfishta", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages[0].id = "";
      snapshot.session.messages[1].id = "";

      const result = inspectMemorySnapshot(snapshot);

      expect(
        result.issues.some(
          (issue) => issue.code === "DUPLICATE_MESSAGE_ID",
        ),
      ).toBe(false);

      expect(
        result.issues.filter(
          (issue) => issue.code === "INVALID_MESSAGE_ID",
        ),
      ).toHaveLength(2);
    });

    test("nuk i trajton ID-të që nuk janë tekst si ID të dyfishta", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages[0].id = 123;
      snapshot.session.messages[1].id = 123;

      const result = inspectMemorySnapshot(snapshot);

      expect(
        result.issues.some(
          (issue) => issue.code === "DUPLICATE_MESSAGE_ID",
        ),
      ).toBe(false);

      expect(
        result.issues.filter(
          (issue) => issue.code === "INVALID_MESSAGE_ID",
        ),
      ).toHaveLength(2);
    });

    test("zbulon përsëritje të shumta të së njëjtës ID", () => {
      const snapshot = createValidSnapshot();

      snapshot.session.messages.push(
        {
          id: "message-1",
          role: "user",
          content: "Mesazh i tretë",
          timestamp: 1800000000000,
        },
        {
          id: "message-1",
          role: "assistant",
          content: "Mesazh i katërt",
          timestamp: 1800000000001,
        },
      );

      const result = inspectMemorySnapshot(snapshot);

      expect(
        result.issues.filter(
          (issue) => issue.code === "DUPLICATE_MESSAGE_ID",
        ),
      ).toHaveLength(2);
    });

    test("zbulon ID të përsëritura pa ndaluar kontrollin e mesazheve të tjera", () => {
      const snapshot = createValidSnapshot();

      snapshot.session.messages[1].id = "message-1";
      snapshot.session.messages.push({
        id: "message-3",
        role: "system",
        content: "Përmbajtje",
        timestamp: 1800000000000,
      });

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "DUPLICATE_MESSAGE_ID",
        }),
      );

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_ROLE",
          path: "snapshot.session.messages[2].role",
        }),
      );
    });
  });

  describe("Mbledhja e problemeve", () => {
    test("kthen të gjitha problemet e snapshot-it pa ndërprerë validimin", () => {
      const snapshot = createValidSnapshot();

      snapshot.schemaVersion = 99;
      snapshot.engineVersion = "";
      snapshot.exportedAt = "gabim";
      snapshot.session.sessionId = "";
      snapshot.session.createdAt = "gabim";
      snapshot.session.updatedAt = "gabim";
      snapshot.session.lastAccessedAt = "gabim";
      snapshot.session.metadata = null;
      snapshot.session.messages[0].content = "";

      const result = inspectMemorySnapshot(snapshot);
      const codes = result.issues.map((issue) => issue.code);

      expect(result.valid).toBe(false);
      expect(codes).toContain("UNSUPPORTED_SCHEMA_VERSION");
      expect(codes).toContain("INVALID_ENGINE_VERSION");
      expect(codes).toContain("INVALID_EXPORT_TIMESTAMP");
      expect(codes).toContain("INVALID_SESSION_ID");
      expect(codes).toContain("INVALID_SESSION_TIMESTAMP");
      expect(codes).toContain("INVALID_SESSION_METADATA");
      expect(codes).toContain("INVALID_MESSAGE_CONTENT");
    });

    test("çdo problem përmban kod, path dhe mesazh", () => {
      const result = inspectMemoryMessage({
        id: "",
        role: "system",
        content: "",
        timestamp: "gabim",
      });

      for (const issue of result.issues) {
        expect(issue).toEqual({
          code: expect.any(String),
          path: expect.any(String),
          message: expect.any(String),
        });
      }
    });

    test("validimi i përsëritur prodhon të njëjtat probleme", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages[0].content = "";

      const first = inspectMemorySnapshot(snapshot);
      const second = inspectMemorySnapshot(snapshot);

      expect(second).toEqual(first);
    });

    test("rezultatet e kontrolleve të ndara nuk ndajnë të njëjtin objekt", () => {
      const first = inspectMemoryMessage(null);
      const second = inspectMemoryMessage(null);

      expect(first).not.toBe(second);
      expect(first.issues).not.toBe(second.issues);
      expect(first.issues[0]).not.toBe(second.issues[0]);
    });
  });

  describe("Pandryshueshmëria e të dhënave", () => {
    test("nuk e ndryshon snapshot-in që kontrollon", () => {
      const snapshot = createValidSnapshot();
      const original = JSON.stringify(snapshot);

      inspectMemorySnapshot(snapshot);

      expect(JSON.stringify(snapshot)).toBe(original);
    });

    test("nuk e ndryshon snapshot-in e pavlefshëm", () => {
      const snapshot = createValidSnapshot();
      snapshot.session.messages[0].id =
        snapshot.session.messages[1].id;
      snapshot.session.metadata = null;

      const original = JSON.stringify(snapshot);

      inspectMemorySnapshot(snapshot);

      expect(JSON.stringify(snapshot)).toBe(original);
    });

    test("nuk e ndryshon mesazhin që kontrollon", () => {
      const message = {
        id: "message-1",
        role: "user",
        content: "Test",
        timestamp: 1800000000000,
      };

      const original = JSON.stringify(message);

      inspectMemoryMessage(message);

      expect(JSON.stringify(message)).toBe(original);
    });

    test("nuk e ndryshon mesazhin e pavlefshëm", () => {
      const message = {
        id: "",
        role: "system",
        content: "",
        timestamp: "gabim",
      };

      const original = JSON.stringify(message);

      inspectMemoryMessage(message);

      expect(JSON.stringify(message)).toBe(original);
    });
  });
});
