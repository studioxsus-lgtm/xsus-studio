
import { describe, it, expect, vi } from "vitest";

import {
  createAuthenticationManager,
  AUTHENTICATION_MANAGER_VERSION,
} from "../../apps/app/security/authentication/authentication-manager.js";

function createProvider(overrides = {}) {
  return {
    authenticate: vi.fn(async () => ({
      success: true,
      user: {
        id: "user-1",
        verified: true,
        roles: ["user"],
      },
      session: {
        id: "session-1",
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
    })),

    verify: vi.fn(async () => ({ valid: true })),

    logout: vi.fn(async () => ({ success: true })),

    refresh: vi.fn(async () => ({
      success: true,
      session: {
        id: "session-2",
        expiresAt: "2030-02-01T00:00:00.000Z",
      },
    })),

    ...overrides,
  };
}

describe("Authentication Manager", () => {
  it("exposes the correct version", () => {
    expect(AUTHENTICATION_MANAGER_VERSION).toBe("1.0.0");
  });

  it("requires a complete provider", () => {
    expect(() =>
      createAuthenticationManager({
        provider: {},
      })
    ).toThrow();
  });

  it("creates a manager with a valid provider", () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    expect(manager.getStatus().authenticated).toBe(false);
  });

  it("authenticates a verified identity", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    const result = await manager.authenticate({
      email: "user@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.authenticated).toBe(true);
    expect(result.user.id).toBe("user-1");
  });

  it("rejects unverified identities", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider({
        authenticate: vi.fn(async () => ({
          success: true,
          user: { id: "user-1", verified: false },
          session: { id: "session-1" },
        })),
      }),
    });

    const result = await manager.authenticate({});

    expect(result.success).toBe(false);
    expect(result.authenticated).toBe(false);
  });

  it("rejects invalid provider identity data", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider({
        authenticate: vi.fn(async () => ({
          success: true,
          user: {},
          session: { id: "session-1" },
        })),
      }),
    });

    await expect(manager.authenticate({})).rejects.toThrow();
  });

  it("verifies the active session", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    await manager.authenticate({});

    const result = await manager.verify();

    expect(result.success).toBe(true);
    expect(result.authenticated).toBe(true);
  });

  it("clears authentication after failed verification", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider({
        verify: vi.fn(async () => ({ valid: false })),
      }),
    });

    await manager.authenticate({});

    const result = await manager.verify();

    expect(result.success).toBe(false);
    expect(result.authenticated).toBe(false);
  });

  it("refreshes the active session", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    await manager.authenticate({});

    const result = await manager.refresh();

    expect(result.success).toBe(true);
    expect(result.session.id).toBe("session-2");
  });

  it("rejects refresh without an active session", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    await expect(manager.refresh()).rejects.toThrow();
  });

  it("logs out and clears the active identity", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    await manager.authenticate({});

    const result = await manager.logout();

    expect(result.success).toBe(true);
    expect(result.authenticated).toBe(false);
  });

  it("supports processRequest", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    const result = await manager.processRequest({
      action: "authenticate",
      payload: {},
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid requests", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    await expect(
      manager.processRequest({ action: "unknown" })
    ).rejects.toThrow();
  });

  it("returns an immutable history", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    await manager.authenticate({});

    const history = manager.getHistory();

    expect(history).toHaveLength(1);
    expect(Object.isFrozen(history)).toBe(true);
  });

  it("limits history size", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
      config: { maxHistory: 2 },
    });

    await manager.authenticate({});
    await manager.verify();
    await manager.refresh();

    expect(manager.getHistory()).toHaveLength(2);
  });

  it("closes the manager and clears session data", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    await manager.authenticate({});

    expect(manager.close()).toBe(true);
    expect(manager.close()).toBe(false);
    expect(manager.getStatus).toThrow();
  });

  it("does not expose provider credentials in history", async () => {
    const manager = createAuthenticationManager({
      provider: createProvider(),
    });

    await manager.authenticate({
      password: "sensitive-password",
    });

    expect(JSON.stringify(manager.getHistory()))
      .not.toContain("sensitive-password");
  });
});
