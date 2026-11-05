
/**
 * XSUS App — Permission Engine
 * Version: 1.0.0
 *
 * Ruajtja aktuale: RAM.
 * RBAC dhe Authorization mbeten module të pavarura.
 */

import {
  PERMISSION_ERROR_CODES,
  createPermissionError,
  validatePermissionConfig,
  validatePermissionRequest,
} from "./permission-contracts.js";

export const PERMISSION_ENGINE_VERSION = "1.0.0";

export function createPermissionEngine(options = {}) {
  const config = validatePermissionConfig(options.config ?? {});

  const permissions = new Map();
  const assignments = new Map();
  const history = [];

  let closed = false;

  function ensureOpen() {
    if (closed) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.ALREADY_CLOSED,
        "Permission engine is closed.",
      );
    }
  }

  function clonePermission(permission) {
    return Object.freeze({
      id: permission.id,
      resource: permission.resource,
      action: permission.action,
      description: permission.description ?? "",
    });
  }

  function record(event, details = {}) {
    history.push(Object.freeze({
      event,
      timestamp: new Date().toISOString(),
      ...details,
    }));

    if (history.length > 100) {
      history.shift();
    }
  }

  function subjectKey(subject) {
    return `${subject.type}:${subject.id}`;
  }

  function getAssignmentSet(subject, create = false) {
    const key = subjectKey(subject);

    if (!assignments.has(key) && create) {
      assignments.set(key, new Set());
    }

    return assignments.get(key) ?? null;
  }

  function createPermission(permission) {
    ensureOpen();

    const request = validatePermissionRequest({
      action: "createPermission",
      permission,
    });

    const normalized = request.permission;

    if (permissions.has(normalized.id)) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.PERMISSION_ALREADY_EXISTS,
        "Permission already exists.",
        { permissionId: normalized.id },
      );
    }

    if (permissions.size >= config.maxPermissions) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_PERMISSION,
        "Maximum permission limit reached.",
      );
    }

    const stored = clonePermission(normalized);
    permissions.set(stored.id, stored);

    record("permission.created", {
      permissionId: stored.id,
    });

    return stored;
  }

  function getPermission(id) {
    ensureOpen();

    const request = validatePermissionRequest({
      action: "getPermission",
      id,
    });

    const permission = permissions.get(request.id);

    if (!permission) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.PERMISSION_NOT_FOUND,
        "Permission not found.",
        { permissionId: request.id },
      );
    }

    return permission;
  }

  function listPermissions() {
    ensureOpen();
    return Object.freeze([...permissions.values()]);
  }

  function updatePermission(id, updates) {
    ensureOpen();

    const request = validatePermissionRequest({
      action: "updatePermission",
      id,
      permission: updates,
    });

    const existing = permissions.get(request.id);

    if (!existing) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.PERMISSION_NOT_FOUND,
        "Permission not found.",
        { permissionId: request.id },
      );
    }

    const updated = clonePermission({
      ...existing,
      ...request.permission,
      id: existing.id,
    });

    permissions.set(updated.id, updated);

    record("permission.updated", {
      permissionId: updated.id,
    });

    return updated;
  }

  function deletePermission(id) {
    ensureOpen();

    const request = validatePermissionRequest({
      action: "deletePermission",
      id,
    });

    if (!permissions.has(request.id)) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.PERMISSION_NOT_FOUND,
        "Permission not found.",
        { permissionId: request.id },
      );
    }

    permissions.delete(request.id);

    for (const [key, permissionIds] of assignments.entries()) {
      permissionIds.delete(request.id);

      if (permissionIds.size === 0) {
        assignments.delete(key);
      }
    }

    record("permission.deleted", {
      permissionId: request.id,
    });

    return true;
  }

  function grantPermission(subject, permissionId) {
    ensureOpen();

    const request = validatePermissionRequest({
      action: "grantPermission",
      subject,
      permissionId,
    });

    if (
      request.subject.type === "user" &&
      !config.allowUserPermissions
    ) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_SUBJECT,
        "Direct user permissions are disabled.",
      );
    }

    if (
      request.subject.type === "role" &&
      !config.allowRolePermissions
    ) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_SUBJECT,
        "Role permissions are disabled.",
      );
    }

    if (!permissions.has(request.permissionId)) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.PERMISSION_NOT_FOUND,
        "Permission not found.",
        { permissionId: request.permissionId },
      );
    }

    const current = getAssignmentSet(request.subject, true);

    if (current.has(request.permissionId)) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.PERMISSION_ALREADY_GRANTED,
        "Permission is already granted to this subject.",
      );
    }

    if (current.size >= config.maxPermissionsPerSubject) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_PERMISSION,
        "Maximum permissions per subject reached.",
      );
    }

    current.add(request.permissionId);

    record("permission.granted", {
      subject: request.subject,
      permissionId: request.permissionId,
    });

    return Object.freeze({
      subject: request.subject,
      permissionId: request.permissionId,
      granted: true,
    });
  }

  function revokePermission(subject, permissionId) {
    ensureOpen();

    const request = validatePermissionRequest({
      action: "revokePermission",
      subject,
      permissionId,
    });

    const current = getAssignmentSet(request.subject);

    if (!current || !current.has(request.permissionId)) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.PERMISSION_NOT_GRANTED,
        "Permission is not granted to this subject.",
      );
    }

    current.delete(request.permissionId);

    if (current.size === 0) {
      assignments.delete(subjectKey(request.subject));
    }

    record("permission.revoked", {
      subject: request.subject,
      permissionId: request.permissionId,
    });

    return Object.freeze({
      subject: request.subject,
      permissionId: request.permissionId,
      revoked: true,
    });
  }

  function getSubjectPermissions(subject) {
    ensureOpen();

    const request = validatePermissionRequest({
      action: "getSubjectPermissions",
      subject,
    });

    const current = getAssignmentSet(request.subject);

    if (!current) {
      return Object.freeze([]);
    }

    return Object.freeze(
      [...current]
        .map((id) => permissions.get(id))
        .filter(Boolean),
    );
  }

  function checkPermission(subject, permissionId) {
    ensureOpen();

    const request = validatePermissionRequest({
      action: "checkPermission",
      subject,
      permissionId,
    });

    if (!permissions.has(request.permissionId)) {
      return false;
    }

    const current = getAssignmentSet(request.subject);

    return current
      ? current.has(request.permissionId)
      : false;
  }

  function processRequest(request = {}) {
    ensureOpen();

    const validated = validatePermissionRequest(request);

    switch (validated.action) {
      case "createPermission":
        return createPermission(validated.permission);

      case "getPermission":
        return getPermission(validated.id);

      case "listPermissions":
        return listPermissions();

      case "updatePermission":
        return updatePermission(
          validated.id,
          validated.permission,
        );

      case "deletePermission":
        return deletePermission(validated.id);

      case "grantPermission":
        return grantPermission(
          validated.subject,
          validated.permissionId,
        );

      case "revokePermission":
        return revokePermission(
          validated.subject,
          validated.permissionId,
        );

      case "getSubjectPermissions":
        return getSubjectPermissions(validated.subject);

      case "checkPermission":
        return checkPermission(
          validated.subject,
          validated.permissionId,
        );

      case "getStatus":
        return getStatus();

      default:
        throw createPermissionError(
          PERMISSION_ERROR_CODES.INVALID_ACTION,
          "Unsupported permission action.",
        );
    }
  }

  function getStatus() {
    ensureOpen();

    let assignmentCount = 0;

    for (const permissionIds of assignments.values()) {
      assignmentCount += permissionIds.size;
    }

    return Object.freeze({
      version: PERMISSION_ENGINE_VERSION,
      closed,
      permissionCount: permissions.size,
      subjectCount: assignments.size,
      assignmentCount,
      historyCount: history.length,
    });
  }

  function getHistory() {
    ensureOpen();
    return Object.freeze([...history]);
  }

  function close() {
    if (closed) return false;

    permissions.clear();
    assignments.clear();
    history.length = 0;
    closed = true;

    return true;
  }

  return Object.freeze({
    createPermission,
    getPermission,
    listPermissions,
    updatePermission,
    deletePermission,
    grantPermission,
    revokePermission,
    getSubjectPermissions,
    checkPermission,
    processRequest,
    getStatus,
    getHistory,
    close,
  });
}
