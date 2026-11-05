
import { describe, it, expect } from "vitest";

import {
  PERMISSION_CONTRACT_VERSION,
  PERMISSION_ACTIONS,
  PERMISSION_SUBJECT_TYPES,
  PERMISSION_ERROR_CODES,
  DEFAULT_PERMISSION_CONFIG,
  createPermissionError,
  validatePermissionConfig,
  validatePermissionRequest,
  createPermissionResponse,
} from "../../apps/app/security/permissions/permission-contracts.js";

describe("Permission Contracts", () => {
  it("exposes the contract version", () => {
    expect(PERMISSION_CONTRACT_VERSION).toBe("1.0.0");
  });

  it("exposes supported actions", () => {
    expect(PERMISSION_ACTIONS).toContain("createPermission");
    expect(PERMISSION_ACTIONS).toContain("grantPermission");
    expect(PERMISSION_ACTIONS).toContain("checkPermission");
  });

  it("exposes supported subject types", () => {
    expect(PERMISSION_SUBJECT_TYPES).toEqual(["user", "role"]);
  });

  it("exposes standard error codes", () => {
    expect(PERMISSION_ERROR_CODES.PERMISSION_NOT_FOUND)
      .toBe("PERMISSION_NOT_FOUND");
  });

  it("provides default configuration", () => {
    expect(DEFAULT_PERMISSION_CONFIG.maxPermissions).toBe(2000);
    expect(DEFAULT_PERMISSION_CONFIG.allowRolePermissions).toBe(true);
    expect(DEFAULT_PERMISSION_CONFIG.allowUserPermissions).toBe(true);
  });

  it("creates standardized errors", () => {
    const error = createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_PERMISSION,
      "Invalid permission.",
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PermissionError");
    expect(error.code).toBe("INVALID_PERMISSION");
  });

  it("uses a fallback for unknown error codes", () => {
    expect(
      createPermissionError("UNKNOWN", "Error.").code,
    ).toBe("PROVIDER_ERROR");
  });

  it("validates default configuration", () => {
    const config = validatePermissionConfig();

    expect(config.maxPermissions).toBe(2000);
    expect(config.maxPermissionsPerSubject).toBe(200);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("accepts valid custom configuration", () => {
    const config = validatePermissionConfig({
      maxPermissions: 100,
      maxPermissionsPerSubject: 10,
      allowRolePermissions: false,
      allowUserPermissions: true,
    });

    expect(config.maxPermissions).toBe(100);
    expect(config.allowRolePermissions).toBe(false);
  });

  it("rejects invalid configurations", () => {
    expect(() => validatePermissionConfig(null)).toThrow();

    expect(() =>
      validatePermissionConfig({ maxPermissions: 0 }),
    ).toThrow();

    expect(() =>
      validatePermissionConfig({ allowUserPermissions: "yes" }),
    ).toThrow();
  });

  it("rejects unknown configuration options", () => {
    expect(() =>
      validatePermissionConfig({ unknown: true }),
    ).toThrow();
  });

  it("rejects unsupported versions", () => {
    expect(() =>
      validatePermissionConfig({ version: "2.0.0" }),
    ).toThrow();
  });

  it("validates permission creation requests", () => {
    const request = validatePermissionRequest({
      action: "createPermission",
      permission: {
        id: "database.read",
        resource: "database",
        action: "read",
      },
    });

    expect(request.permission.id).toBe("database.read");
    expect(Object.isFrozen(request.permission)).toBe(true);
  });

  it("rejects invalid permission definitions", () => {
    expect(() =>
      validatePermissionRequest({
        action: "createPermission",
        permission: {
          id: "",
          resource: "database",
          action: "read",
        },
      }),
    ).toThrow();
  });

  it("validates permission update requests", () => {
    const request = validatePermissionRequest({
      action: "updatePermission",
      id: "database.read",
      permission: {
        resource: "database",
        action: "read",
      },
    });

    expect(request.id).toBe("database.read");
    expect(request.permission.id).toBe("database.read");
  });

  it("validates permission lookup and deletion", () => {
    expect(
      validatePermissionRequest({
        action: "getPermission",
        id: "database.read",
      }).id,
    ).toBe("database.read");

    expect(
      validatePermissionRequest({
        action: "deletePermission",
        id: "database.read",
      }).action,
    ).toBe("deletePermission");
  });

  it("validates user permission grants", () => {
    const request = validatePermissionRequest({
      action: "grantPermission",
      subject: { type: "user", id: "user-1" },
      permissionId: "database.read",
    });

    expect(request.subject.type).toBe("user");
    expect(request.subject.id).toBe("user-1");
  });

  it("validates role permission grants", () => {
    const request = validatePermissionRequest({
      action: "grantPermission",
      subject: { type: "role", id: "admin" },
      permissionId: "database.read",
    });

    expect(request.subject.type).toBe("role");
  });

  it("validates permission revocation", () => {
    const request = validatePermissionRequest({
      action: "revokePermission",
      subject: { type: "user", id: "user-1" },
      permissionId: "database.read",
    });

    expect(request.action).toBe("revokePermission");
  });

  it("validates subject permission lookup", () => {
    const request = validatePermissionRequest({
      action: "getSubjectPermissions",
      subject: { type: "role", id: "admin" },
    });

    expect(request.subject.id).toBe("admin");
  });

  it("validates permission checks", () => {
    const request = validatePermissionRequest({
      action: "checkPermission",
      subject: { type: "user", id: "user-1" },
      permissionId: "database.read",
    });

    expect(request.permissionId).toBe("database.read");
  });

  it("validates list and status requests", () => {
    expect(
      validatePermissionRequest({
        action: "listPermissions",
      }).action,
    ).toBe("listPermissions");

    expect(
      validatePermissionRequest({
        action: "getStatus",
      }).action,
    ).toBe("getStatus");
  });

  it("rejects invalid actions and missing fields", () => {
    expect(() =>
      validatePermissionRequest({ action: "unknown" }),
    ).toThrow();

    expect(() =>
      validatePermissionRequest({
        action: "grantPermission",
        subject: { type: "user", id: "user-1" },
      }),
    ).toThrow();
  });

  it("rejects invalid subjects", () => {
    expect(() =>
      validatePermissionRequest({
        action: "grantPermission",
        subject: { type: "unknown", id: "user-1" },
        permissionId: "database.read",
      }),
    ).toThrow();
  });

  it("creates standardized responses", () => {
    const response = createPermissionResponse({
      action: "createPermission",
      data: { id: "database.read" },
    });

    expect(response.success).toBe(true);
    expect(response.version).toBe("1.0.0");
    expect(Object.isFrozen(response)).toBe(true);
  });
});
