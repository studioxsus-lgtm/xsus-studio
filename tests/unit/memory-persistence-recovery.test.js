import { afterEach, describe, expect, test, vi } from "vitest";

import { createPersistentMemory } from "../../src/core/persistent-memory.js";

describe("XSUS AI Core — Memory Persistence Recovery", () => {
afterEach(() => {
vi.restoreAllMocks();
});

function createStorage() {
const records = new Map();

return {
  records,

  get: vi.fn(async (key) => {
    if (!records.has(key)) return null;
    return structuredClone(records.get(key));
  }),

  set: vi.fn(async (key, value) => {
    records.set(key, structuredClone(value));
  }),

  delete: vi.fn(async (key) => {
    records.delete(key);
  }),
};

}

test("trajton dështimin e ruajtjes me mesazh të standardizuar", async () => {
const storage = createStorage();

storage.set.mockRejectedValueOnce(
  new Error("Storage unavailable")
);

const persistence = createPersistentMemory({
  storage,
  prefix: "xsus:recovery:",
  exportSession: vi.fn(async () => ({
    schemaVersion: 1,
    session: {
      sessionId: "recovery-save",
      messages: [],
    },
  })),
  importSession: vi.fn(async () => null),
});

await expect(
  persistence.saveSession("recovery-save")
).rejects.toThrow("Sesioni nuk mund të ruhet në storage.");

expect(storage.records.size).toBe(0);

});

test("trajton dështimin e rikthimit me mesazh të standardizuar", async () => {
const storage = createStorage();

storage.records.set("xsus:recovery:recovery-restore", {
  version: "1.0.0",
  sessionId: "recovery-restore",
  savedAt: new Date().toISOString(),
  snapshot: {
    schemaVersion: 1,
    session: {
      sessionId: "recovery-restore",
      messages: [],
    },
  },
});

const persistence = createPersistentMemory({
  storage,
  prefix: "xsus:recovery:",
  exportSession: vi.fn(async () => null),
  importSession: vi.fn(async () => {
    throw new Error("Restore failed");
  }),
});

await expect(
  persistence.restoreSession("recovery-restore")
).rejects.toThrow(
  "Sesioni nuk mund të rikthehet në memory-engine."
);

});

test("dështimi i ruajtjes nuk lë regjistrim të ri", async () => {
const storage = createStorage();

storage.set.mockRejectedValueOnce(
  new Error("Disk write failed")
);

const persistence = createPersistentMemory({
  storage,
  prefix: "xsus:recovery:",
  exportSession: vi.fn(async () => ({
    schemaVersion: 1,
    session: {
      sessionId: "no-partial-record",
      messages: [],
    },
  })),
  importSession: vi.fn(async () => null),
});

await expect(
  persistence.saveSession("no-partial-record")
).rejects.toThrow("Sesioni nuk mund të ruhet në storage.");

expect(storage.records.size).toBe(0);

});
});
