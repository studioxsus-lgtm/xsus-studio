
import { describe, it, expect } from "vitest";

import {
  createSecurityIntegrationEngine,
  SECURITY_INTEGRATION_ENGINE_VERSION,
} from "../../../apps/app/security/integration/security-integration-engine.js";

const createDependencies = () => ({
  authenticationManager: {
    verify: async () => ({
      success: true,
      authenticated: true,
      user: { id: "user-1" },
    }),
  },

  authorizationManager: {
    authorize: async () => ({ allowed: true }),
    checkPermission: async () => ({ allowed: true }),
    checkRole: async () => ({ allowed: true }),
  },

  rbacEngine: {
    getUserRoles: async () => ({ data: [] }),
    getRole: async () => ({ data: null }),
  },

  permissionEngine: {
    getSubjectPermissions: async () => [],
  },

  auditEngine: {
    logEvent: async () => ({ id: "audit-1" }),
  },
});

describe("Security Integration Engine — Validation", () => {
  it("ka versionin e pritshëm", () => {
    expect(SECURITY_INTEGRATION_ENGINE_VERSION).toBe("1.0.0");
  });

  it("krijohet me të gjitha varësitë e vlefshme", () => {
    const engine = createSecurityIntegrationEngine(
      createDependencies()
    );

    expect(engine).toBeDefined();
    expect(engine.version).toBe("1.0.0");
    expect(typeof engine.authorize).toBe("function");
    expect(typeof engine.checkPermission).toBe("function");
    expect(typeof engine.checkRole).toBe("function");

    expect(engine.close()).resolves.toBe(true);
  });

  it("refuzon konfigurimin që nuk është objekt", () => {
    expect(() =>
      createSecurityIntegrationEngine({
        ...createDependencies(),
        config: "invalid",
      })
    ).toThrow();
  });

  it("refuzon maxHistory jo pozitiv", () => {
    expect(() =>
      createSecurityIntegrationEngine({
        ...createDependencies(),
        config: { maxHistory: 0 },
      })
    ).toThrow();
  });

  it("refuzon mungesën e Authentication Manager", () => {
    const dependencies = createDependencies();
    delete dependencies.authenticationManager;

    expect(() =>
      createSecurityIntegrationEngine(dependencies)
    ).toThrow();
  });

  it("refuzon mungesën e Authorization Manager", () => {
    const dependencies = createDependencies();
    delete dependencies.authorizationManager;

    expect(() =>
      createSecurityIntegrationEngine(dependencies)
    ).toThrow();
  });

  it("refuzon mungesën e RBAC Engine", () => {
    const dependencies = createDependencies();
    delete dependencies.rbacEngine;

    expect(() =>
      createSecurityIntegrationEngine(dependencies)
    ).toThrow();
  });

  it("refuzon mungesën e Permission Engine", () => {
    const dependencies = createDependencies();
    delete dependencies.permissionEngine;

    expect(() =>
      createSecurityIntegrationEngine(dependencies)
    ).toThrow();
  });

  it("refuzon mungesën e Audit Engine", () => {
    const dependencies = createDependencies();
    delete dependencies.auditEngine;

    expect(() =>
      createSecurityIntegrationEngine(dependencies)
    ).toThrow();
  });

  it("refuzon një metodë të detyrueshme që mungon", () => {
    const dependencies = createDependencies();

    delete dependencies.authenticationManager.verify;

    expect(() =>
      createSecurityIntegrationEngine(dependencies)
    ).toThrow();
  });

  it("nuk mbyll motorët e jashtëm gjatë close()", async () => {
    const dependencies = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.close();

    expect(
      dependencies.authenticationManager.verify
    ).toBeDefined();

    expect(
      dependencies.authorizationManager.authorize
    ).toBeDefined();

    expect(
      dependencies.rbacEngine.getUserRoles
    ).toBeDefined();

    expect(
      dependencies.permissionEngine.getSubjectPermissions
    ).toBeDefined();

    expect(
      dependencies.auditEngine.logEvent
    ).toBeDefined();
  });
});
