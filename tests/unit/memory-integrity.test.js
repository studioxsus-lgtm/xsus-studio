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
const result = inspectMemorySnapshot(null);

expect(result.valid).toBe(false);
expect(result.issues).toContainEqual(
  expect.objectContaining({ code: "INVALID_SNAPSHOT" })
);

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

test("zbulon datat e pavlefshme", () => {
const snapshot = createValidSnapshot();
snapshot.session.messages[0].timestamp = "datë-e-gabuar";

const result = inspectMemorySnapshot(snapshot);

expect(result.valid).toBe(false);
expect(result.issues).toContainEqual(
  expect.objectContaining({
    code: "INVALID_MESSAGE_TIMESTAMP",
  })
);

});

test("nuk e ndryshon snapshot-in që kontrollon", () => {
const snapshot = createValidSnapshot();
const original = JSON.stringify(snapshot);

inspectMemorySnapshot(snapshot);

expect(JSON.stringify(snapshot)).toBe(original);

});
});
