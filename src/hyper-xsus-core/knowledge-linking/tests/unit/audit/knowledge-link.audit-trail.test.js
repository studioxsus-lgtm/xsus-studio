
import { describe, expect, it, vi } from "vitest";

import {
  KNOWLEDGE_LINK_AUDIT_EVENT_TYPES,
  KNOWLEDGE_LINK_AUDIT_STATUSES,
  KNOWLEDGE_LINK_AUDIT_TRAIL_VERSION,
  createKnowledgeLinkAuditTrail,
} from "../../../audit/knowledge-link.audit-trail.js";

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
