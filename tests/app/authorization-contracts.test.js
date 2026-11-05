import { describe, it, expect } from "vitest";

import {
  AUTHORIZATION_CONTRACT_VERSION,
  AUTHORIZATION_ACTIONS,
  AUTHORIZATION_ERROR_CODES,
  DEFAULT_AUTHORIZATION_CONFIG,
  createAuthorizationError,
  validateAuthorizationConfig,
  validateAuthorizationRequest,
  createAuthorizationResponse,
} from "../../apps/app/security/authorization/authorization-contracts.js";

describe("Authorization Contracts", () => {
  it("exposes the contract version", () => {
    expect(AUTHORIZATION_CONTRACT_VERSION).toBe("1.0.0");
  });

  it("exposes the supported actions", () => {
    expect(AUTHORIZATION_ACTIONS).toEqual([
      "authorize",
      "checkPermission",
      "checkRole",
      "getStatus",
    ]);
  });

  it("exposes standard error codes", () => {
    expect(AUTHORIZATION_ERROR_CODES.ACCESS_DENIED)
      .toBe("ACCESS_DENIED");
  });

  it("provides secure default configuration", () => {
    expect(DEFAULT_AUTHORIZATION_CONFIG.denyByDefault).toBe(true);
    expect(
      DEFAULT_AUTHORIZATION_CONFIG.requireAuthenticatedIdentity,
    ).toBe(true);
  });

  it("creates standardized authorization errors", () => {
    const error = createAuthorizationError(
      AUTHORIZATION_ERROR_CODES.ACCESS_DENIED,
      "Access denied.",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AuthorizationError");
    expect(error.code).toBe("ACCESS_DENIED");
  });

  it("uses a safe fallback for unknown error codes", () => {
    const error = createAuthorizationError(
      "UNKNOWN",
      "Unknown error.",
    );

    expect(error.code).toBe("PROVIDER_ERROR");
  });

  it("validates default configuration", () => {
    const config = validateAuthorizationConfig();

    expect(config.denyByDefault).toBe(true);
    expect(config.requireAuthenticatedIdentity).toBe(true);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("accepts valid custom configuration", () => {
    const config = validateAuthorizationConfig({
      denyByDefault: false,
      requireAuthenticatedIdentity: false,
    });

    expect(config.denyByDefault).toBe(false);
    expect(config.requireAuthenticatedIdentity).toBe(false);
  });

  it("rejects invalid configuration", () => {
    expect(() =>
      validateAuthorizationConfig(null),
    ).toThrow();

    expect(() =>
      validateAuthorizationConfig({
        denyByDefault: "yes",
      }),
    ).toThrow();
  });

  it("rejects unknown configuration options", () => {
    expect(() =>
      validateAuthorizationConfig({
        unknownOption: true,
      }),
    ).toThrow();
  });

  it("rejects unsupported contract versions", () => {
    expect(() =>
      validateAuthorizationConfig({
        version: "2.0.0",
      }),
    ).toThrow();
  });

  it("validates authorize requests", () => {
    const request = validateAuthorizationRequest({
      action: "authorize",
      resource: "database",
      operation: "read",
      identity: {
        id: "user-1",
        roles: ["admin"],
      },
    });

    expect(request.action).toBe("authorize");
    expect(request.resource).toBe("database");
    expect(Object.isFrozen(request)).toBe(true);
  });

  it("validates permission requests", () => {
    const request = validateAuthorizationRequest({
      action: "checkPermission",
      permission: "database.read",
    });

    expect(request.permission).toBe("database.read");
  });

  it("validates role requests", () => {
    const request = validateAuthorizationRequest({
      action: "checkRole",
      role: "admin",
    });

    expect(request.role).toBe("admin");
  });

  it("validates status requests", () => {
    expect(
      validateAuthorizationRequest({
        action: "getStatus",
      }),
    ).toEqual({ action: "getStatus" });
  });

  it("rejects invalid actions and requests", () => {
    expect(() =>
      validateAuthorizationRequest({
        action: "unknown",
      }),
    ).toThrow();

    expect(() =>
      validateAuthorizationRequest({
        action: "authorize",
        resource: "database",
      }),
    ).toThrow();

    expect(() =>
      validateAuthorizationRequest({
        action: "checkPermission",
      }),
    ).toThrow();
  });

  it("rejects invalid identity objects", () => {
    expect(() =>
      validateAuthorizationRequest({
        action: "authorize",
        resource: "database",
        operation: "read",
        identity: "invalid",
      }),
    ).toThrow();
  });

  it("creates standardized authorization responses", () => {
    const response = createAuthorizationResponse({
      success: true,
      allowed: true,
      action: "authorize",
    });

    expect(response.allowed).toBe(true);
    expect(response.version).toBe("1.0.0");
    expect(Object.isFrozen(response)).toBe(true);
  });

  it("defaults to denying access", () => {
    const response = createAuthorizationResponse();

    expect(response.allowed).toBe(false);
  });
});
