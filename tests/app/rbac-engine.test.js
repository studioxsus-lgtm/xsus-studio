
import { describe, it, expect } from "vitest";

import {
  RBAC_ENGINE_VERSION,
  createRBACEngine,
} from "../../apps/app/security/access-control/rbac-engine.js";

function createEngine(config = {}) {
  return createRBACEngine({ config });
}

function role(id, overrides = {}) {
  return {
    id,
    name: id,
    permissions: [],
    inherits: [],
    ...overrides,
  };
}

describe("RBAC Engine", () => {
  it("exposes the engine version", () => {
    expect(RBAC_ENGINE_VERSION).toBe("1.0.0");
  });

  it("creates an engine with default configuration", () => {
    const engine = createEngine();

    expect(engine.getStatus().roleCount).toBe(0);
    expect(engine.getStatus().allowRoleInheritance).toBe(true);
  });

  it("rejects invalid engine options", () => {
    expect(() => createRBACEngine(null)).toThrow();
  });

  it("creates and retrieves a role", () => {
    const engine = createEngine();

    engine.createRole(role("admin", {
      permissions: ["database.read"],
    }));

    const result = engine.getRole("admin");

    expect(result.data.id).toBe("admin");
    expect(result.data.permissions).toEqual(["database.read"]);
  });

  it("rejects duplicate role IDs", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));

    expect(() =>
      engine.createRole(role("admin")),
    ).toThrow();
  });

  it("lists roles in deterministic order", () => {
    const engine = createEngine();

    engine.createRole(role("viewer"));
    engine.createRole(role("admin"));

    expect(
      engine.listRoles().data.map((item) => item.id),
    ).toEqual(["admin", "viewer"]);
  });

  it("updates a role and preserves creation time", () => {
    const engine = createEngine();

    engine.createRole(role("editor"));

    const original = engine.getRole("editor").data;

    engine.updateRole("editor", {
      name: "Content Editor",
      permissions: ["content.write"],
    });

    const updated = engine.getRole("editor").data;

    expect(updated.name).toBe("Content Editor");
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.permissions).toEqual(["content.write"]);
  });

  it("rejects updates for missing roles", () => {
    const engine = createEngine();

    expect(() =>
      engine.updateRole("missing", {
        name: "Missing",
      }),
    ).toThrow();
  });

  it("deletes a role", () => {
    const engine = createEngine();

    engine.createRole(role("viewer"));

    const result = engine.deleteRole("viewer");

    expect(result.data.deleted).toBe(true);
    expect(engine.getStatus().roleCount).toBe(0);
  });

  it("rejects deletion of a role inherited by another role", () => {
    const engine = createEngine();

    engine.createRole(role("viewer"));
    engine.createRole(role("editor", {
      inherits: ["viewer"],
    }));

    expect(() =>
      engine.deleteRole("viewer"),
    ).toThrow();
  });

  it("assigns a role to a user", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));

    const result = engine.assignRole("user-1", "admin");

    expect(result.data.assigned).toBe(true);
    expect(engine.getUserRoles("user-1").data).toHaveLength(1);
  });

  it("rejects assignment of missing roles", () => {
    const engine = createEngine();

    expect(() =>
      engine.assignRole("user-1", "missing"),
    ).toThrow();
  });

  it("rejects duplicate role assignments", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));
    engine.assignRole("user-1", "admin");

    expect(() =>
      engine.assignRole("user-1", "admin"),
    ).toThrow();
  });

  it("removes an assigned role", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));
    engine.assignRole("user-1", "admin");

    const result = engine.removeRole("user-1", "admin");

    expect(result.data.removed).toBe(true);
    expect(engine.getUserRoles("user-1").data).toHaveLength(0);
  });

  it("rejects removal of an unassigned role", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));

    expect(() =>
      engine.removeRole("user-1", "admin"),
    ).toThrow();
  });

  it("checks directly assigned roles", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));
    engine.assignRole("user-1", "admin");

    expect(
      engine.checkRole("user-1", "admin").data.hasRole,
    ).toBe(true);
  });

  it("checks inherited roles", () => {
    const engine = createEngine();

    engine.createRole(role("viewer"));
    engine.createRole(role("editor", {
      inherits: ["viewer"],
    }));

    engine.assignRole("user-1", "editor");

    expect(
      engine.checkRole("user-1", "viewer").data.hasRole,
    ).toBe(true);
  });

  it("rejects circular role inheritance", () => {
    const engine = createEngine();

    engine.createRole(role("viewer"));
    engine.createRole(role("editor", {
      inherits: ["viewer"],
    }));

    expect(() =>
      engine.updateRole("viewer", {
        inherits: ["editor"],
      }),
    ).toThrow();
  });

  it("rejects missing inherited roles", () => {
    const engine = createEngine();

    expect(() =>
      engine.createRole(role("editor", {
        inherits: ["missing"],
      })),
    ).toThrow();
  });

  it("can disable role inheritance", () => {
    const engine = createEngine({
      allowRoleInheritance: false,
    });

    engine.createRole(role("viewer"));

    expect(() =>
      engine.createRole(role("editor", {
        inherits: ["viewer"],
      })),
    ).toThrow();
  });

  it("enforces the maximum number of roles", () => {
    const engine = createEngine({ maxRoles: 1 });

    engine.createRole(role("admin"));

    expect(() =>
      engine.createRole(role("viewer")),
    ).toThrow();
  });

  it("enforces the maximum number of roles per user", () => {
    const engine = createEngine({ maxRolesPerUser: 1 });

    engine.createRole(role("admin"));
    engine.createRole(role("viewer"));

    engine.assignRole("user-1", "admin");

    expect(() =>
      engine.assignRole("user-1", "viewer"),
    ).toThrow();
  });

  it("removes assignments when deleting a role", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));
    engine.assignRole("user-1", "admin");
    engine.deleteRole("admin");

    expect(engine.getStatus().assignmentCount).toBe(0);
  });

  it("supports processRequest", () => {
    const engine = createEngine();

    const result = engine.processRequest({
      action: "createRole",
      role: role("admin"),
    });

    expect(result.data.id).toBe("admin");
  });

  it("provides immutable history", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));

    const history = engine.getHistory();

    expect(Object.isFrozen(history)).toBe(true);
    expect(Object.isFrozen(history[0])).toBe(true);
  });

  it("closes and clears the engine", () => {
    const engine = createEngine();

    engine.createRole(role("admin"));

    expect(engine.close()).toBe(true);
    expect(engine.close()).toBe(false);
    expect(() => engine.getStatus()).toThrow();
  });

  it("rejects operations after close", () => {
    const engine = createEngine();

    engine.close();

    expect(() =>
      engine.createRole(role("admin")),
    ).toThrow();
  });
});
