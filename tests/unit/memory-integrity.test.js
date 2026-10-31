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
  test("ka versionin e pritshëm", () => {
    expect(MEMORY_INTEGRITY_VERSION).toBe("1.0.0");
  });

  test("pranon një snapshot të vlefshëm", () => {
    const result = inspectMemorySnapshot(createValidSnapshot());

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("refuzon një snapshot që nuk është objekt", () => {
    for (const snapshot of [
      null,
      undefined,
      "snapshot",
      123,
      [],
    ]) {
      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: "INVALID_SNAPSHOT" })
      );
    }
  });

  test("zbulon versionin e pambështetur të skemës", () => {
    const snapshot = createValidSnapshot();
    snapshot.schemaVersion = 99;

    const result = inspectMemorySnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "UNSUPPORTED_SCHEMA_VERSION",
      })
    );
  });

  test("zbulon versionin e pavlefshëm të motorit", () => {
    const invalidValues = ["", "   ", null, 123];

    for (const engineVersion of invalidValues) {
      const snapshot = createValidSnapshot();
      snapshot.engineVersion = engineVersion;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_ENGINE_VERSION",
        })
      );
    }
  });

  test("zbulon datën e pavlefshme të eksportimit", () => {
    const invalidValues = [
      "",
      "   ",
      "datë-e-gabuar",
      null,
      {},
    ];

    for (const exportedAt of invalidValues) {
      const snapshot = createValidSnapshot();
      snapshot.exportedAt = exportedAt;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_EXPORT_TIMESTAMP",
        })
      );
    }
  });

  test("refuzon sesionin që nuk është objekt", () => {
    for (const session of [
      null,
      undefined,
      "session",
      123,
      [],
    ]) {
      const snapshot = createValidSnapshot();
      snapshot.session = session;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_SESSION",
        })
      );
    }
  });

  test("zbulon ID të pavlefshme të sesionit", () => {
    for (const sessionId of ["", "   ", null, 123]) {
      const snapshot = createValidSnapshot();
      snapshot.session.sessionId = sessionId;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_SESSION_ID",
        })
      );
    }
  });

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
      })
    );
  });

  test("pranon metadata opsionale kur mungon", () => {
    const snapshot = createValidSnapshot();
    delete snapshot.session.metadata;

    const result = inspectMemorySnapshot(snapshot);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("zbulon metadata të pavlefshme", () => {
    for (const metadata of [null, "tekst", 123, []]) {
      const snapshot = createValidSnapshot();
      snapshot.session.metadata = metadata;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_SESSION_METADATA",
        })
      );
    }
  });

  test("zbulon koleksionin e pavlefshëm të mesazheve", () => {
    for (const messages of [null, undefined, "tekst", {}, 123]) {
      const snapshot = createValidSnapshot();
      snapshot.session.messages = messages;

      const result = inspectMemorySnapshot(snapshot);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGES_COLLECTION",
        })
      );
    }
  });

  test("zbulon mesazhe me përmbajtje bosh", () => {
    const snapshot = createValidSnapshot();
    snapshot.session.messages[0].content = "   ";

    const result = inspectMemorySnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "INVALID_MESSAGE_CONTENT",
      })
    );
  });

  test("zbulon role të pavlefshme", () => {
    const result = inspectMemoryMessage({
      id: "message-1",
      role: "system",
      content: "Test",
      timestamp: "2026-10-21T09:01:00.000Z",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "INVALID_MESSAGE_ROLE",
      })
    );
  });

  test("pranon vetëm rolet user dhe assistant", () => {
    for (const role of ["user", "assistant"]) {
      const result = inspectMemoryMessage({
        id: "message-1",
        role,
        content: "Test",
        timestamp: 1800000000000,
      });

      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    }
  });

  test("refuzon mesazhe që nuk janë objekte", () => {
    for (const message of [
      null,
      undefined,
      "tekst",
      123,
      [],
    ]) {
      const result = inspectMemoryMessage(message);

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE",
        })
      );
    }
  });

  test("zbulon ID të pavlefshme të mesazhit", () => {
    for (const id of ["", "   ", null, 123]) {
      const result = inspectMemoryMessage({
        id,
        role: "user",
        content: "Test",
        timestamp: 1800000000000,
      });

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_ID",
        })
      );
    }
  });

  test("zbulon përmbajtje të pavlefshme të mesazhit", () => {
    for (const content of ["", "   ", null, 123]) {
      const result = inspectMemoryMessage({
        id: "message-1",
        role: "user",
        content,
        timestamp: 1800000000000,
      });

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_CONTENT",
        })
      );
    }
  });

  test("zbulon timestamp të pavlefshëm të mesazhit", () => {
    for (const timestamp of [
      null,
      undefined,
      "",
      "   ",
      "datë-e-gabuar",
      Infinity,
      NaN,
      {},
    ]) {
      const result = inspectMemoryMessage({
        id: "message-1",
        role: "user",
        content: "Test",
        timestamp,
      });

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: "INVALID_MESSAGE_TIMESTAMP",
        })
      );
    }
  });

  test("pranon timestamp numerik të fundëm", () => {
    const result = inspectMemoryMessage({
      id: "message-1",
      role: "user",
      content: "Test",
      timestamp: 1800000000000,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test("pranon timestamp tekstual në format date të vlefshëm", () => {
    const result = inspectMemoryMessage({
      id: "message-1",
      role: "assistant",
      content: "Përgjigje",
      timestamp: "2026-10-21T09:01:00.000Z",
    });

    expect(result.valid).toBe(true);
  });

  test("zbulon ID të dyfishta të mesazheve", () => {
    const snapshot = createValidSnapshot();
    snapshot.session.messages[1].id =
      snapshot.session.messages[0].id;

    const result = inspectMemorySnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_MESSAGE_ID",
      })
    );
  });

  test("zbulon ID të dyfishta edhe kur mesazhi ka fusha të tjera të pavlefshme", () => {
    const snapshot = createValidSnapshot();
    snapshot.session.messages[1].id =
      snapshot.session.messages[0].id;
    snapshot.session.messages[1].content = "";

    const result = inspectMemorySnapshot(snapshot);

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "DUPLICATE_MESSAGE_ID",
      })
    );
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "INVALID_MESSAGE_CONTENT",
      })
    );
  });

  test("nuk kontrollon ID të dyfishta për ID bosh ose të pavlefshme", () => {
    const snapshot = createValidSnapshot();
    snapshot.session.messages[0].id = "";
    snapshot.session.messages[1].id = "";

    const result = inspectMemorySnapshot(snapshot);

    expect(
      result.issues.some(
        (issue) => issue.code === "DUPLICATE_MESSAGE_ID"
      )
    ).toBe(false);
    expect(
      result.issues.filter(
        (issue) => issue.code === "INVALID_MESSAGE_ID"
      )
    ).toHaveLength(2);
  });

  test("përdor path të personalizuar për kontrollin e mesazhit", () => {
    const result = inspectMemoryMessage(
      {
        id: "",
        role: "system",
        content: "",
        timestamp: "gabim",
      },
      "custom.message"
    );

    expect(result.issues.map((issue) => issue.path)).toEqual([
      "custom.message.id",
      "custom.message.role",
      "custom.message.content",
      "custom.message.timestamp",
    ]);
  });

  test("kthen të gjitha problemet për një mesazh me shumë fusha të pavlefshme", () => {
    const result = inspectMemoryMessage({
      id: "",
      role: "system",
      content: "",
      timestamp: "gabim",
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(4);
  });

  test("kthen të gjitha problemet e snapshot-it pa ndërprerë kontrollin", () => {
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

    expect(result.valid).toBe(false);

    const codes = result.issues.map((issue) => issue.code);

    expect(codes).toContain("UNSUPPORTED_SCHEMA_VERSION");
    expect(codes).toContain("INVALID_ENGINE_VERSION");
    expect(codes).toContain("INVALID_EXPORT_TIMESTAMP");
    expect(codes).toContain("INVALID_SESSION_ID");
    expect(codes).toContain("INVALID_SESSION_TIMESTAMP");
    expect(codes).toContain("INVALID_SESSION_METADATA");
    expect(codes).toContain("INVALID_MESSAGE_CONTENT");
  });

  test("nuk e ndryshon snapshot-in që kontrollon", () => {
    const snapshot = createValidSnapshot();
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

  test("kthen rezultate të ndara për kontrolle të ndryshme", () => {
    const first = inspectMemoryMessage(null);
    const second = inspectMemoryMessage(null);

    expect(first).not.toBe(second);
    expect(first.issues).not.toBe(second.issues);
  });
});
