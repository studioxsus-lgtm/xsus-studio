
import { describe, it, expect, vi } from "vitest";

import {
  AUTHORIZATION_MANAGER_VERSION,
  createAuthorizationManager,
} from "../../apps/app/security/authorization/authorization-manager.js";

function createProvider(overrides = {}) {
  return {
    authorize: vi.fn(async () => ({
      allowed: true,
      reason: "POLICY_ALLOWED",
    })),
    checkPermission: vi.fn(async () => ({
      allowed: true,
      reason: "PERMISSION_GRANTED",
    })),
    checkRole: vi.fn(async () => ({
      allowed: true,
      reason: "ROLE_GRANTED",
    })),
    ...overrides,
  };
}

function createIdentity(overrides = {}) {
  return {
    id: "user-1",
    verified: true,
    roles: ["admin"],
    permissions: ["database.read"],
    ...overrides,
  };
}

describe("Authorization Manager", () => {
  it("exposes its version", () => {
    expect(AUTHORIZATION_MANAGER_VERSION).toBe("1.0.0");
  });

  it("requires a provider", () => {
    expect(() => createAuthorizationManager()).toThrow();
  });

  it("requires all provider methods", () => {
    expect(() =>
      createAuthorizationManager({
        provider: {
          authorize: vi.fn(),
        },
      }),
    ).toThrow();
  });

  it("creates a manager with a valid provider", () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    expect(manager.getStatus().closed).toBe(false);
  });

  it("allows an authorized resource operation", async () => {
    const provider = createProvider();
    const manager = createAuthorizationManager({ provider });

    const result = await manager.authorize({
      identity: createIdentity(),
      resource: "database",
      operation: "read",
    });

    expect(result.allowed).toBe(true);
    expect(result.action).toBe("authorize");
    expect(provider.authorize).toHaveBeenCalledOnce();
  });

  it("denies access when provider denies it", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider({
        authorize: vi.fn(async () => ({
          allowed: false,
          reason: "POLICY_DENIED",
        })),
      }),
    });

    const result = await manager.authorize({
      identity: createIdentity(),
      resource: "database",
      operation: "delete",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("POLICY_DENIED");
  });

  it("rejects an unverified identity", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    await expect(
      manager.authorize({
        identity: createIdentity({ verified: false }),
        resource: "database",
        operation: "read",
      }),
    ).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
  });

  it("rejects an invalid identity", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    await expect(
      manager.authorize({
        identity: { id: "", verified: true },
        resource: "database",
        operation: "read",
      }),
    ).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
    });
  });

  it("checks permissions", async () => {
    const provider = createProvider();
    const manager = createAuthorizationManager({ provider });

    const result = await manager.checkPermission({
      identity: createIdentity(),
      permission: "database.read",
    });

    expect(result.allowed).toBe(true);
    expect(provider.checkPermission).toHaveBeenCalledOnce();
  });

  it("checks roles", async () => {
    const provider = createProvider();
    const manager = createAuthorizationManager({ provider });

    const result = await manager.checkRole({
      identity: createIdentity(),
      role: "admin",
    });

    expect(result.allowed).toBe(true);
    expect(provider.checkRole).toHaveBeenCalledOnce();
  });

  it("rejects invalid provider decisions", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider({
        authorize: vi.fn(async () => ({ allowed: "yes" })),
      }),
    });

    await expect(
      manager.authorize({
        identity: createIdentity(),
        resource: "database",
        operation: "read",
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("wraps provider errors", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider({
        authorize: vi.fn(async () => {
          throw new Error("Internal provider detail");
        }),
      }),
    });

    await expect(
      manager.authorize({
        identity: createIdentity(),
        resource: "database",
        operation: "read",
      }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });
  });

  it("supports processRequest", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    const result = await manager.processRequest({
      action: "authorize",
      identity: createIdentity(),
      resource: "database",
      operation: "read",
    });

    expect(result.allowed).toBe(true);
  });

  it("supports status requests", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    const result = await manager.processRequest({
      action: "getStatus",
    });

    expect(result.version).toBe("1.0.0");
  });

  it("rejects invalid requests", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    await expect(
      manager.authorize({
        identity: createIdentity(),
        resource: "",
        operation: "read",
      }),
    ).rejects.toThrow();
  });

  it("records decisions without storing identity secrets", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    await manager.authorize({
      identity: createIdentity({
        password: "secret-password",
        token: "secret-token",
      }),
      resource: "database",
      operation: "read",
    });

    const history = manager.getHistory();

    expect(history).toHaveLength(1);
    expect(JSON.stringify(history)).not.toContain("secret-password");
    expect(JSON.stringify(history)).not.toContain("secret-token");
  });

  it("limits history size", async () => {
    const manager = createAuthorizationManager({
      config: { maxHistory: 2 },
      provider: createProvider(),
    });

    for (let index = 0; index < 3; index += 1) {
      await manager.authorize({
        identity: createIdentity(),
        resource: "database",
        operation: "read",
      });
    }

    expect(manager.getHistory()).toHaveLength(2);
  });

  it("returns immutable history", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    await manager.authorize({
      identity: createIdentity(),
      resource: "database",
      operation: "read",
    });

    const history = manager.getHistory();

    expect(Object.isFrozen(history)).toBe(true);
    expect(Object.isFrozen(history[0])).toBe(true);
  });

  it("closes and clears the manager", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    await manager.authorize({
      identity: createIdentity(),
      resource: "database",
      operation: "read",
    });

    expect(manager.close()).toBe(true);
    expect(manager.close()).toBe(false);
    expect(() => manager.getHistory()).toThrow();
  });

  it("rejects operations after close", async () => {
    const manager = createAuthorizationManager({
      provider: createProvider(),
    });

    manager.close();

    await expect(
      manager.authorize({
        identity: createIdentity(),
        resource: "database",
        operation: "read",
      }),
    ).rejects.toMatchObject({
      code: "ALREADY_CLOSED",
    });
  });
});
