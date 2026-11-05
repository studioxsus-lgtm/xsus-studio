
import { describe, it, expect } from "vitest";

import {
  SESSION_MANAGER_VERSION,
  createSessionManager,
} from "../../apps/app/security/sessions/session-manager.js";

describe("Session Manager", () => {
  function setup(config = {}) {
    let time = 1000000;
    let id = 0;

    const manager = createSessionManager({
      config,
      now: () => time,
      idGenerator: () => `session-${++id}`,
    });

    return {
      manager,
      advance: (milliseconds) => {
        time += milliseconds;
      },
    };
  }

  it("exposes the manager version", () => {
    expect(SESSION_MANAGER_VERSION).toBe("1.0.0");
  });

  it("creates a session", () => {
    const { manager } = setup();
    const session = manager.createSession("user-1");

    expect(session.id).toBe("session-1");
    expect(session.userId).toBe("user-1");
    expect(session.status).toBe("active");
    expect(Object.isFrozen(session)).toBe(true);
  });

  it("stores session metadata", () => {
    const { manager } = setup();
    const session = manager.createSession("user-1", {
      source: "web",
    });

    expect(session.metadata.source).toBe("web");
    expect(Object.isFrozen(session.metadata)).toBe(true);
  });

  it("retrieves an existing session", () => {
    const { manager } = setup();
    const created = manager.createSession("user-1");

    expect(manager.getSession(created.id).id).toBe(created.id);
  });

  it("rejects unknown sessions", () => {
    const { manager } = setup();

    expect(() => manager.getSession("missing"))
      .toThrowError(/SESSION_NOT_FOUND/);
  });

  it("verifies an active session", () => {
    const { manager } = setup();
    const session = manager.createSession("user-1");
    const result = manager.verifySession(session.id);

    expect(result.valid).toBe(true);
    expect(result.session.status).toBe("active");
  });

  it("updates last activity during verification", () => {
    const { manager, advance } = setup();
    const session = manager.createSession("user-1");

    advance(5000);

    const result = manager.verifySession(session.id);

    expect(result.session.lastActivityAt).toBe(1005000);
  });

  it("expires sessions after their duration", () => {
    const { manager, advance } = setup({
      sessionDurationMs: 1000,
    });

    const session = manager.createSession("user-1");
    advance(1000);

    expect(() => manager.verifySession(session.id))
      .toThrowError(/SESSION_EXPIRED/);
  });

  it("does not expire a session before its deadline", () => {
    const { manager, advance } = setup({
      sessionDurationMs: 1000,
    });

    const session = manager.createSession("user-1");
    advance(999);

    expect(manager.verifySession(session.id).valid).toBe(true);
  });

  it("refreshes an active session", () => {
    const { manager, advance } = setup({
      sessionDurationMs: 1000,
    });

    const session = manager.createSession("user-1");
    advance(500);

    const refreshed = manager.refreshSession(session.id);

    expect(refreshed.expiresAt).toBe(1001500);
    expect(refreshed.lastActivityAt).toBe(1000500);
  });

  it("rejects refresh after expiration", () => {
    const { manager, advance } = setup({
      sessionDurationMs: 1000,
    });

    const session = manager.createSession("user-1");
    advance(1000);

    expect(() => manager.refreshSession(session.id))
      .toThrowError(/SESSION_EXPIRED/);
  });

  it("can disable session refresh", () => {
    const { manager } = setup({
      allowRefresh: false,
    });

    const session = manager.createSession("user-1");

    expect(() => manager.refreshSession(session.id)).toThrow();
  });

  it("revokes an active session", () => {
    const { manager } = setup();
    const session = manager.createSession("user-1");

    expect(manager.revokeSession(session.id)).toBe(true);
    expect(manager.getSession(session.id).status).toBe("revoked");
  });

  it("rejects verification of revoked sessions", () => {
    const { manager } = setup();
    const session = manager.createSession("user-1");

    manager.revokeSession(session.id);

    expect(() => manager.verifySession(session.id))
      .toThrowError(/SESSION_REVOKED/);
  });

  it("returns false when revoking an already revoked session", () => {
    const { manager } = setup();
    const session = manager.createSession("user-1");

    manager.revokeSession(session.id);

    expect(manager.revokeSession(session.id)).toBe(false);
  });

  it("revokes all active sessions for a user", () => {
    const { manager } = setup();

    manager.createSession("user-1");
    manager.createSession("user-1");
    manager.createSession("user-2");

    expect(manager.revokeUserSessions("user-1")).toBe(2);

    expect(
      manager.listUserSessions("user-1")
        .every((session) => session.status === "revoked"),
    ).toBe(true);

    expect(manager.listUserSessions("user-2")[0].status)
      .toBe("active");
  });

  it("lists sessions for one user only", () => {
    const { manager } = setup();

    manager.createSession("user-1");
    manager.createSession("user-2");

    expect(manager.listUserSessions("user-1")).toHaveLength(1);
  });

  it("enforces the per-user session limit", () => {
    const { manager } = setup({
      maxSessionsPerUser: 1,
      maxSessions: 5,
    });

    manager.createSession("user-1");

    expect(() => manager.createSession("user-1"))
      .toThrowError(/SESSION_LIMIT_REACHED/);
  });

  it("enforces the global session limit", () => {
    const { manager } = setup({
      maxSessionsPerUser: 1,
      maxSessions: 1,
    });

    manager.createSession("user-1");

    expect(() => manager.createSession("user-2"))
      .toThrowError(/SESSION_LIMIT_REACHED/);
  });

  it("rejects invalid generated session identifiers", () => {
    const manager = createSessionManager({
      idGenerator: () => "",
    });

    expect(() => manager.createSession("user-1"))
      .toThrowError(/INVALID_SESSION/);
  });

  it("rejects duplicate generated session identifiers", () => {
    const manager = createSessionManager({
      idGenerator: () => "same-id",
    });

    manager.createSession("user-1");

    expect(() => manager.createSession("user-2"))
      .toThrowError(/INVALID_SESSION/);
  });

  it("reports session counts", () => {
    const { manager, advance } = setup({
      sessionDurationMs: 1000,
    });

    manager.createSession("user-1");
    const second = manager.createSession("user-2");

    manager.revokeSession(second.id);
    advance(1000);

    const status = manager.getStatus();

    expect(status.totalSessions).toBe(2);
    expect(status.expiredCount).toBe(1);
    expect(status.revokedCount).toBe(1);
    expect(status.activeCount).toBe(0);
  });

  it("records session lifecycle events", () => {
    const { manager } = setup();
    const session = manager.createSession("user-1");

    manager.verifySession(session.id);
    manager.revokeSession(session.id);

    const events = manager.getHistory().map((entry) => entry.event);

    expect(events).toContain("session.created");
    expect(events).toContain("session.verified");
    expect(events).toContain("session.revoked");
  });

  it("processes standardized requests", () => {
    const { manager } = setup();

    const session = manager.processRequest({
      action: "createSession",
      userId: "user-1",
    });

    expect(session.userId).toBe("user-1");

    const result = manager.processRequest({
      action: "verifySession",
      sessionId: session.id,
    });

    expect(result.valid).toBe(true);
  });

  it("expires sessions during user listing", () => {
    const { manager, advance } = setup({
      sessionDurationMs: 1000,
    });

    manager.createSession("user-1");
    advance(1000);

    expect(manager.listUserSessions("user-1")[0].status)
      .toBe("expired");
  });

  it("closes the manager and clears its data", () => {
    const { manager } = setup();

    manager.createSession("user-1");

    expect(manager.close()).toBe(true);
    expect(manager.close()).toBe(false);

    expect(() => manager.getStatus()).toThrow();
    expect(() => manager.createSession("user-1")).toThrow();
  });
});
