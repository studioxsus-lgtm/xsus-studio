
import { describe, it, expect, vi } from "vitest";

import {
  createSecurityIntegrationEngine,
} from "../../../apps/app/security/integration/security-integration-engine.js";

const createDependencies = (overrides = {}) => ({
  authenticationManager: {
    verify: vi.fn(async () => ({
      success: true,
      authenticated: true,
      user: { id: "user-verified" },
    })),
  },

  authorizationManager: {
    authorize: vi.fn(async () => ({ allowed: true })),
    checkPermission: vi.fn(async () => ({ allowed: true })),
    checkRole: vi.fn(async () => ({ allowed: true })),
  },

  rbacEngine: {
    getUserRoles: vi.fn(async () => ({ data: [] })),
    getRole: vi.fn(async () => ({ data: null })),
  },

  permissionEngine: {
    getSubjectPermissions: vi.fn(async () => []),
  },

  auditEngine: {
    logEvent: vi.fn(async () => ({ id: "audit-1" })),
  },

  ...overrides,
});

const createRequest = (extra = {}) => ({
  action: "authorize",
  resource: {
    id: "document-1",
    type: "file",
  },
  operation: "read",
  authentication: {},
  ...extra,
});

describe("Security Integration Engine — Identity Verification", () => {
  it("verifikon identitetin përmes Authentication Manager", async () => {
    const dependencies = createDependencies();
    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    expect(
      dependencies.authenticationManager.verify
    ).toHaveBeenCalledTimes(1);

    await engine.close();
  });

  it("përdor identitetin e verifikuar nga Authentication Manager", async () => {
    const dependencies = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(
      createRequest({
        identity: {
          id: "attacker-id",
          verified: true,
          roles: ["admin"],
          permissions: ["delete"],
        },
      })
    );

    const authorizationCall =
      dependencies.authorizationManager.authorize.mock.calls[0][0];

    expect(authorizationCall.identity.id).toBe("user-verified");
    expect(authorizationCall.identity.verified).toBe(true);
    expect(authorizationCall.identity.id).not.toBe("attacker-id");

    await engine.close();
  });

  it("refuzon identitetin kur sesioni nuk është autentikuar", async () => {
    const dependencies = createDependencies({
      authenticationManager: {
        verify: vi.fn(async () => ({
          success: true,
          authenticated: false,
          user: null,
        })),
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await expect(
      engine.authorize(createRequest())
    ).rejects.toMatchObject({
      code: "IDENTITY_NOT_VERIFIED",
    });

    expect(
      dependencies.authorizationManager.authorize
    ).not.toHaveBeenCalled();

    await engine.close();
  });

  it("refuzon verifikimin kur Authentication Manager raporton dështim", async () => {
    const dependencies = createDependencies({
      authenticationManager: {
        verify: vi.fn(async () => ({
          success: false,
          authenticated: false,
          user: null,
        })),
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await expect(
      engine.authorize(createRequest())
    ).rejects.toMatchObject({
      code: "IDENTITY_NOT_VERIFIED",
    });

    await engine.close();
  });

  it("refuzon identitetin kur përgjigjja nuk përmban përdorues", async () => {
    const dependencies = createDependencies({
      authenticationManager: {
        verify: vi.fn(async () => ({
          success: true,
          authenticated: true,
          user: null,
        })),
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await expect(
      engine.authorize(createRequest())
    ).rejects.toMatchObject({
      code: "IDENTITY_NOT_VERIFIED",
    });

    await engine.close();
  });

  it("nuk thërret RBAC ose Authorization pas dështimit të autentikimit", async () => {
    const dependencies = createDependencies({
      authenticationManager: {
        verify: vi.fn(async () => ({
          success: false,
          authenticated: false,
          user: null,
        })),
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await expect(
      engine.authorize(createRequest())
    ).rejects.toBeDefined();

    expect(
      dependencies.rbacEngine.getUserRoles
    ).not.toHaveBeenCalled();

    expect(
      dependencies.authorizationManager.authorize
    ).not.toHaveBeenCalled();

    await engine.close();
  });
});
