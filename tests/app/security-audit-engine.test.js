
import { describe, it, expect } from "vitest";

import {
  createSecurityAuditEngine,
  SECURITY_AUDIT_ENGINE_VERSION
} from "../../apps/app/security/audit/security-audit-engine.js";

describe("Security Audit Logger Engine", () => {
  const createEngine = (config = {}) =>
    createSecurityAuditEngine({ config });

  describe("Version and initialization", () => {
    it("has the expected version", () => {
      expect(SECURITY_AUDIT_ENGINE_VERSION).toBe("1.0.0");
      expect(createEngine().version).toBe("1.0.0");
    });

    it("initializes with empty storage", () => {
      const engine = createEngine();
      const status = engine.getStatus();

      expect(status.eventCount).toBe(0);
      expect(status.closed).toBe(false);
      engine.close();
    });

    it("exposes a frozen public API", () => {
      const engine = createEngine();

      expect(Object.isFrozen(engine)).toBe(true);
      engine.close();
    });
  });

  describe("Event logging", () => {
    it("logs a valid event", () => {
      const engine = createEngine();

      const event = engine.logEvent({
        type: "authentication",
        action: "login",
        subject: { id: "user-1" }
      });

      expect(event.eventId).toBe("audit-1");
      expect(event.type).toBe("authentication");
      expect(event.action).toBe("login");
      expect(event.timestamp).toBeTypeOf("number");
      engine.close();
    });

    it("assigns unique event IDs", () => {
      const engine = createEngine();

      const first = engine.logEvent({
        type: "authentication",
        action: "login"
      });

      const second = engine.logEvent({
        type: "authorization",
        action: "access-denied"
      });

      expect(first.eventId).not.toBe(second.eventId);
      engine.close();
    });

    it("preserves append-only event order", () => {
      const engine = createEngine();

      engine.logEvent({ type: "security", action: "first" });
      engine.logEvent({ type: "security", action: "second" });

      const events = engine.listEvents();

      expect(events).toHaveLength(2);
      expect(events[0].action).toBe("first");
      expect(events[1].action).toBe("second");
      engine.close();
    });

    it("does not expose internal event references", () => {
      const engine = createEngine();

      const logged = engine.logEvent({
        type: "security",
        action: "login",
        metadata: { source: "test" }
      });

      logged.metadata.source = "modified";

      const stored = engine.getEvent(logged.eventId);

      expect(stored.metadata.source).toBe("test");
      engine.close();
    });

    it("rejects invalid events", () => {
      const engine = createEngine();

      expect(() => engine.logEvent(null)).toThrow();
      expect(engine.getStatus().eventCount).toBe(0);
      engine.close();
    });
  });

  describe("Event retrieval", () => {
    it("retrieves an event by ID", () => {
      const engine = createEngine();

      const logged = engine.logEvent({
        type: "authentication",
        action: "logout"
      });

      expect(engine.getEvent(logged.eventId).action).toBe("logout");
      engine.close();
    });

    it("rejects unknown event IDs", () => {
      const engine = createEngine();

      expect(() => engine.getEvent("unknown"))
        .toThrow(/nuk u gjet/i);

      engine.close();
    });

    it("rejects invalid event IDs", () => {
      const engine = createEngine();

      expect(() => engine.getEvent("")).toThrow();
      expect(() => engine.getEvent(null)).toThrow();
      engine.close();
    });

    it("returns independent event copies", () => {
      const engine = createEngine();

      const logged = engine.logEvent({
        type: "security",
        action: "test"
      });

      const first = engine.getEvent(logged.eventId);
      first.action = "changed";

      expect(engine.getEvent(logged.eventId).action).toBe("test");
      engine.close();
    });
  });

  describe("Event listing and querying", () => {
    it("lists all events", () => {
      const engine = createEngine();

      engine.logEvent({ type: "authentication", action: "login" });
      engine.logEvent({ type: "authorization", action: "denied" });

      expect(engine.listEvents()).toHaveLength(2);
      engine.close();
    });

    it("limits listed events", () => {
      const engine = createEngine();

      engine.logEvent({ type: "security", action: "one" });
      engine.logEvent({ type: "security", action: "two" });
      engine.logEvent({ type: "security", action: "three" });

      const result = engine.listEvents({ limit: 2 });

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe("two");
      engine.close();
    });

    it("queries events by type", () => {
      const engine = createEngine();

      engine.logEvent({ type: "authentication", action: "login" });
      engine.logEvent({ type: "authorization", action: "denied" });

      const result = engine.queryEvents({
        filters: { type: "authentication" }
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("authentication");
      engine.close();
    });

    it("supports nested field filters", () => {
      const engine = createEngine();

      engine.logEvent({
        type: "security",
        action: "login",
        subject: { id: "user-1" }
      });

      engine.logEvent({
        type: "security",
        action: "logout",
        subject: { id: "user-2" }
      });

      const result = engine.queryEvents({
        filters: { "subject.id": "user-1" }
      });

      expect(result).toHaveLength(1);
      expect(result[0].subject.id).toBe("user-1");
      engine.close();
    });

    it("returns an empty array when no events match", () => {
      const engine = createEngine();

      engine.logEvent({ type: "security", action: "login" });

      expect(
        engine.queryEvents({
          filters: { type: "unknown" }
        })
      ).toEqual([]);

      engine.close();
    });
  });

  describe("Limits and configuration", () => {
    it("enforces maxEvents", () => {
      const engine = createEngine({ maxEvents: 1 });

      engine.logEvent({ type: "security", action: "first" });

      expect(() =>
        engine.logEvent({ type: "security", action: "second" })
      ).toThrow();

      expect(engine.getStatus().eventCount).toBe(1);
      engine.close();
    });

    it("enforces maxHistory", () => {
      const engine = createEngine({ maxHistory: 2 });

      engine.logEvent({ type: "security", action: "one" });
      engine.logEvent({ type: "security", action: "two" });
      engine.logEvent({ type: "security", action: "three" });

      expect(engine.getHistory()).toHaveLength(2);
      engine.close();
    });

    it("rejects logging when audit is disabled", () => {
      const engine = createEngine({ enabled: false });

      expect(() =>
        engine.logEvent({ type: "security", action: "login" })
      ).toThrow();

      engine.close();
    });
  });

  describe("History and status", () => {
    it("records operations in history", () => {
      const engine = createEngine();

      const logged = engine.logEvent({
        type: "security",
        action: "login"
      });

      engine.getEvent(logged.eventId);
      engine.listEvents();

      const history = engine.getHistory();

      expect(history.some((item) => item.action === "LOG_EVENT")).toBe(true);
      expect(history.some((item) => item.action === "GET_EVENT")).toBe(true);
      expect(history.some((item) => item.action === "LIST_EVENTS")).toBe(true);

      engine.close();
    });

    it("returns status information", () => {
      const engine = createEngine();

      engine.logEvent({ type: "security", action: "login" });

      const status = engine.getStatus();

      expect(status.version).toBe("1.0.0");
      expect(status.eventCount).toBe(1);
      expect(status.appendOnly).toBe(true);
      engine.close();
    });
  });

  describe("Lifecycle", () => {
    it("clears RAM storage on close", () => {
      const engine = createEngine();

      engine.logEvent({ type: "security", action: "login" });
      engine.close();

      expect(() => engine.getStatus()).toThrow();
    });

    it("makes close idempotent", () => {
      const engine = createEngine();

      expect(() => {
        engine.close();
        engine.close();
      }).not.toThrow();
    });

    it("rejects operations after close", () => {
      const engine = createEngine();
      engine.close();

      expect(() => engine.logEvent({
        type: "security",
        action: "login"
      })).toThrow();

      expect(() => engine.listEvents()).toThrow();
      expect(() => engine.getHistory()).toThrow();
    });
  });
});
