
import { describe, it, expect, vi } from "vitest";

import {
  createKnowledgeLinkAuditPersistence,
  KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION,
} from "../../../audit/knowledge-link.audit-persistence.js";

function createEvent(order) {
  return {
    type: "verification",
    status: "success",
    details: {
      operation: "transaction-integrity-test",
      order,
    },
  };
}

function createStorage(initialHistory = []) {
  let history = structuredClone(initialHistory);

  return {
    loadHistory: vi.fn(async () => structuredClone(history)),

    saveHistory: vi.fn(async (nextHistory) => {
      history = structuredClone(nextHistory);
    }),

    getSnapshot() {
      return structuredClone(history);
    },
  };
}

async function createPersistence(storage, options = {}) {
  return createKnowledgeLinkAuditPersistence({
    storage,
    ...options,
  });
}

describe("XSUS AI Core — Audit Persistence Transaction Integrity", () => {
  it("ruan versionin aktual të persistence", () => {
    expect(KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION).toBe("1.0.0");
  });

  it("ruan të gjitha eventet kur disa shtime nisin njëkohësisht", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    await Promise.all([
      persistence.addEvent(createEvent(1)),
      persistence.addEvent(createEvent(2)),
      persistence.addEvent(createEvent(3)),
      persistence.addEvent(createEvent(4)),
    ]);

    await persistence.flush();

    const saved = storage.getSnapshot();

    expect(saved).toHaveLength(4);
    expect(saved.map((event) => event.details.order)).toEqual([
      1, 2, 3, 4,
    ]);

    await persistence.close();
  });

  it("ruan gjendjen përfundimtare kur clear pasohet nga shtime të njëkohshme", async () => {
    const storage = createStorage([
      createEvent(10),
      createEvent(20),
    ]);

    const persistence = await createPersistence(storage);

    await persistence.clear();

    await Promise.all([
      persistence.addEvent(createEvent(1)),
      persistence.addEvent(createEvent(2)),
      persistence.addEvent(createEvent(3)),
    ]);

    await persistence.flush();

    const saved = storage.getSnapshot();

    expect(saved).toHaveLength(3);
    expect(saved.map((event) => event.details.order)).toEqual([
      1, 2, 3,
    ]);

    await persistence.close();
  });

  it("ruan rendin e transaksioneve të nisura njëri pas tjetrit", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    const first = persistence.addEvent(createEvent(1));
    const second = persistence.addEvent(createEvent(2));
    const third = persistence.addEvent(createEvent(3));

    await Promise.all([first, second, third]);
    await persistence.flush();

    const saved = storage.getSnapshot();

    expect(saved.map((event) => event.details.order)).toEqual([
      1, 2, 3,
    ]);

    await persistence.close();
  });

  it("rikuperon integritetin pas dështimit të një ruajtjeje ndërmjet operacioneve", async () => {
    const storage = createStorage();

    const originalSaveHistory =
      storage.saveHistory.getMockImplementation();

    storage.saveHistory
      .mockImplementationOnce(originalSaveHistory)
      .mockRejectedValueOnce(
        new Error("Transaction save failure"),
      )
      .mockImplementation(originalSaveHistory);

    const persistence = await createPersistence(storage);

    await persistence.addEvent(createEvent(1));

    await expect(
      persistence.addEvent(createEvent(2)),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    await persistence.addEvent(createEvent(3));
    await persistence.flush();

    const saved = storage.getSnapshot();

    expect(saved).toHaveLength(3);
    expect(saved.map((event) => event.details.order)).toEqual([
      1, 2, 3,
    ]);

    expect(persistence.getStatus().persistenceFailed).toBe(false);
    expect(persistence.getStatus().lastPersistenceError).toBeNull();

    await persistence.close();
  });

  it("siguron që flush të presë përfundimin e të gjitha ruajtjeve të planifikuara", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    const operations = [
      persistence.addEvent(createEvent(1)),
      persistence.addEvent(createEvent(2)),
      persistence.addEvent(createEvent(3)),
    ];

    const flushOperation = persistence.flush();

    await Promise.all(operations);
    await flushOperation;

    expect(storage.getSnapshot()).toHaveLength(3);
    expect(
      storage.getSnapshot().map((event) => event.details.order),
    ).toEqual([1, 2, 3]);

    await persistence.close();
  });

  it("ruan të njëjtën gjendje pas rikthimit nga storage", async () => {
    const storage = createStorage();
    const first = await createPersistence(storage);

    await Promise.all([
      first.addEvent(createEvent(1)),
      first.addEvent(createEvent(2)),
      first.addEvent(createEvent(3)),
    ]);

    await first.flush();
    await first.close();

    const restored = await createPersistence(storage);
    await restored.restore();

    const saved = storage.getSnapshot();

    expect(saved).toHaveLength(3);
    expect(saved.map((event) => event.details.order)).toEqual([
      1, 2, 3,
    ]);

    await restored.close();
  });
});
