
import { describe, expect, it, vi } from "vitest";

import {
  KNOWLEDGE_LINK_AUDIT_EVENT_TYPES,
  KNOWLEDGE_LINK_AUDIT_STATUSES,
  KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
  createKnowledgeLinkAuditTrail,
} from "../../../audit/knowledge-link.audit-trail.js";

// ============================================================
// CONFIGURATION
// ============================================================

describe("Knowledge Link Audit Trail — Configuration", () => {
  it("përdor konfigurimin standard", () => {
    const trail = createKnowledgeLinkAuditTrail();
    const status = trail.getStatus();

    expect(status.version).toBe(
      KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
    );
    expect(status.closed).toBe(false);
    expect(status.eventCount).toBe(0);
    expect(status.maxEvents).toBe(1000);
    expect(status.supportedEventTypes).toEqual(
      KNOWLEDGE_LINK_AUDIT_EVENT_TYPES,
    );
    expect(status.supportedStatuses).toEqual(
      KNOWLEDGE_LINK_AUDIT_STATUSES,
    );
  });

  it("refuzon options që nuk janë objekt i vlefshëm", () => {
    expect(() => createKnowledgeLinkAuditTrail(null))
      .toThrow();

    expect(() => createKnowledgeLinkAuditTrail([]))
      .toThrow();

    expect(() => createKnowledgeLinkAuditTrail(new Date()))
      .toThrow();
  });

  it.each([0, -1, 1.5, "10", null])(
    "refuzon maxEvents të pavlefshëm: %s",
    (maxEvents) => {
      expect(() =>
        createKnowledgeLinkAuditTrail({ maxEvents }),
      ).toThrow();
    },
  );

  it("pranon maxEvents pozitiv", () => {
    const trail = createKnowledgeLinkAuditTrail({
      maxEvents: 5,
    });

    expect(trail.getStatus().maxEvents).toBe(5);
  });

  it("refuzon idGenerator që nuk është funksion", () => {
    expect(() =>
      createKnowledgeLinkAuditTrail({
        idGenerator: "invalid",
      }),
    ).toThrow();
  });

  it("refuzon clock që nuk është funksion", () => {
    expect(() =>
      createKnowledgeLinkAuditTrail({
        clock: "invalid",
      }),
    ).toThrow();
  });
});

// ============================================================
// EVENT CREATION
// ============================================================

describe("Knowledge Link Audit Trail — Event Creation", () => {
  const timestamp = "2026-01-15T10:30:00.000Z";

  it("krijon ngjarje me të dhëna të vlefshme", () => {
    const trail = createKnowledgeLinkAuditTrail({
      clock: () => timestamp,
    });

    const event = trail.addEvent({
      type: "verification",
      status: "success",
      details: {
        source: "unit-test",
      },
    });

    expect(event).toMatchObject({
      type: "verification",
      status: "success",
      timestamp,
      version: KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
      details: {
        source: "unit-test",
      },
    });

    expect(event.id).toBeTruthy();
    expect(trail.getStatus().eventCount).toBe(1);
  });

  it("gjeneron ID unike për ngjarjet", () => {
    const trail = createKnowledgeLinkAuditTrail({
      clock: () => timestamp,
    });

    const first = trail.addEvent({
      type: "verification",
      status: "success",
    });

    const second = trail.addEvent({
      type: "verification",
      status: "success",
    });

    expect(first.id).not.toBe(second.id);
  });

  it("përdor idGenerator të personalizuar", () => {
    const idGenerator = vi.fn(
      ({ sequence }) => `custom-audit-${sequence}`,
    );

    const trail = createKnowledgeLinkAuditTrail({
      idGenerator,
      clock: () => timestamp,
    });

    const event = trail.addEvent({
      type: "rebuild",
      status: "success",
    });

    expect(event.id).toBe("custom-audit-1");
    expect(idGenerator).toHaveBeenCalledWith({
      sequence: 1,
      timestamp,
    });
  });

  it.each(["", "   ", null, 123])(
    "refuzon ID të gjeneruar të pavlefshme: %s",
    (id) => {
      const trail = createKnowledgeLinkAuditTrail({
        idGenerator: () => id,
        clock: () => timestamp,
      });

      expect(() =>
        trail.addEvent({
          type: "verification",
          status: "success",
        }),
      ).toThrow();
    },
  );

  it("refuzon ID të dyfishta", () => {
    const trail = createKnowledgeLinkAuditTrail({
      idGenerator: () => "duplicate-id",
      clock: () => timestamp,
    });

    trail.addEvent({
      type: "verification",
      status: "success",
    });

    expect(() =>
      trail.addEvent({
        type: "rebuild",
        status: "success",
      }),
    ).toThrow();
  });

  it("refuzon llojin e pavlefshëm të ngjarjes", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(() =>
      trail.addEvent({
        type: "unknown",
        status: "success",
      }),
    ).toThrow();
  });

  it("refuzon statusin e pavlefshëm", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "pending",
      }),
    ).toThrow();
  });

  it("refuzon timestamp të pavlefshëm", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        timestamp: "invalid-date",
      }),
    ).toThrow();
  });

  it("normalizon timestamp në ISO format", () => {
    const trail = createKnowledgeLinkAuditTrail();

    const event = trail.addEvent({
      type: "verification",
      status: "success",
      timestamp: "2026-01-15T12:30:00+02:00",
    });

    expect(event.timestamp).toBe(timestamp);
  });

  it("refuzon details që nuk janë objekt i vlefshëm", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        details: [],
      }),
    ).toThrow();
  });

  it("refuzon metadata me vlera të pambështetura", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        details: {
          invalid: undefined,
        },
      }),
    ).toThrow();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        details: {
          invalid: () => {},
        },
      }),
    ).toThrow();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        details: {
          invalid: Symbol("unsupported"),
        },
      }),
    ).toThrow();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        details: {
          invalid: 10n,
        },
      }),
    ).toThrow();
  });

  it("ruan metadata të pandryshueshme në të gjitha nivelet", () => {
    const trail = createKnowledgeLinkAuditTrail();

    const event = trail.addEvent({
      type: "verification",
      status: "success",
      details: {
        source: "test",
        nested: {
          values: [1, 2, 3],
        },
      },
    });

    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.details)).toBe(true);
    expect(Object.isFrozen(event.details.nested)).toBe(true);
    expect(Object.isFrozen(event.details.nested.values)).toBe(true);
  });
});

// ============================================================
// RESTORE & HISTORY INTEGRITY
// ============================================================

describe("Knowledge Link Audit Trail — Restore & History Integrity", () => {
  const timestamp = "2026-02-10T09:00:00.000Z";

  function createRestoredEvent(overrides = {}) {
    return {
      id: "original-audit-event-1",
      type: "verification",
      status: "success",
      timestamp,
      details: {
        source: "restore-test",
      },
      ...overrides,
    };
  }

  it("rikthen një ngjarje duke ruajtur ID origjinale", () => {
    const trail = createKnowledgeLinkAuditTrail();

    const restored = trail.restoreEvent(createRestoredEvent());

    expect(restored.id).toBe("original-audit-event-1");
    expect(trail.getEventById(restored.id)).toBe(restored);
    expect(trail.getStatus().eventCount).toBe(1);
  });

  it("refuzon ngjarje pa ID origjinale", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(() =>
      trail.restoreEvent(createRestoredEvent({ id: undefined })),
    ).toThrow();

    expect(() =>
      trail.restoreEvent(createRestoredEvent({ id: "" })),
    ).toThrow();

    expect(() =>
      trail.restoreEvent(createRestoredEvent({ id: "   " })),
    ).toThrow();

    expect(() =>
      trail.restoreEvent(createRestoredEvent({ id: 123 })),
    ).toThrow();
  });

  it("refuzon ID të dyfishta gjatë restore", () => {
    const trail = createKnowledgeLinkAuditTrail();
    const event = createRestoredEvent();

    trail.restoreEvent(event);

    expect(() => trail.restoreEvent(event)).toThrow();
    expect(trail.getStatus().eventCount).toBe(1);
  });

  it("refuzon input që nuk është objekt", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(() => trail.restoreEvent(null)).toThrow();
    expect(() => trail.restoreEvent([])).toThrow();
  });

  it("rikthen timestamp dhe metadata në format të normalizuar", () => {
    const trail = createKnowledgeLinkAuditTrail();

    const restored = trail.restoreEvent(
      createRestoredEvent({
        timestamp: "2026-02-10T11:00:00+02:00",
        details: {
          nested: {
            values: [1, 2],
          },
        },
      }),
    );

    expect(restored.timestamp).toBe(timestamp);
    expect(Object.isFrozen(restored)).toBe(true);
    expect(Object.isFrozen(restored.details)).toBe(true);
    expect(Object.isFrozen(restored.details.nested)).toBe(true);
    expect(Object.isFrozen(restored.details.nested.values)).toBe(true);
  });

  it("respekton maxEvents gjatë shtimit të ngjarjeve", () => {
    const trail = createKnowledgeLinkAuditTrail({
      maxEvents: 2,
    });

    const first = trail.addEvent({
      type: "verification",
      status: "success",
      timestamp,
    });

    const second = trail.addEvent({
      type: "rebuild",
      status: "success",
      timestamp,
    });

    const third = trail.addEvent({
      type: "recovery",
      status: "failure",
      timestamp,
    });

    expect(trail.getStatus().eventCount).toBe(2);
    expect(trail.getEventById(first.id)).toBeNull();
    expect(trail.getEventById(second.id)).toBe(second);
    expect(trail.getEventById(third.id)).toBe(third);
  });

  it("respekton maxEvents gjatë restore", () => {
    const trail = createKnowledgeLinkAuditTrail({
      maxEvents: 2,
    });

    const first = trail.restoreEvent(
      createRestoredEvent({
        id: "restore-1",
      }),
    );

    const second = trail.restoreEvent(
      createRestoredEvent({
        id: "restore-2",
        type: "rebuild",
      }),
    );

    const third = trail.restoreEvent(
      createRestoredEvent({
        id: "restore-3",
        type: "recovery",
      }),
    );

    expect(trail.getStatus().eventCount).toBe(2);
    expect(trail.getEventById(first.id)).toBeNull();
    expect(trail.getEventById(second.id)).toBe(second);
    expect(trail.getEventById(third.id)).toBe(third);
  });

  it("kthen null kur ID nuk është string ose nuk ekziston", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(trail.getEventById(123)).toBeNull();
    expect(trail.getEventById(null)).toBeNull();
    expect(trail.getEventById("missing-id")).toBeNull();
  });

  it("pastron historikun dhe kthen numrin e ngjarjeve të fshira", () => {
    const trail = createKnowledgeLinkAuditTrail();

    trail.addEvent({
      type: "verification",
      status: "success",
      timestamp,
    });

    trail.addEvent({
      type: "rebuild",
      status: "failure",
      timestamp,
    });

    const result = trail.clear();

    expect(result).toEqual({
      success: true,
      removed: 2,
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(trail.getStatus().eventCount).toBe(0);
  });

  it("clear kthen zero kur historiku është bosh", () => {
    const trail = createKnowledgeLinkAuditTrail();

    expect(trail.clear()).toEqual({
      success: true,
      removed: 0,
    });
  });
});
