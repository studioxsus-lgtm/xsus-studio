import { describe, it, expect, vi } from "vitest";

import {
  createKnowledgeLinkAuditPersistence,
  KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION,
} from "../../../audit/knowledge-link.audit-persistence.js";

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

function createEvent(id, overrides = {}) {
  return {
    id,
    type: overrides.type ?? "verification",
    status: overrides.status ?? "success",
    timestamp:
      overrides.timestamp ?? "2027-01-01T10:00:00.000Z",
    version: "1.0.0",
    details: overrides.details ?? {
      checkedIndexes: 3,
    },
  };
}

describe("XSUS Hyper Core — Audit Persistence Integrity", () => {
  it("përdor versionin e saktë të persistence", () => {
    expect(KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION).toBe(
      "1.0.0",
    );
  });

  it("inicializon historikun bosh kur storage nuk ka të dhëna", async () => {
    const storage = createStorage();

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    expect(storage.loadHistory).toHaveBeenCalledTimes(1);
    expect(persistence.getStatus().eventCount).toBe(0);

    await persistence.close();
  });

  it("rikthen historikun ekzistues nga storage", async () => {
    const storage = createStorage([
      createEvent("event-1"),
      createEvent("event-2", {
        type: "rebuild",
      }),
    ]);

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    const result = persistence.listEvents({
      newestFirst: false,
    });

    expect(result.count).toBe(2);
    expect(result.events[0].id).toBe("event-1");
    expect(result.events[1].id).toBe("event-2");

    await persistence.close();
  });

  it("ruan ID-të dhe timestamp-et origjinale pas rikthimit", async () => {
    const timestamp = "2027-02-10T12:30:00.000Z";

    const storage = createStorage([
      createEvent("original-event-id", { timestamp }),
    ]);

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    const restored = persistence.getEventById(
      "original-event-id",
    );

    expect(restored).not.toBeNull();
    expect(restored.id).toBe("original-event-id");
    expect(restored.timestamp).toBe(timestamp);

    await persistence.close();
  });

  it("ruan një ngjarje të re në storage", async () => {
    const storage = createStorage();

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    const event = await persistence.addEvent({
      type: "verification",
      status: "success",
      details: {
        checkedIndexes: 3,
      },
      timestamp: "2027-03-01T09:00:00.000Z",
    });

    expect(event.type).toBe("verification");
    expect(event.status).toBe("success");
    expect(storage.getSnapshot()).toHaveLength(1);
    expect(storage.getSnapshot()[0].id).toBe(event.id);

    await persistence.close();
  });

  it("ruan rendin e ngjarjeve pas disa shkrimeve", async () => {
    const storage = createStorage();

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    await persistence.addEvent({
      type: "verification",
      status: "success",
    });

    await persistence.addEvent({
      type: "rebuild",
      status: "success",
    });

    await persistence.addEvent({
      type: "recovery",
      status: "success",
    });

    const saved = storage.getSnapshot();

    expect(saved).toHaveLength(3);
    expect(saved.map((event) => event.type)).toEqual([
      "verification",
      "rebuild",
      "recovery",
    ]);

    await persistence.close();
  });

  it("respekton kufirin maxEvents", async () => {
    const storage = createStorage();

    const persistence =
      await createKnowledgeLinkAuditPersistence({
        storage,
        maxEvents: 2,
      });

    await persistence.addEvent({
      type: "verification",
      status: "success",
    });

    await persistence.addEvent({
      type: "rebuild",
      status: "success",
    });

    await persistence.addEvent({
      type: "recovery",
      status: "success",
    });

    const saved = storage.getSnapshot();

    expect(saved).toHaveLength(2);
    expect(saved[0].type).toBe("rebuild");
    expect(saved[1].type).toBe("recovery");

    await persistence.close();
  });

  it("serializon operacionet paralele të ruajtjes", async () => {
    const storage = createStorage();

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    const operations = await Promise.all([
      persistence.addEvent({
        type: "verification",
        status: "success",
      }),
      persistence.addEvent({
        type: "rebuild",
        status: "success",
      }),
      persistence.addEvent({
        type: "recovery",
        status: "success",
      }),
    ]);

    await persistence.flush();

    expect(operations).toHaveLength(3);
    expect(storage.getSnapshot()).toHaveLength(3);

    await persistence.close();
  });

  it("ruan të gjitha ndryshimet pas flush", async () => {
    const storage = createStorage();

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    await persistence.addEvent({
      type: "verification",
      status: "success",
    });

    await persistence.addEvent({
      type: "rebuild",
      status: "failure",
    });

    const result = await persistence.flush();

    expect(result.success).toBe(true);
    expect(result.persistedEvents).toBe(2);
    expect(storage.getSnapshot()).toHaveLength(2);

    await persistence.close();
  });

  it("pastron historikun edhe në storage", async () => {
    const storage = createStorage([
      createEvent("event-to-delete"),
    ]);

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    const result = await persistence.clear();

    expect(result.success).toBe(true);
    expect(result.removed).toBe(1);
    expect(persistence.getStatus().eventCount).toBe(0);
    expect(storage.getSnapshot()).toEqual([]);

    await persistence.close();
  });

  it("refuzon historik me ID të përsëritura", async () => {
    const storage = createStorage([
      createEvent("duplicate-id"),
      createEvent("duplicate-id"),
    ]);

    await expect(
      createKnowledgeLinkAuditPersistence({ storage }),
    ).rejects.toMatchObject({
      code:
        "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_DUPLICATE_EVENT_ID",
    });
  });

  it("refuzon version të papajtueshëm të ngjarjes", async () => {
    const storage = createStorage([
      {
        ...createEvent("old-version"),
        version: "9.0.0",
      },
    ]);

    await expect(
      createKnowledgeLinkAuditPersistence({ storage }),
    ).rejects.toMatchObject({
      code:
        "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_VERSION_MISMATCH",
    });
  });

  it("raporton dështimin e ngarkimit nga storage", async () => {
    const storage = createStorage();

    storage.loadHistory.mockRejectedValue(
      new Error("Storage load failure"),
    );

    await expect(
      createKnowledgeLinkAuditPersistence({ storage }),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_LOAD_FAILED",
    });
  });

  it("raporton dështimin e ruajtjes pa humbur ngjarjen në RAM", async () => {
    const storage = createStorage();

    storage.saveHistory.mockRejectedValueOnce(
      new Error("Storage save failure"),
    );

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    await expect(
      persistence.addEvent({
        type: "verification",
        status: "success",
      }),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.getStatus().eventCount).toBe(1);
    expect(persistence.getStatus().persistenceFailed).toBe(true);

    await expect(persistence.close()).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    expect(persistence.getStatus().closed).toBe(false);
  });

  it("lejon riprovimin e ruajtjes pas një dështimi", async () => {
    const storage = createStorage();

    storage.saveHistory
      .mockRejectedValueOnce(new Error("Temporary failure"));

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    await expect(
      persistence.addEvent({
        type: "verification",
        status: "success",
      }),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    await expect(
      persistence.flush(),
    ).rejects.toMatchObject({
      code: "KNOWLEDGE_LINK_AUDIT_PERSISTENCE_SAVE_FAILED",
    });

    await persistence.addEvent({
      type: "rebuild",
      status: "success",
    });

    await persistence.flush();

    expect(storage.getSnapshot()).toHaveLength(2);
    expect(persistence.getStatus().persistenceFailed).toBe(false);

    await persistence.close();
  });

  it("mbyll persistence pas flush të suksesshëm", async () => {
    const storage = createStorage();

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    await persistence.addEvent({
      type: "verification",
      status: "success",
    });

    const result = await persistence.close();

    expect(result.success).toBe(true);
    expect(result.closed).toBe(true);
    expect(persistence.getStatus().closed).toBe(true);
  });

  it("e bën close idempotent", async () => {
    const storage = createStorage();

    const persistence =
      await createKnowledgeLinkAuditPersistence({ storage });

    const first = await persistence.close();
    const second = await persistence.close();

    expect(first.alreadyClosed).toBe(false);
    expect(second.alreadyClosed).toBe(true);
  });
});
