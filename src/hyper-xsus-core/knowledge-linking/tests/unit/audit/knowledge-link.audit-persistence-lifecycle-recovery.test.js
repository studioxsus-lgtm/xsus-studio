import { describe, it, expect, vi } from "vitest";

import {
  createKnowledgeLinkAuditPersistence,
  KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION,
} from "../../../audit/knowledge-link.audit-persistence.js";

function createEvent(overrides = {}) {
  return {
    type: "verification",
    status: "success",
    details: {
      operation: "index-integrity-check",
      component: "knowledge-linking",
    },
    ...overrides,
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

async function createInitializedPersistence(storage, options = {}) {
  return createKnowledgeLinkAuditPersistence({
    storage,
    ...options,
  });
}

describe("XSUS Hyper Core — Audit Persistence Lifecycle & Recovery", () => {
  it("ruan versionin publik të Persistence", () => {
    expect(KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION).toBe("1.0.0");
  });

  it("rikthen historikun dhe ruan ID-të origjinale", async () => {
    const storage = createStorage();
    const first = await createInitializedPersistence(storage);

    const original = await first.addEvent(
      createEvent({
        details: { operation: "original-event" },
      }),
    );

    await first.close();

    const restored = await createInitializedPersistence(storage);
    const recovered = restored.getEventById(original.id);

    expect(recovered).not.toBeNull();
    expect(recovered.id).toBe(original.id);
    expect(recovered.timestamp).toBe(original.timestamp);
    expect(recovered.details).toEqual(original.details);

    await restored.close();
  });

  it("lejon shtimin e eventeve të reja pas restaurimit", async () => {
    const storage = createStorage();
    const first = await createInitializedPersistence(storage);

    const original = await first.addEvent(
      createEvent({
        details: { operation: "before-restart" },
      }),
    );

    await first.close();

    const restored = await createInitializedPersistence(storage);

    const next = await restored.addEvent(
      createEvent({
        type: "rebuild",
        details: { operation: "after-restart" },
      }),
    );

    expect(next.id).not.toBe(original.id);
    expect(
      restored.listEvents({
        newestFirst: false,
        limit: 10,
      }).count,
    ).toBe(2);

    await restored.close();
  });

  it("ruan rendin e eventeve pas disa cikleve restaurimi", async () => {
    const storage = createStorage();
    const first = await createInitializedPersistence(storage);

    const firstEvent = await first.addEvent(
      createEvent({ details: { order: 1 } }),
    );

    const secondEvent = await first.addEvent(
      createEvent({
        type: "rebuild",
        details: { order: 2 },
      }),
    );

    await first.close();

    const second = await createInitializedPersistence(storage);

    const thirdEvent = await second.addEvent(
      createEvent({
        type: "recovery",
        details: { order: 3 },
      }),
    );

    await second.close();

    const third = await createInitializedPersistence(storage);

    const history = third.listEvents({
      limit: 10,
      newestFirst: false,
    });

    expect(history.events.map((event) => event.id)).toEqual([
      firstEvent.id,
      secondEvent.id,
      thirdEvent.id,
    ]);

    expect(history.events.map((event) => event.details.order)).toEqual([
      1,
      2,
      3,
    ]);

    await third.close();
  });

  it("pastron historikun në RAM dhe storage", async () => {
    const storage = createStorage();
    const persistence = await createInitializedPersistence(storage);

    await persistence.addEvent(createEvent());
    await persistence.addEvent(createEvent({ type: "rebuild" }));

    const result = await persistence.clear();

    expect(result.success).toBe(true);
    expect(persistence.listEvents().count).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);

    await persistence.close();
  });

  it("ruan gjendjen bosh pas restaurimit të një historiku të pastruar", async () => {
    const storage = createStorage();
    const first = await createInitializedPersistence(storage);

    await first.addEvent(createEvent());
    await first.clear();
    await first.close();

    const restored = await createInitializedPersistence(storage);

    expect(restored.listEvents().count).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);

    await restored.close();
  });

  it("rikuperon ruajtjen pas një dështimi të përkohshëm", async () => {
    const storage = createStorage();

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Temporary storage failure"),
    );

    const persistence = await createInitializedPersistence(storage);

    await expect(
      persistence.addEvent(createEvent()),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.listEvents().count).toBe(1);
    expect(persistence.getStatus().persistenceFailed).toBe(true);

    await persistence.addEvent(
      createEvent({
        type: "rebuild",
        details: { operation: "retry" },
      }),
    );

    await persistence.flush();

    expect(persistence.getStatus().persistenceFailed).toBe(false);
    expect(storage.getSnapshot()).toHaveLength(2);

    await persistence.close();
  });

  it("ruan gjendjen përfundimtare pas pastrimit kur ruajtja paraprake dështon", async () => {
    const storage = createStorage();
    const persistence = await createInitializedPersistence(storage);

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Temporary failure"),
    );

    await expect(
      persistence.addEvent(createEvent()),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    const clearResult = await persistence.clear();

    expect(clearResult.success).toBe(true);

    await persistence.flush();

    expect(persistence.listEvents().count).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);
    expect(persistence.getStatus().persistenceFailed).toBe(false);

    await persistence.close();
  });

  it("pret ruajtjen e përfunduar përpara mbylljes", async () => {
    const storage = createStorage();

    let releaseSave;
    let signalSaveStarted;

    const saveStarted = new Promise((resolve) => {
      signalSaveStarted = resolve;
    });

    storage.saveHistory.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseSave = resolve;
          signalSaveStarted();
        }),
    );

    const persistence = await createInitializedPersistence(storage);

    const addOperation = persistence.addEvent(createEvent());

    // Prit derisa saveHistory të ketë nisur realisht.
    await saveStarted;

    const closeOperation = persistence.close();

    expect(persistence.getStatus().closed).toBe(false);

    // Përfundo ruajtjen e eventit.
    releaseSave();

    await addOperation;

    const closeResult = await closeOperation;

    expect(closeResult.success).toBe(true);
    expect(closeResult.closed).toBe(true);
    expect(persistence.getStatus().closed).toBe(true);
    expect(storage.getSnapshot()).toHaveLength(1);
  });

  it("nuk e mbyll Persistence kur flush dështon", async () => {
    const storage = createStorage();

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Storage unavailable"),
    );

    const persistence = await createInitializedPersistence(storage);

    await expect(
      persistence.addEvent(createEvent()),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    await expect(
      persistence.close(),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.getStatus().closed).toBe(false);
    expect(persistence.getStatus().eventCount).toBe(1);
  });

  it("lejon restaurimin pas mbylljes së suksesshme", async () => {
    const storage = createStorage();
    const first = await createInitializedPersistence(storage);

    const event = await first.addEvent(
      createEvent({
        details: { operation: "close-and-restore" },
      }),
    );

    await first.close();

    const restored = await createInitializedPersistence(storage);

    expect(restored.getEventById(event.id)).not.toBeNull();
    expect(restored.listEvents().count).toBe(1);

    await restored.close();
  });

  it("e trajton mbylljen e përsëritur si operacion idempotent", async () => {
    const storage = createStorage();
    const persistence = await createInitializedPersistence(storage);

    await persistence.addEvent(createEvent());

    const firstClose = await persistence.close();
    const secondClose = await persistence.close();

    expect(firstClose.alreadyClosed).toBe(false);
    expect(secondClose.alreadyClosed).toBe(true);
    expect(secondClose.closed).toBe(true);
  });
});
