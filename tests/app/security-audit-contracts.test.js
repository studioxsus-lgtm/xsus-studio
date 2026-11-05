
import { describe, it, expect } from "vitest";

import {
  SECURITY_AUDIT_VERSION,
  SECURITY_AUDIT_ACTIONS,
  SECURITY_AUDIT_ERRORS,
  SECURITY_AUDIT_DEFAULTS,
  validateSecurityAuditConfig,
  validateSecurityAuditEvent,
  validateSecurityAuditRequest,
  sanitizeSecurityAuditData,
} from "../../apps/app/security/audit/security-audit-contracts.js";

describe("XSUS App — Security Audit Logger Contracts", () => {
  describe("metadata", () => {
    it("exposes the expected version", () => {
      expect(SECURITY_AUDIT_VERSION).toBe("1.0.0");
    });

    it("exposes all supported actions", () => {
      expect(Object.values(SECURITY_AUDIT_ACTIONS)).toEqual([
        "logEvent",
        "getEvent",
        "listEvents",
        "queryEvents",
        "getStatus",
      ]);
    });

    it("exposes standardized errors", () => {
      expect(SECURITY_AUDIT_ERRORS.INVALID_CONFIG).toBe("INVALID_CONFIG");
      expect(SECURITY_AUDIT_ERRORS.INVALID_REQUEST).toBe("INVALID_REQUEST");
      expect(SECURITY_AUDIT_ERRORS.INVALID_ACTION).toBe("INVALID_ACTION");
      expect(SECURITY_AUDIT_ERRORS.INVALID_EVENT).toBe("INVALID_EVENT");
      expect(SECURITY_AUDIT_ERRORS.EVENT_NOT_FOUND).toBe("EVENT_NOT_FOUND");
      expect(SECURITY_AUDIT_ERRORS.INVALID_FILTER).toBe("INVALID_FILTER");
      expect(SECURITY_AUDIT_ERRORS.INVALID_LIMIT).toBe("INVALID_LIMIT");
      expect(SECURITY_AUDIT_ERRORS.PROVIDER_UNAVAILABLE).toBe("PROVIDER_UNAVAILABLE");
      expect(SECURITY_AUDIT_ERRORS.PROVIDER_ERROR).toBe("PROVIDER_ERROR");
      expect(SECURITY_AUDIT_ERRORS.ALREADY_CLOSED).toBe("ALREADY_CLOSED");
    });

    it("provides secure defaults", () => {
      expect(SECURITY_AUDIT_DEFAULTS).toEqual({
        enabled: true,
        appendOnly: true,
        maxEvents: 10000,
        maxHistory: 1000,
        maxEventSize: 16384,
        denySensitiveData: true,
      });
    });
  });

  describe("configuration validation", () => {
    it("accepts the default configuration", () => {
      expect(validateSecurityAuditConfig()).toEqual(
        SECURITY_AUDIT_DEFAULTS
      );
    });

    it("accepts a valid custom configuration", () => {
      const config = validateSecurityAuditConfig({
        maxEvents: 500,
        maxHistory: 100,
        maxEventSize: 8192,
      });

      expect(config.maxEvents).toBe(500);
      expect(config.maxHistory).toBe(100);
      expect(config.maxEventSize).toBe(8192);
    });

    it("freezes the normalized configuration", () => {
      const config = validateSecurityAuditConfig();

      expect(Object.isFrozen(config)).toBe(true);
    });

    it.each([null, [], "invalid", 10])(
      "rejects invalid configuration input: %s",
      (config) => {
        expect(() => validateSecurityAuditConfig(config))
          .toThrow();
      }
    );

    it.each([
      ["enabled", "true"],
      ["appendOnly", false],
      ["denySensitiveData", 1],
    ])("rejects invalid boolean setting %s", (key, value) => {
      expect(() => validateSecurityAuditConfig({
        [key]: value,
      })).toThrow();
    });

    it("rejects appendOnly false", () => {
      expect(() => validateSecurityAuditConfig({
        appendOnly: false,
      })).toThrow();
    });

    it.each(["maxEvents", "maxHistory", "maxEventSize"])(
      "rejects invalid numeric setting %s",
      (key) => {
        for (const value of [0, -1, 1.5, NaN, Infinity, "10"]) {
          expect(() => validateSecurityAuditConfig({
            [key]: value,
          })).toThrow();
        }
      }
    );
  });

  describe("event validation", () => {
    const validEvent = {
      type: "authentication",
      action: "login",
      subject: {
        id: "user-1",
        type: "user",
      },
      resource: {
        type: "application",
        id: "xsus-app",
      },
      metadata: {
        source: "web",
      },
    };

    it("accepts a valid security event", () => {
      const result = validateSecurityAuditEvent(validEvent);

      expect(result).toEqual(validEvent);
    });

    it("accepts an event with only required fields", () => {
      expect(validateSecurityAuditEvent({
        type: "authorization",
        action: "access-denied",
      })).toMatchObject({
        type: "authorization",
        action: "access-denied",
      });
    });

    it("rejects non-object events", () => {
      for (const event of [null, [], "event", 10]) {
        expect(() => validateSecurityAuditEvent(event)).toThrow();
      }
    });

    it("rejects missing event type", () => {
      expect(() => validateSecurityAuditEvent({
        action: "login",
      })).toThrow();
    });

    it("rejects empty event type", () => {
      expect(() => validateSecurityAuditEvent({
        type: " ",
        action: "login",
      })).toThrow();
    });

    it("rejects missing event action", () => {
      expect(() => validateSecurityAuditEvent({
        type: "authentication",
      })).toThrow();
    });

    it("rejects empty event action", () => {
      expect(() => validateSecurityAuditEvent({
        type: "authentication",
        action: " ",
      })).toThrow();
    });

    it("rejects invalid subject", () => {
      expect(() => validateSecurityAuditEvent({
        type: "authentication",
        action: "login",
        subject: "user-1",
      })).toThrow();
    });

    it("rejects invalid resource", () => {
      expect(() => validateSecurityAuditEvent({
        type: "authentication",
        action: "login",
        resource: [],
      })).toThrow();
    });

    it("rejects invalid metadata", () => {
      expect(() => validateSecurityAuditEvent({
        type: "authentication",
        action: "login",
        metadata: "invalid",
      })).toThrow();
    });

    it("rejects sensitive fields by default", () => {
      expect(() => validateSecurityAuditEvent({
        type: "authentication",
        action: "login",
        metadata: {
          password: "secret-value",
        },
      })).toThrow();
    });

    it("rejects nested sensitive fields", () => {
      expect(() => validateSecurityAuditEvent({
        type: "authentication",
        action: "login",
        metadata: {
          request: {
            access_token: "secret-value",
          },
        },
      })).toThrow();
    });

    it("rejects cyclic event data", () => {
      const metadata = {};
      metadata.self = metadata;

      expect(() => validateSecurityAuditEvent({
        type: "authentication",
        action: "login",
        metadata,
      })).toThrow();
    });

    it("rejects events exceeding the configured size", () => {
      expect(() => validateSecurityAuditEvent(
        {
          type: "authentication",
          action: "login",
          metadata: {
            description: "x".repeat(1000),
          },
        },
        {
          maxEventSize: 100,
        }
      )).toThrow();
    });

    it("allows sensitive fields when explicitly configured", () => {
      const result = validateSecurityAuditEvent(
        {
          type: "authentication",
          action: "login",
          metadata: {
            password: "secret-value",
          },
        },
        {
          denySensitiveData: false,
        }
      );

      expect(result.metadata.password).toBe("[REDACTED]");
    });

    it("returns an independent event object", () => {
      const original = {
        type: "authentication",
        action: "login",
        metadata: {
          source: "web",
        },
      };

      const result = validateSecurityAuditEvent(original);

      expect(result).not.toBe(original);
      expect(result.metadata).not.toBe(original.metadata);
    });
  });

  describe("request validation", () => {
    it("accepts logEvent requests", () => {
      expect(validateSecurityAuditRequest({
        action: "logEvent",
        event: {
          type: "authentication",
          action: "login",
        },
      }).action).toBe("logEvent");
    });

    it("accepts getEvent requests", () => {
      expect(validateSecurityAuditRequest({
        action: "getEvent",
        eventId: "event-1",
      }).eventId).toBe("event-1");
    });

    it("accepts listEvents requests", () => {
      expect(validateSecurityAuditRequest({
        action: "listEvents",
        limit: 50,
      }).limit).toBe(50);
    });

    it("accepts queryEvents requests", () => {
      expect(validateSecurityAuditRequest({
        action: "queryEvents",
        filters: {
          type: "authentication",
        },
        limit: 20,
      }).action).toBe("queryEvents");
    });

    it("accepts getStatus requests", () => {
      expect(validateSecurityAuditRequest({
        action: "getStatus",
      }).action).toBe("getStatus");
    });

    it("rejects non-object requests", () => {
      for (const request of [null, [], "invalid", 10]) {
        expect(() => validateSecurityAuditRequest(request))
          .toThrow();
      }
    });

    it("rejects unknown actions", () => {
      expect(() => validateSecurityAuditRequest({
        action: "unknown",
      })).toThrow();
    });

    it("rejects missing logEvent payload", () => {
      expect(() => validateSecurityAuditRequest({
        action: "logEvent",
      })).toThrow();
    });

    it("rejects missing eventId", () => {
      expect(() => validateSecurityAuditRequest({
        action: "getEvent",
      })).toThrow();
    });

    it("rejects empty eventId", () => {
      expect(() => validateSecurityAuditRequest({
        action: "getEvent",
        eventId: " ",
      })).toThrow();
    });

    it.each([0, -1, 1.5, NaN, Infinity, "10"])(
      "rejects invalid listEvents limit: %s",
      (limit) => {
        expect(() => validateSecurityAuditRequest({
          action: "listEvents",
          limit,
        })).toThrow();
      }
    );

    it("rejects invalid query filters", () => {
      expect(() => validateSecurityAuditRequest({
        action: "queryEvents",
        filters: "authentication",
      })).toThrow();
    });

    it("rejects invalid query limit", () => {
      expect(() => validateSecurityAuditRequest({
        action: "queryEvents",
        filters: {},
        limit: -5,
      })).toThrow();
    });
  });

  describe("data sanitization", () => {
    it("redacts password fields", () => {
      expect(sanitizeSecurityAuditData({
        password: "secret",
      })).toEqual({
        password: "[REDACTED]",
      });
    });

    it("redacts token fields", () => {
      expect(sanitizeSecurityAuditData({
        access_token: "secret",
        refreshToken: "secret",
      })).toEqual({
        access_token: "[REDACTED]",
        refreshToken: "[REDACTED]",
      });
    });

    it("redacts nested sensitive fields", () => {
      expect(sanitizeSecurityAuditData({
        metadata: {
          credentials: {
            apiKey: "secret",
          },
        },
      })).toEqual({
        metadata: {
          credentials: "[REDACTED]",
        },
      });
    });

    it("preserves non-sensitive values", () => {
      expect(sanitizeSecurityAuditData({
        userId: "user-1",
        action: "login",
        success: true,
      })).toEqual({
        userId: "user-1",
        action: "login",
        success: true,
      });
    });

    it("supports array input", () => {
      expect(sanitizeSecurityAuditData([
        { password: "secret" },
        { action: "login" },
      ])).toEqual([
        { password: "[REDACTED]" },
        { action: "login" },
      ]);
    });

    it("rejects primitive input", () => {
      for (const value of [null, "invalid", 10, true]) {
        expect(() => sanitizeSecurityAuditData(value)).toThrow();
      }
    });

    it("rejects cyclic data", () => {
      const value = {};
      value.self = value;

      expect(() => sanitizeSecurityAuditData(value)).toThrow();
    });
  });
});
