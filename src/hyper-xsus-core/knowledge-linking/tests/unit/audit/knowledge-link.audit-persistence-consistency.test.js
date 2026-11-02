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
      operation: "consistency-test",
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

describe("XSUS Hyper Core — Audit Persistence Consistency & Data Integrity", () => {
  it("ruan versionin publik 1.0.0", () => {
    expect(KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION).toBe("1.0.0");
  });

  it("ruan të gjitha eventet e shtuara paralelisht", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        persistence.addEvent(createEvent(index + 1)),
      ),
    );

    await persistence.flush();

    expect(results).toHaveLength(20);
    expect(persistence.listEvents().count).toBe(20);
    expect(storage.getSnapshot()).toHaveLength(20);

    await persistence.close();
  });

  it("gjeneron ID unike për eventet e shtuara paralelisht", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    const events = await Promise.all(
      Array.from({ length: 30 }, (_, index) =>
        persistence.addEvent(createEvent(index + 1)),
      ),
    );

    const ids = events.map((event) => event.id);

    expect(new Set(ids).size).toBe(ids.length);

    await persistence.flush();

    const storedIds = storage
      .getSnapshot()
      .map((event) => event.id);

    expect(new Set(storedIds).size).toBe(storedIds.length);

    await persistence.close();
  });

  it("ruan të njëjtin historik në RAM dhe storage pas flush", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        persistence.addEvent(createEvent(index + 1)),
      ),
    );

    await persistence.flush();

    const memoryHistory = persistence.listEvents({
      limit: 100,
      newestFirst: false,
    }).events;

    const storedHistory = storage.getSnapshot();

    expect(storedHistory).toEqual(memoryHistory);

    await persistence.close();
  });

  it("ruan rendin e eventeve sipas rendit të shtimit", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    const inputs = Array.from(
      { length: 15 },
      (_, index) => index + 1,
    );

    await Promise.all(
      inputs.map((order) =>
        persistence.addEvent(createEvent(order)),
      ),
    );

    await persistence.flush();

    const storedOrders = storage
      .getSnapshot()
      .map((event) => event.details.order);

    expect(storedOrders).toEqual(inputs);

    await persistence.close();
  });

  it("mbështet disa thirrje flush paralelisht", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    await Promise.all([
      persistence.addEvent(createEvent(1)),
      persistence.addEvent(createEvent(2)),
      persistence.addEvent(createEvent(3)),
    ]);

    const results = await Promise.all([
      persistence.flush(),
      persistence.flush(),
      persistence.flush(),
    ]);

    expect(results).toHaveLength(3);

    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.persistedEvents).toBe(3);
    }

    expect(storage.getSnapshot()).toHaveLength(3);

    await persistence.close();
  });

  it("ruan eventet e shtuara pas përfundimit të flush", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    await persistence.addEvent(createEvent(1));
    await persistence.flush();

    await persistence.addEvent(createEvent(2));
    await persistence.flush();

    expect(persistence.listEvents().count).toBe(2);
    expect(storage.getSnapshot()).toHaveLength(2);

    expect(
      storage.getSnapshot().map((event) => event.details.order),
    ).toEqual([1, 2]);

    await persistence.close();
  });

  it("rikthen të gjitha eventet pas një cikli restaurimi", async () => {
    const storage = createStorage();
    const first = await createPersistence(storage);

    const created = await Promise.all(
      Array.from({ length: 10 }, (_, index) =>
        first.addEvent(createEvent(index + 1)),
      ),
    );

    await first.flush();
    await first.close();

    const restored = await createPersistence(storage);

    const history = restored.listEvents({
      limit: 100,
      newestFirst: false,
    }).events;

    expect(history).toHaveLength(10);

    expect(history.map((event) => event.id)).toEqual(
      created.map((event) => event.id),
    );

    expect(
      history.map((event) => event.details.order),
    ).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1),
    );

    await restored.close();
  });

  it("ruan vetëm numrin maksimal të eventeve të përcaktuar", async () => {
    const storage = createStorage();

    const persistence = await createPersistence(storage, {
      maxEvents: 5,
    });

    for (let index = 1; index <= 8; index += 1) {
      await persistence.addEvent(createEvent(index));
    }

    await persistence.flush();

    expect(persistence.listEvents().count).toBe(5);
    expect(storage.getSnapshot()).toHaveLength(5);

    expect(
      storage.getSnapshot().map((event) => event.details.order),
    ).toEqual([4, 5, 6, 7, 8]);

    await persistence.close();
  });

  it("nuk humbet ndryshimet në RAM kur një ruajtje dështon", async () => {
    const storage = createStorage();

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Temporary consistency failure"),
    );

    const persistence = await createPersistence(storage);

    await expect(
      persistence.addEvent(createEvent(1)),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.listEvents().count).toBe(1);
    expect(storage.getSnapshot()).toEqual([]);
    expect(persistence.getStatus().persistenceFailed).toBe(true);

    await persistence.addEvent(createEvent(2));
    await persistence.flush();

    expect(persistence.listEvents().count).toBe(2);
    expect(storage.getSnapshot()).toHaveLength(2);
    expect(persistence.getStatus().persistenceFailed).toBe(false);

    await persistence.close();
  });

  it("ruan gjendjen bosh kur clear dhe flush thirren njëri pas tjetrit", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    await persistence.addEvent(createEvent(1));
    await persistence.addEvent(createEvent(2));

    const clearOperation = persistence.clear();
    const flushOperation = persistence.flush();

    await Promise.all([clearOperation, flushOperation]);

    expect(persistence.listEvents().count).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);

    await persistence.close();
  });

  it("refuzon operacionet e reja pas mbylljes", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    await persistence.addEvent(createEvent(1));
    await persistence.close();

    await expect(
      persistence.addEvent(createEvent(2)),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_CLOSED",
    });

    await expect(
      persistence.clear(),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_CLOSED",
    });

    expect(storage.getSnapshot()).toHaveLength(1);
  });
});
