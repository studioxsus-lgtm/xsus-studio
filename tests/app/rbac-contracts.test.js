
import { describe, it, expect } from "vitest";

import {
  RBAC_CONTRACT_VERSION,
  RBAC_ACTIONS,
  RBAC_ERROR_CODES,
  DEFAULT_RBAC_CONFIG,
  createRBACError,
  validateRBACConfig,
  validateRBACRequest,
  createRBACResponse,
} from "../../apps/app/security/access-control/rbac-contracts.js";

describe("RBAC Contracts", () => {
  it("exposes the contract version", () => {
    expect(RBAC_CONTRACT_VERSION).toBe("1.0.0");
  });

  it("exposes supported actions", () => {
    expect(RBAC_ACTIONS).toContain("createRole");
    expect(RBAC_ACTIONS).toContain("assignRole");
    expect(RBAC_ACTIONS).toContain("checkRole");
  });

  it("exposes standard error codes", () => {
    expect(RBAC_ERROR_CODES.ROLE_NOT_FOUND).toBe("ROLE_NOT_FOUND");
  });

  it("provides default configuration", () => {
    expect(DEFAULT_RBAC_CONFIG.maxRoles).toBe(1000);
    expect(DEFAULT_RBAC_CONFIG.allowRoleInheritance).toBe(true);
  });

  it("creates standardized errors", () => {
    const error = createRBACError(
      RBAC_ERROR_CODES.INVALID_ROLE,
      "Invalid role.",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("RBACError");
    expect(error.code).toBe("INVALID_ROLE");
  });

  it("uses a safe fallback error code", () => {
    expect(createRBACError("UNKNOWN", "Error.").code)
      .toBe("PROVIDER_ERROR");
  });

  it("validates default configuration", () => {
    const config = validateRBACConfig();

    expect(config.maxRoles).toBe(1000);
    expect(config.maxRolesPerUser).toBe(100);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("accepts valid custom configuration", () => {
    const config = validateRBACConfig({
      maxRoles: 50,
      maxRolesPerUser: 5,
      allowRoleInheritance: false,
    });

    expect(config.maxRoles).toBe(50);
    expect(config.maxRolesPerUser).toBe(5);
    expect(config.allowRoleInheritance).toBe(false);
  });

  it("rejects invalid configuration", () => {
    expect(() => validateRBACConfig(null)).toThrow();
    expect(() =>
      validateRBACConfig({ maxRoles: 0 }),
    ).toThrow();
    expect(() =>
      validateRBACConfig({ allowRoleInheritance: "yes" }),
    ).toThrow();
  });

  it("rejects unknown configuration options", () => {
    expect(() =>
      validateRBACConfig({ unknown: true }),
    ).toThrow();
  });

  it("rejects unsupported contract versions", () => {
    expect(() =>
      validateRBACConfig({ version: "2.0.0" }),
    ).toThrow();
  });

  it("validates role creation requests", () => {
    const request = validateRBACRequest({
      action: "createRole",
      role: {
        id: "admin",
        name: "Administrator",
        permissions: ["database.read"],
        inherits: [],
      },
    });

    expect(request.role.id).toBe("admin");
    expect(Object.isFrozen(request.role)).toBe(true);
  });

  it("removes duplicate permissions and inherited roles", () => {
    const request = validateRBACRequest({
      action: "createRole",
      role: {
        id: "editor",
        name: "Editor",
        permissions: ["content.read", "content.read"],
        inherits: ["viewer", "viewer"],
      },
    });

    expect(request.role.permissions).toEqual(["content.read"]);
    expect(request.role.inherits).toEqual(["viewer"]);
  });

  it("rejects invalid role definitions", () => {
    expect(() =>
      validateRBACRequest({
        action: "createRole",
        role: { id: "", name: "Invalid" },
      }),
    ).toThrow();
  });

  it("validates role update requests", () => {
    const request = validateRBACRequest({
      action: "updateRole",
      id: "editor",
      role: {
        name: "Content Editor",
        permissions: ["content.write"],
      },
    });

    expect(request.id).toBe("editor");
    expect(request.role.id).toBe("editor");
  });

  it("validates role lookup and deletion requests", () => {
    expect(
      validateRBACRequest({
        action: "getRole",
        id: "admin",
      }).id,
    ).toBe("admin");

    expect(
      validateRBACRequest({
        action: "deleteRole",
        id: "admin",
      }).action,
    ).toBe("deleteRole");
  });

  it("validates user-role assignment requests", () => {
    const request = validateRBACRequest({
      action: "assignRole",
      userId: "user-1",
      roleId: "admin",
    });

    expect(request.userId).toBe("user-1");
    expect(request.roleId).toBe("admin");
  });

  it("validates user-role removal and lookup requests", () => {
    expect(
      validateRBACRequest({
        action: "removeRole",
        userId: "user-1",
        roleId: "admin",
      }).action,
    ).toBe("removeRole");

    expect(
      validateRBACRequest({
        action: "getUserRoles",
        userId: "user-1",
      }).userId,
    ).toBe("user-1");
  });

  it("validates role check requests", () => {
    const request = validateRBACRequest({
      action: "checkRole",
      userId: "user-1",
      roleId: "admin",
    });

    expect(request.roleId).toBe("admin");
  });

  it("validates list and status requests", () => {
    expect(
      validateRBACRequest({ action: "listRoles" }).action,
    ).toBe("listRoles");

    expect(
      validateRBACRequest({ action: "getStatus" }).action,
    ).toBe("getStatus");
  });

  it("rejects invalid actions and missing identifiers", () => {
    expect(() =>
      validateRBACRequest({ action: "unknown" }),
    ).toThrow();

    expect(() =>
      validateRBACRequest({
        action: "assignRole",
        userId: "user-1",
      }),
    ).toThrow();
  });

  it("creates standardized responses", () => {
    const response = createRBACResponse({
      action: "createRole",
      data: { id: "admin" },
    });

    expect(response.success).toBe(true);
    expect(response.version).toBe("1.0.0");
    expect(Object.isFrozen(response)).toBe(true);
  });
});
