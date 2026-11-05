import { describe, it, expect } from "vitest";

import {
  SECURITY_INTEGRATION_VERSION,
  SECURITY_INTEGRATION_ACTIONS,
  SECURITY_INTEGRATION_ERRORS,
  SECURITY_INTEGRATION_DEFAULTS,
  validateSecurityIntegrationConfig,
  validateSecurityIntegrationIdentity,
  validateSecurityIntegrationResource,
  validateSecurityIntegrationRequest,
  createSecurityIntegrationResponse,
  createSecurityIntegrationError,
} from "../../apps/app/security/integration/security-integration-contracts.js";

describe("Security Integration Contracts", () => {
  it("ka versionin e pritshëm", () => {
    expect(SECURITY_INTEGRATION_VERSION).toBe("1.0.0");
  });

  it("ekspozon veprimet e integrimit", () => {
    expect(SECURITY_INTEGRATION_ACTIONS.AUTHORIZE).toBe("authorize");
    expect(SECURITY_INTEGRATION_ACTIONS.CHECK_PERMISSION).toBe("checkPermission");
    expect(SECURITY_INTEGRATION_ACTIONS.CHECK_ROLE).toBe("checkRole");
    expect(SECURITY_INTEGRATION_ACTIONS.GET_STATUS).toBe("getStatus");
  });

  it("ekspozon konfigurimin default", () => {
    expect(SECURITY_INTEGRATION_DEFAULTS.denyByDefault).toBe(true);
    expect(SECURITY_INTEGRATION_DEFAULTS.requireVerifiedIdentity).toBe(true);
    expect(SECURITY_INTEGRATION_DEFAULTS.requireAudit).toBe(true);
  });

  it("validon konfigurimin default", () => {
    const config = validateSecurityIntegrationConfig();

    expect(config.denyByDefault).toBe(true);
    expect(config.maxHistory).toBe(100);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("pranon konfigurim të personalizuar", () => {
    const config = validateSecurityIntegrationConfig({
      maxHistory: 50,
      requireAudit: false,
    });

    expect(config.maxHistory).toBe(50);
    expect(config.requireAudit).toBe(false);
  });

  it.each([
    null,
    [],
    "invalid",
  ])("refuzon konfigurim jo-objekt: %s", (config) => {
    expect(() => validateSecurityIntegrationConfig(config))
      .toThrow();
  });

  it("refuzon maxHistory të pavlefshëm", () => {
    expect(() =>
      validateSecurityIntegrationConfig({ maxHistory: 0 }),
    ).toThrow();
  });

  it("refuzon vlerë boolean të pavlefshme", () => {
    expect(() =>
      validateSecurityIntegrationConfig({
        denyByDefault: "true",
      }),
    ).toThrow();
  });

  it("validon dhe normalizon identitetin", () => {
    const identity = validateSecurityIntegrationIdentity({
      id: " user-1 ",
      verified: true,
      roles: ["admin", "admin"],
      permissions: ["app.read"],
    });

    expect(identity.id).toBe("user-1");
    expect(identity.roles).toEqual(["admin"]);
    expect(Object.isFrozen(identity)).toBe(true);
    expect(Object.isFrozen(identity.roles)).toBe(true);
  });

  it("refuzon identitet pa ID", () => {
    expect(() =>
      validateSecurityIntegrationIdentity({
        verified: true,
        roles: [],
        permissions: [],
      }),
    ).toThrow();
  });

  it("refuzon identitet me roles të pavlefshme", () => {
    expect(() =>
      validateSecurityIntegrationIdentity({
        id: "user-1",
        verified: true,
        roles: ["admin", 123],
        permissions: [],
      }),
    ).toThrow();
  });

  it("validon resource", () => {
    const resource = validateSecurityIntegrationResource({
      id: "project-1",
      type: "project",
    });

    expect(resource.id).toBe("project-1");
    expect(resource.type).toBe("project");
  });

  it("refuzon resource pa type", () => {
    expect(() =>
      validateSecurityIntegrationResource({
        id: "project-1",
      }),
    ).toThrow();
  });

  it("validon kërkesë authorize", () => {
    const request = validateSecurityIntegrationRequest({
      action: "authorize",
      identity: {
        id: "user-1",
        verified: true,
        roles: ["admin"],
        permissions: ["project.read"],
      },
      resource: {
        id: "project-1",
        type: "project",
      },
      operation: "read",
    });

    expect(request.action).toBe("authorize");
    expect(request.operation).toBe("read");
  });

  it("validon kërkesë checkRole", () => {
    const request = validateSecurityIntegrationRequest({
      action: "checkRole",
      identity: {
        id: "user-1",
        verified: true,
        roles: [],
        permissions: [],
      },
      role: "admin",
    });

    expect(request.role).toBe("admin");
  });

  it("validon kërkesë checkPermission", () => {
    const request = validateSecurityIntegrationRequest({
      action: "checkPermission",
      identity: {
        id: "user-1",
        verified: true,
        roles: [],
        permissions: [],
      },
      permission: "project.read",
    });

    expect(request.permission).toBe("project.read");
  });

  it("lejon getStatus pa identitet", () => {
    const request = validateSecurityIntegrationRequest({
      action: "getStatus",
    });

    expect(request.action).toBe("getStatus");
  });

  it("refuzon identitet të paverifikuar", () => {
    expect(() =>
      validateSecurityIntegrationRequest({
        action: "checkRole",
        identity: {
          id: "user-1",
          verified: false,
          roles: [],
          permissions: [],
        },
        role: "admin",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: SECURITY_INTEGRATION_ERRORS.IDENTITY_NOT_VERIFIED,
      }),
    );
  });

  it("refuzon action të panjohur", () => {
    expect(() =>
      validateSecurityIntegrationRequest({
        action: "deleteEverything",
      }),
    ).toThrow();
  });

  it("refuzon authorize pa operation", () => {
    expect(() =>
      validateSecurityIntegrationRequest({
        action: "authorize",
        identity: {
          id: "user-1",
          verified: true,
          roles: [],
          permissions: [],
        },
        resource: {
          id: "project-1",
          type: "project",
        },
      }),
    ).toThrow();
  });

  it("krijon përgjigje standarde", () => {
    const response = createSecurityIntegrationResponse({
      action: "authorize",
      allowed: true,
      reason: "EXPLICIT_ALLOW",
    });

    expect(response.version).toBe("1.0.0");
    expect(response.allowed).toBe(true);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it("refuzon përgjigje të pavlefshme", () => {
    expect(() =>
      createSecurityIntegrationResponse({
        action: "authorize",
        allowed: "yes",
      }),
    ).toThrow();
  });

  it("krijon gabim standard", () => {
    const error = createSecurityIntegrationError(
      SECURITY_INTEGRATION_ERRORS.ACCESS_DENIED,
      "Access denied.",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("ACCESS_DENIED");
  });

  it("refuzon kod gabimi të panjohur", () => {
    expect(() =>
      createSecurityIntegrationError(
        "UNKNOWN_ERROR",
        "Invalid.",
      ),
    ).toThrow();
  });
});
