
import { beforeEach, describe, expect, it, vi } from "vitest";

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

    expect(status.version).toBe(KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION);
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
    expect(() => createKnowledgeLinkAuditTrail(null)).toThrow();
    expect(() => createKnowledgeLinkAuditTrail([])).toThrow();
    expect(() => createKnowledgeLinkAuditTrail(new Date())).toThrow();
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
    const trail = createKnowledgeLinkAuditTrail({ maxEvents: 5 });
    expect(trail.getStatus().maxEvents).toBe(5);
  });

  it("refuzon idGenerator që nuk është funksion", () => {
    expect(() =>
      createKnowledgeLinkAuditTrail({ idGenerator: "invalid" }),
    ).toThrow();
  });

  it("refuzon clock që nuk është funksion", () => {
    expect(() =>
      createKnowledgeLinkAuditTrail({ clock: "invalid" }),
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
      details: { source: "unit-test" },
    });

    expect(event).toMatchObject({
      type: "verification",
      status: "success",
      timestamp,
      version: KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
      details: { source: "unit-test" },
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
        details: { invalid: undefined },
      }),
    ).toThrow();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        details: { invalid: () => {} },
      }),
    ).toThrow();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        details: { invalid: Symbol("unsupported") },
      }),
    ).toThrow();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        details: { invalid: 10n },
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
    const trail = createKnowledgeLinkAuditTrail({ maxEvents: 2 });

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
    const trail = createKnowledgeLinkAuditTrail({ maxEvents: 2 });

    const first = trail.restoreEvent(
      createRestoredEvent({ id: "restore-1" }),
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

// ============================================================
// LIFECYCLE & CLOSE INTEGRITY
// ============================================================

describe("Knowledge Link Audit Trail — Lifecycle & Close Integrity", () => {
  const timestamp = "2026-04-01T12:00:00.000Z";

  function createPopulatedTrail() {
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

    return trail;
  }

  it("mbyll engine-in me sukses", () => {
    const trail = createKnowledgeLinkAuditTrail();
    const result = trail.close();

    expect(result).toEqual({
      success: true,
      closed: true,
      alreadyClosed: false,
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(trail.getStatus().closed).toBe(true);
  });

  it("pastron historikun gjatë mbylljes", () => {
    const trail = createPopulatedTrail();

    expect(trail.getStatus().eventCount).toBe(2);

    trail.close();

    expect(trail.getStatus().eventCount).toBe(0);
    expect(trail.getStatus().closed).toBe(true);
  });

  it("close është idempotent", () => {
    const trail = createPopulatedTrail();

    const first = trail.close();
    const second = trail.close();

    expect(first).toEqual({
      success: true,
      closed: true,
      alreadyClosed: false,
    });

    expect(second).toEqual({
      success: true,
      closed: true,
      alreadyClosed: true,
    });

    expect(Object.isFrozen(second)).toBe(true);
  });

  it("getStatus mbetet i disponueshëm pas mbylljes", () => {
    const trail = createPopulatedTrail();

    trail.close();

    const status = trail.getStatus();

    expect(status.closed).toBe(true);
    expect(status.eventCount).toBe(0);
    expect(status.version).toBe(KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION);
    expect(Object.isFrozen(status)).toBe(true);
  });

  it("refuzon addEvent pas mbylljes", () => {
    const trail = createKnowledgeLinkAuditTrail();

    trail.close();

    expect(() =>
      trail.addEvent({
        type: "verification",
        status: "success",
        timestamp,
      }),
    ).toThrow();
  });

  it("refuzon restoreEvent pas mbylljes", () => {
    const trail = createKnowledgeLinkAuditTrail();

    trail.close();

    expect(() =>
      trail.restoreEvent({
        id: "restored-after-close",
        type: "verification",
        status: "success",
        timestamp,
      }),
    ).toThrow();
  });

  it("refuzon getEventById pas mbylljes", () => {
    const trail = createKnowledgeLinkAuditTrail();

    trail.close();

    expect(() => trail.getEventById("some-id")).toThrow();
  });

  it("refuzon listEvents pas mbylljes", () => {
    const trail = createKnowledgeLinkAuditTrail();

    trail.close();

    expect(() => trail.listEvents()).toThrow();
  });

  it("refuzon searchEvents pas mbylljes", () => {
    const trail = createKnowledgeLinkAuditTrail();

    trail.close();

    expect(() => trail.searchEvents()).toThrow();
  });

  it("refuzon clear pas mbylljes", () => {
    const trail = createKnowledgeLinkAuditTrail();

    trail.close();

    expect(() => trail.clear()).toThrow();
  });

  it("nuk lejon rikthimin e engine-it pas mbylljes", () => {
    const trail = createKnowledgeLinkAuditTrail();

    trail.close();

    expect(() =>
      trail.addEvent({
        type: "recovery",
        status: "success",
        timestamp,
      }),
    ).toThrow();

    expect(trail.getStatus().eventCount).toBe(0);
  });

  it("mbyllja e dytë nuk ndryshon gjendjen e engine-it", () => {
    const trail = createPopulatedTrail();

    trail.close();

    const firstStatus = trail.getStatus();

    trail.close();

    const secondStatus = trail.getStatus();

    expect(secondStatus).toEqual(firstStatus);
  });
});

// ============================================================
// SEARCH, FILTERING, DATE RANGES & ORDERING
// ============================================================

describe("Knowledge Link Audit Trail — Search & Filtering", () => {
  const dates = [
    "2026-05-01T10:00:00.000Z",
    "2026-05-02T10:00:00.000Z",
    "2026-05-03T10:00:00.000Z",
    "2026-05-04T10:00:00.000Z",
  ];

  function createTrail() {
    const trail = createKnowledgeLinkAuditTrail();

    trail.addEvent({
      type: "verification",
      status: "success",
      timestamp: dates[0],
    });

    trail.addEvent({
      type: "rebuild",
      status: "failure",
      timestamp: dates[1],
    });

    trail.addEvent({
      type: "recovery",
      status: "success",
      timestamp: dates[2],
    });

    trail.addEvent({
      type: "verification",
      status: "failure",
      timestamp: dates[3],
    });

    return trail;
  }

  it("listEvents kthen ngjarjet më të reja të parat", () => {
    const result = createTrail().listEvents();

    expect(result.count).toBe(4);
    expect(result.total).toBe(4);
    expect(result.events.map((event) => event.timestamp)).toEqual([
      dates[3],
      dates[2],
      dates[1],
      dates[0],
    ]);
  });

  it("listEvents mbështet renditjen oldest-first", () => {
    const result = createTrail().listEvents({ newestFirst: false });

    expect(result.events.map((event) => event.timestamp)).toEqual(dates);
  });

  it("filtron sipas event type", () => {
    const result = createTrail().listEvents({
      type: "verification",
    });

    expect(result.total).toBe(2);
    expect(result.events.every(
      (event) => event.type === "verification",
    )).toBe(true);
  });

  it("filtron sipas status", () => {
    const result = createTrail().listEvents({
      status: "failure",
    });

    expect(result.total).toBe(2);
    expect(result.events.every(
      (event) => event.status === "failure",
    )).toBe(true);
  });

  it("kombinon filtrat type dhe status", () => {
    const result = createTrail().listEvents({
      type: "verification",
      status: "failure",
    });

    expect(result.total).toBe(1);
    expect(result.events[0].timestamp).toBe(dates[3]);
  });

  it("respekton limit", () => {
    const result = createTrail().listEvents({ limit: 2 });

    expect(result.count).toBe(2);
    expect(result.total).toBe(4);
    expect(result.events).toHaveLength(2);
  });

  it("kthen rezultat bosh kur nuk ka përputhje", () => {
    const result = createTrail().listEvents({
      type: "rebuild",
      status: "success",
    });

    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
    expect(result.events).toEqual([]);
  });

  it("refuzon options të pavlefshme", () => {
    const trail = createTrail();

    expect(() => trail.listEvents(null)).toThrow();
    expect(() => trail.listEvents([])).toThrow();
  });

  it("refuzon event type të pavlefshëm në listEvents", () => {
    expect(() => createTrail().listEvents({
      type: "invalid",
    })).toThrow();
  });

  it("refuzon status të pavlefshëm në listEvents", () => {
    expect(() => createTrail().listEvents({
      status: "pending",
    })).toThrow();
  });

  it.each([0, -1, 1.5, "2", null])(
    "refuzon limit të pavlefshëm në listEvents: %s",
    (limit) => {
      expect(() => createTrail().listEvents({ limit })).toThrow();
    },
  );

  it("refuzon newestFirst që nuk është boolean", () => {
    expect(() => createTrail().listEvents({
      newestFirst: "true",
    })).toThrow();
  });

  it("searchEvents filtron nga data fillestare", () => {
    const result = createTrail().searchEvents({ from: dates[1] });

    expect(result.total).toBe(3);
    expect(result.events).toHaveLength(3);
  });

  it("searchEvents filtron deri në datën përfundimtare", () => {
    const result = createTrail().searchEvents({ to: dates[1] });

    expect(result.total).toBe(2);
    expect(result.events).toHaveLength(2);
  });

  it("përfshin kufijtë kohorë from dhe to", () => {
    const result = createTrail().searchEvents({
      from: dates[1],
      to: dates[2],
      newestFirst: false,
    });

    expect(result.total).toBe(2);
    expect(result.events.map((event) => event.timestamp)).toEqual([
      dates[1],
      dates[2],
    ]);
  });

  it("kombinon filtrat kohorë, type dhe status", () => {
    const result = createTrail().searchEvents({
      type: "verification",
      status: "success",
      from: dates[0],
      to: dates[2],
    });

    expect(result.total).toBe(1);
    expect(result.events[0].timestamp).toBe(dates[0]);
  });

  it("respekton limit gjatë kërkimit", () => {
    const result = createTrail().searchEvents({ limit: 2 });

    expect(result.count).toBe(2);
    expect(result.total).toBe(4);
  });

  it("refuzon datën fillestare të pavlefshme", () => {
    expect(() => createTrail().searchEvents({
      from: "invalid-date",
    })).toThrow();
  });

  it("refuzon datën përfundimtare të pavlefshme", () => {
    expect(() => createTrail().searchEvents({
      to: "invalid-date",
    })).toThrow();
  });

  it("refuzon intervalin kur from është pas to", () => {
    expect(() => createTrail().searchEvents({
      from: dates[3],
      to: dates[0],
    })).toThrow();
  });

  it("refuzon filters që nuk janë objekt", () => {
    const trail = createTrail();

    expect(() => trail.searchEvents(null)).toThrow();
    expect(() => trail.searchEvents([])).toThrow();
  });

  it("refuzon event type të pavlefshëm në searchEvents", () => {
    expect(() => createTrail().searchEvents({
      type: "invalid",
    })).toThrow();
  });

  it("refuzon status të pavlefshëm në searchEvents", () => {
    expect(() => createTrail().searchEvents({
      status: "pending",
    })).toThrow();
  });

  it("refuzon newestFirst jo-boolean në searchEvents", () => {
    expect(() => createTrail().searchEvents({
      newestFirst: 1,
    })).toThrow();
  });

  it("kthen rezultat bosh për kërkim pa përputhje", () => {
    const result = createTrail().searchEvents({
      from: "2027-01-01T00:00:00.000Z",
    });

    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
    expect(result.events).toEqual([]);
  });

  it("kthen rezultate dhe listë ngjarjesh të ngrira", () => {
    const result = createTrail().searchEvents();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.events)).toBe(true);
    expect(result.events.every(
      (event) => Object.isFrozen(event),
    )).toBe(true);
  });

  it("listEvents kthen rezultate të ngrira", () => {
    const result = createTrail().listEvents();

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.events)).toBe(true);
  });
});

// ============================================================
// CLOCK & TIMESTAMP VALIDATION
// ============================================================

describe("Clock & Timestamp Validation Coverage", () => {
  it("refuzon clock që kthen timestamp të pavlefshëm", () => {
    const audit = createKnowledgeLinkAuditTrail({
      clock: () => "invalid-timestamp",
    });

    expect(() =>
      audit.addEvent({
        type: "verification",
        status: "success",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "KNOWLEDGE_LINK_AUDIT_INVALID_TIMESTAMP",
      }),
    );
  });

  it("refuzon clock që kthen vlerë jo-string", () => {
    const audit = createKnowledgeLinkAuditTrail({
      clock: () => 12345,
    });

    expect(() =>
      audit.addEvent({
        type: "verification",
        status: "success",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "KNOWLEDGE_LINK_AUDIT_INVALID_TIMESTAMP",
      }),
    );
  });
});

// ============================================================
// SEARCH DATE RANGE VALIDATION
// ============================================================

describe("Search Date Range Validation Coverage", () => {
  let audit;

  beforeEach(() => {
    audit = createKnowledgeLinkAuditTrail();

    audit.addEvent({
      type: "verification",
      status: "success",
      timestamp: "2026-01-10T10:00:00.000Z",
    });
  });

  it("refuzon from me datë të pavlefshme", () => {
    expect(() =>
      audit.searchEvents({ from: "not-a-date" }),
    ).toThrow(
      expect.objectContaining({
        code: "KNOWLEDGE_LINK_AUDIT_INVALID_DATE_RANGE",
      }),
    );
  });

  it("refuzon to me datë të pavlefshme", () => {
    expect(() =>
      audit.searchEvents({ to: "not-a-date" }),
    ).toThrow(
      expect.objectContaining({
        code: "KNOWLEDGE_LINK_AUDIT_INVALID_DATE_RANGE",
      }),
    );
  });

  it("refuzon interval kur from është pas to", () => {
    expect(() =>
      audit.searchEvents({
        from: "2026-01-11T00:00:00.000Z",
        to: "2026-01-10T00:00:00.000Z",
      }),
    ).toThrow(
      expect.objectContaining({
        code: "KNOWLEDGE_LINK_AUDIT_INVALID_DATE_RANGE",
      }),
    );
  });

  it("pranon interval me kufij kohorë të barabartë", () => {
    const result = audit.searchEvents({
      from: "2026-01-10T10:00:00.000Z",
      to: "2026-01-10T10:00:00.000Z",
    });

    expect(result.count).toBe(1);
    expect(result.total).toBe(1);
  });
});
