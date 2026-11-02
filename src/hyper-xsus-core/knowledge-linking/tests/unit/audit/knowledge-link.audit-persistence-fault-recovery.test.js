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
      operation: "fault-recovery-test",
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

describe("XSUS Hyper Core — Audit Persistence Fault Recovery", () => {
  it("ruan versionin publik 1.0.0", () => {
    expect(KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION).toBe("1.0.0");
  });

  it("rikuperon radhën pas dy dështimeve të njëpasnjëshme", async () => {
    const storage = createStorage();

    storage.saveHistory
      .mockRejectedValueOnce(new Error("Failure one"))
      .mockRejectedValueOnce(new Error("Failure two"));

    const persistence = await createPersistence(storage);

    await expect(
      persistence.addEvent(createEvent(1)),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    await expect(
      persistence.addEvent(createEvent(2)),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.listEvents().count).toBe(2);
    expect(persistence.getStatus().persistenceFailed).toBe(true);

    await persistence.addEvent(createEvent(3));
    await persistence.flush();

    expect(storage.getSnapshot()).toHaveLength(3);
    expect(persistence.getStatus().persistenceFailed).toBe(false);

    await persistence.close();
  });

  it("ruan të gjitha ndryshimet në RAM pas dështimeve të përsëritura", async () => {
    const storage = createStorage();

    storage.saveHistory
      .mockRejectedValueOnce(new Error("Temporary failure A"))
      .mockRejectedValueOnce(new Error("Temporary failure B"));

    const persistence = await createPersistence(storage);

    for (const order of [1, 2]) {
      await expect(
        persistence.addEvent(createEvent(order)),
      ).rejects.toMatchObject({
        code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
      });
    }

    expect(persistence.listEvents().count).toBe(2);

    await persistence.addEvent(createEvent(3));
    await persistence.flush();

    expect(storage.getSnapshot()).toHaveLength(3);
    expect(
      storage.getSnapshot().map((event) => event.details.order),
    ).toEqual([1, 2, 3]);

    await persistence.close();
  });

  it("ruan statusin e dështimit deri në një ruajtje të suksesshme", async () => {
    const storage = createStorage();

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Storage temporarily unavailable"),
    );

    const persistence = await createPersistence(storage);

    await expect(
      persistence.addEvent(createEvent(1)),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.getStatus().persistenceFailed).toBe(true);
    expect(persistence.getStatus().lastPersistenceError).toBe(
      "Ruajtja e historikut të auditimit dështoi.",
    );

    await persistence.addEvent(createEvent(2));

    expect(persistence.getStatus().persistenceFailed).toBe(false);
    expect(persistence.getStatus().lastPersistenceError).toBeNull();

    expect(storage.getSnapshot()).toHaveLength(2);

    await persistence.close();
  });

  it("nuk e mbyll Persistence nëse ruajtja përfundimtare dështon", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    await persistence.addEvent(createEvent(1));

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Final save failure"),
    );

    await expect(
      persistence.addEvent(createEvent(2)),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    await expect(
      persistence.close(),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.getStatus().closed).toBe(false);
    expect(persistence.listEvents().count).toBe(2);

    await persistence.addEvent(createEvent(3));
    await persistence.close();

    expect(storage.getSnapshot()).toHaveLength(3);
  });

  it("rikthen historikun e plotë pas dështimit dhe restaurimit", async () => {
    const storage = createStorage();
    const first = await createPersistence(storage);

    await first.addEvent(createEvent(1));

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Interrupted save"),
    );

    await expect(
      first.addEvent(createEvent(2)),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    await first.addEvent(createEvent(3));
    await first.close();

    const restored = await createPersistence(storage);

    const history = restored.listEvents({
      limit: 100,
      newestFirst: false,
    }).events;

    expect(history).toHaveLength(3);
    expect(
      history.map((event) => event.details.order),
    ).toEqual([1, 2, 3]);

    expect(
      history.map((event) => event.id),
    ).toEqual(
      [...new Set(history.map((event) => event.id))],
    );

    await restored.close();
  });

  it("ruan historikun bosh pas rikuperimit të një clear të dështuar", async () => {
    const storage = createStorage();
    const persistence = await createPersistence(storage);

    await persistence.addEvent(createEvent(1));
    await persistence.addEvent(createEvent(2));

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Clear save failure"),
    );

    await expect(
      persistence.clear(),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.listEvents().count).toBe(0);
    expect(persistence.getStatus().persistenceFailed).toBe(true);

    await persistence.flush().catch(() => undefined);

    await persistence.clear();
    await persistence.flush();

    expect(storage.getSnapshot()).toEqual([]);
    expect(persistence.getStatus().persistenceFailed).toBe(false);

    await persistence.close();
  });

  it("ruan rendin e ruajtjeve pas rikuperimit të radhës", async () => {
    const storage = createStorage();

    storage.saveHistory.mockRejectedValueOnce(
      new Error("First save fails"),
    );

    const persistence = await createPersistence(storage);

    const first = persistence.addEvent(createEvent(1));

    await expect(first).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    await persistence.addEvent(createEvent(2));
    await persistence.addEvent(createEvent(3));
    await persistence.flush();

    expect(
      storage.getSnapshot().map((event) => event.details.order),
    ).toEqual([1, 2, 3]);

    await persistence.close();
  });

  it("nuk lejon operacione të reja pas mbylljes së suksesshme", async () => {
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
