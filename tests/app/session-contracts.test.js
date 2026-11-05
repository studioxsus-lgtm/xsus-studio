
import { describe, it, expect } from "vitest";

import {
  SESSION_CONTRACT_VERSION,
  SESSION_ACTIONS,
  SESSION_ERROR_CODES,
  DEFAULT_SESSION_CONFIG,
  createSessionError,
  validateSessionConfig,
  validateSessionRequest,
  createSessionResponse,
} from "../../apps/app/security/sessions/session-contracts.js";

describe("Session Contracts", () => {
  it("exposes the contract version", () => {
    expect(SESSION_CONTRACT_VERSION).toBe("1.0.0");
  });

  it("exposes supported actions", () => {
    expect(SESSION_ACTIONS).toContain("createSession");
    expect(SESSION_ACTIONS).toContain("verifySession");
    expect(SESSION_ACTIONS).toContain("revokeSession");
    expect(SESSION_ACTIONS).toContain("getStatus");
  });

  it("exposes standard error codes", () => {
    expect(SESSION_ERROR_CODES.SESSION_EXPIRED)
      .toBe("SESSION_EXPIRED");
    expect(SESSION_ERROR_CODES.SESSION_REVOKED)
      .toBe("SESSION_REVOKED");
  });

  it("provides default configuration", () => {
    expect(DEFAULT_SESSION_CONFIG.sessionDurationMs)
      .toBe(1800000);
    expect(DEFAULT_SESSION_CONFIG.maxSessionsPerUser).toBe(10);
    expect(DEFAULT_SESSION_CONFIG.allowRefresh).toBe(true);
  });

  it("creates standardized errors", () => {
    const error = createSessionError(
      SESSION_ERROR_CODES.INVALID_SESSION,
      "Invalid session.",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("SessionError");
    expect(error.code).toBe("INVALID_SESSION");
  });

  it("uses a fallback for unknown error codes", () => {
    expect(createSessionError("UNKNOWN", "Error.").code)
      .toBe("PROVIDER_ERROR");
  });

  it("validates default configuration", () => {
    const config = validateSessionConfig();

    expect(config.sessionDurationMs).toBe(1800000);
    expect(config.maxSessions).toBe(10000);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("accepts valid custom configuration", () => {
    const config = validateSessionConfig({
      sessionDurationMs: 60000,
      maxSessionsPerUser: 5,
      maxSessions: 100,
      allowRefresh: false,
    });

    expect(config.sessionDurationMs).toBe(60000);
    expect(config.maxSessionsPerUser).toBe(5);
    expect(config.allowRefresh).toBe(false);
  });

  it("rejects invalid configuration values", () => {
    expect(() => validateSessionConfig(null)).toThrow();

    expect(() =>
      validateSessionConfig({ sessionDurationMs: 0 }),
    ).toThrow();

    expect(() =>
      validateSessionConfig({ maxSessions: -1 }),
    ).toThrow();

    expect(() =>
      validateSessionConfig({ allowRefresh: "yes" }),
    ).toThrow();
  });

  it("rejects unknown configuration options", () => {
    expect(() =>
      validateSessionConfig({ unknown: true }),
    ).toThrow();
  });

  it("rejects unsupported contract versions", () => {
    expect(() =>
      validateSessionConfig({ version: "2.0.0" }),
    ).toThrow();
  });

  it("rejects per-user limits above the global limit", () => {
    expect(() =>
      validateSessionConfig({
        maxSessionsPerUser: 20,
        maxSessions: 10,
      }),
    ).toThrow();
  });

  it("validates session creation requests", () => {
    const request = validateSessionRequest({
      action: "createSession",
      userId: "user-1",
      metadata: { source: "web" },
    });

    expect(request.userId).toBe("user-1");
    expect(request.metadata.source).toBe("web");
    expect(Object.isFrozen(request.metadata)).toBe(true);
  });

  it("uses empty metadata when metadata is not an object", () => {
    const request = validateSessionRequest({
      action: "createSession",
      userId: "user-1",
      metadata: "invalid",
    });

    expect(request.metadata).toEqual({});
  });

  it("rejects session creation without a valid user id", () => {
    expect(() =>
      validateSessionRequest({
        action: "createSession",
        userId: " ",
      }),
    ).toThrowError(/INVALID_USER/);
  });

  it("validates session lookup requests", () => {
    const request = validateSessionRequest({
      action: "getSession",
      sessionId: "session-1",
    });

    expect(request.sessionId).toBe("session-1");
  });

  it("validates verification requests", () => {
    expect(
      validateSessionRequest({
        action: "verifySession",
        sessionId: "session-1",
      }).action,
    ).toBe("verifySession");
  });

  it("validates refresh requests", () => {
    expect(
      validateSessionRequest({
        action: "refreshSession",
        sessionId: "session-1",
      }).sessionId,
    ).toBe("session-1");
  });

  it("validates revocation requests", () => {
    expect(
      validateSessionRequest({
        action: "revokeSession",
        sessionId: "session-1",
      }).action,
    ).toBe("revokeSession");
  });

  it("validates user session operations", () => {
    expect(
      validateSessionRequest({
        action: "listUserSessions",
        userId: "user-1",
      }).userId,
    ).toBe("user-1");

    expect(
      validateSessionRequest({
        action: "revokeUserSessions",
        userId: "user-1",
      }).action,
    ).toBe("revokeUserSessions");
  });

  it("validates status requests", () => {
    expect(
      validateSessionRequest({ action: "getStatus" }).action,
    ).toBe("getStatus");
  });

  it("rejects invalid session identifiers", () => {
    expect(() =>
      validateSessionRequest({
        action: "getSession",
        sessionId: "",
      }),
    ).toThrowError(/INVALID_SESSION/);
  });

  it("rejects unsupported actions", () => {
    expect(() =>
      validateSessionRequest({ action: "unknown" }),
    ).toThrowError(/INVALID_ACTION/);
  });

  it("rejects non-object requests", () => {
    expect(() => validateSessionRequest(null)).toThrow();
    expect(() => validateSessionRequest("invalid")).toThrow();
  });

  it("creates standardized responses", () => {
    const response = createSessionResponse({
      action: "createSession",
      data: { id: "session-1" },
    });

    expect(response.success).toBe(true);
    expect(response.version).toBe("1.0.0");
    expect(Object.isFrozen(response)).toBe(true);
    expect(Object.isFrozen(response.metadata)).toBe(true);
  });
});
