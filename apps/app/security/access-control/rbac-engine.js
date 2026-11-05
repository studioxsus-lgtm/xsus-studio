
/**
 * XSUS App — RBAC Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Menaxhimi i roleve.
 * - Caktimi dhe heqja e roleve te përdoruesit.
 * - Kontrolli i roleve direkte dhe të trashëguara.
 * - Mbrojtja nga trashëgimia ciklike.
 * - Historiku dhe lifecycle në RAM.
 */

import {
  RBAC_CONTRACT_VERSION,
  RBAC_ERROR_CODES,
  createRBACError,
  createRBACResponse,
  validateRBACConfig,
  validateRBACRequest,
} from "./rbac-contracts.js";

export const RBAC_ENGINE_VERSION = "1.0.0";

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneRole(role) {
  return Object.freeze({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: Object.freeze([...role.permissions]),
    inherits: Object.freeze([...role.inherits]),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  });
}

export function createRBACEngine(options = {}) {
  if (!isPlainObject(options)) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_CONFIG,
      "Engine options must be an object.",
    );
  }

  const config = validateRBACConfig(options.config ?? {});

  const roles = new Map();
  const userRoles = new Map();
  const history = [];

  let closed = false;

  function assertOpen() {
    if (closed) {
      throw createRBACError(
        RBAC_ERROR_CODES.ALREADY_CLOSED,
        "RBAC Engine is closed.",
      );
    }
  }

  function record(action, details = {}) {
    history.push(
      Object.freeze({
        action,
        timestamp: new Date().toISOString(),
        ...details,
      }),
    );

    while (history.length > (options.maxHistory ?? 100)) {
      history.shift();
    }
  }

  function validateUserId(userId) {
    if (typeof userId !== "string" || !userId.trim()) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_USER,
        "A valid user id is required.",
      );
    }
  }

  function getRoleInternal(id) {
    const role = roles.get(id);

    if (!role) {
      throw createRBACError(
        RBAC_ERROR_CODES.ROLE_NOT_FOUND,
        `Role ${id} was not found.`,
      );
    }

    return role;
  }

  function validateInheritance(roleId, inheritedRoleIds) {
    if (!config.allowRoleInheritance && inheritedRoleIds.length > 0) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_ROLE,
        "Role inheritance is disabled.",
      );
    }

    for (const inheritedId of inheritedRoleIds) {
      if (!roles.has(inheritedId)) {
        throw createRBACError(
          RBAC_ERROR_CODES.INHERITED_ROLE_NOT_FOUND,
          `Inherited role ${inheritedId} was not found.`,
        );
      }
    }

    function reachesTarget(currentId, visited = new Set()) {
      if (currentId === roleId) {
        return true;
      }

      if (visited.has(currentId)) {
        return false;
      }

      visited.add(currentId);

      const current = roles.get(currentId);

      if (!current) {
        return false;
      }

      return current.inherits.some((id) =>
        reachesTarget(id, visited),
      );
    }

    for (const inheritedId of inheritedRoleIds) {
      if (reachesTarget(inheritedId)) {
        throw createRBACError(
          RBAC_ERROR_CODES.CIRCULAR_INHERITANCE,
          "Circular role inheritance is not allowed.",
        );
      }
    }
  }

  function normalizeRole(input, existing = null) {
    if (!isPlainObject(input)) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_ROLE,
        "Role definition must be an object.",
      );
    }

    const id = existing?.id ?? input.id;

    if (typeof id !== "string" || !id.trim()) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_ROLE,
        "Role id is required.",
      );
    }

    const name = input.name ?? existing?.name;

    if (typeof name !== "string" || !name.trim()) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_ROLE,
        "Role name is required.",
      );
    }

    const permissions =
      input.permissions ?? existing?.permissions ?? [];

    const inherits =
      input.inherits ?? existing?.inherits ?? [];

    if (
      !Array.isArray(permissions) ||
      !permissions.every(
        (item) => typeof item === "string" && item.trim(),
      )
    ) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_ROLE,
        "Role permissions must contain non-empty strings.",
      );
    }

    if (
      !Array.isArray(inherits) ||
      !inherits.every(
        (item) => typeof item === "string" && item.trim(),
      )
    ) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_ROLE,
        "Role inheritance must contain valid role ids.",
      );
    }

    const normalizedPermissions = [...new Set(permissions)];
    const normalizedInherits = [...new Set(inherits)];

    validateInheritance(id, normalizedInherits);

    const now = new Date().toISOString();

    return cloneRole({
      id,
      name: name.trim(),
      description:
        input.description ?? existing?.description ?? "",
      permissions: normalizedPermissions,
      inherits: normalizedInherits,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  function createRole(input = {}) {
    assertOpen();

    const request = validateRBACRequest({
      action: "createRole",
      role: input,
    });

    const { role: validatedRole } = request;

    if (roles.has(validatedRole.id)) {
      throw createRBACError(
        RBAC_ERROR_CODES.ROLE_ALREADY_EXISTS,
        `Role ${validatedRole.id} already exists.`,
      );
    }

    if (roles.size >= config.maxRoles) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_CONFIG,
        "Maximum number of roles reached.",
      );
    }

    const role = normalizeRole(validatedRole);

    roles.set(role.id, role);
    record("createRole", { roleId: role.id });

    return createRBACResponse({
      action: "createRole",
      data: role,
    });
  }

  function getRole(id) {
    assertOpen();

    const request = validateRBACRequest({
      action: "getRole",
      id,
    });

    return createRBACResponse({
      action: "getRole",
      data: cloneRole(getRoleInternal(request.id)),
    });
  }

  function listRoles() {
    assertOpen();

    const data = [...roles.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(cloneRole);

    return createRBACResponse({
      action: "listRoles",
      data: Object.freeze(data),
    });
  }

  function updateRole(id, input = {}) {
    assertOpen();

    const request = validateRBACRequest({
      action: "updateRole",
      id,
      role: input,
    });

    const existing = getRoleInternal(request.id);
    const updated = normalizeRole(request.role, existing);

    roles.set(updated.id, updated);
    record("updateRole", { roleId: updated.id });

    return createRBACResponse({
      action: "updateRole",
      data: updated,
    });
  }

  function deleteRole(id) {
    assertOpen();

    const request = validateRBACRequest({
      action: "deleteRole",
      id,
    });

    const role = getRoleInternal(request.id);

    for (const candidate of roles.values()) {
      if (candidate.inherits.includes(role.id)) {
        throw createRBACError(
          RBAC_ERROR_CODES.INVALID_ROLE,
          "Cannot delete a role inherited by another role.",
        );
      }
    }

    for (const [userId, assignedRoles] of userRoles.entries()) {
      if (assignedRoles.has(role.id)) {
        assignedRoles.delete(role.id);

        if (assignedRoles.size === 0) {
          userRoles.delete(userId);
        }
      }
    }

    roles.delete(role.id);
    record("deleteRole", { roleId: role.id });

    return createRBACResponse({
      action: "deleteRole",
      data: { id: role.id, deleted: true },
    });
  }

  function assignRole(userId, roleId) {
    assertOpen();

    const request = validateRBACRequest({
      action: "assignRole",
      userId,
      roleId,
    });

    validateUserId(request.userId);
    getRoleInternal(request.roleId);

    const assigned = userRoles.get(request.userId) ?? new Set();

    if (assigned.has(request.roleId)) {
      throw createRBACError(
        RBAC_ERROR_CODES.ROLE_ALREADY_ASSIGNED,
        "Role is already assigned to this user.",
      );
    }

    if (assigned.size >= config.maxRolesPerUser) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_CONFIG,
        "Maximum number of roles per user reached.",
      );
    }

    assigned.add(request.roleId);
    userRoles.set(request.userId, assigned);

    record("assignRole", {
      userId: request.userId,
      roleId: request.roleId,
    });

    return createRBACResponse({
      action: "assignRole",
      data: {
        userId: request.userId,
        roleId: request.roleId,
        assigned: true,
      },
    });
  }

  function removeRole(userId, roleId) {
    assertOpen();

    const request = validateRBACRequest({
      action: "removeRole",
      userId,
      roleId,
    });

    const assigned = userRoles.get(request.userId);

    if (!assigned || !assigned.has(request.roleId)) {
      throw createRBACError(
        RBAC_ERROR_CODES.ROLE_NOT_ASSIGNED,
        "Role is not assigned to this user.",
      );
    }

    assigned.delete(request.roleId);

    if (assigned.size === 0) {
      userRoles.delete(request.userId);
    }

    record("removeRole", {
      userId: request.userId,
      roleId: request.roleId,
    });

    return createRBACResponse({
      action: "removeRole",
      data: {
        userId: request.userId,
        roleId: request.roleId,
        removed: true,
      },
    });
  }

  function getUserRoles(userId) {
    assertOpen();

    const request = validateRBACRequest({
      action: "getUserRoles",
      userId,
    });

    const assigned = userRoles.get(request.userId) ?? new Set();

    const data = [...assigned]
      .map((id) => cloneRole(getRoleInternal(id)))
      .sort((a, b) => a.id.localeCompare(b.id));

    return createRBACResponse({
      action: "getUserRoles",
      data: Object.freeze(data),
    });
  }

  function collectInheritedRoles(roleId, result, visited) {
    if (visited.has(roleId)) {
      return;
    }

    visited.add(roleId);

    const role = getRoleInternal(roleId);

    for (const inheritedId of role.inherits) {
      result.add(inheritedId);
      collectInheritedRoles(inheritedId, result, visited);
    }
  }

  function checkRole(userId, roleId) {
    assertOpen();

    const request = validateRBACRequest({
      action: "checkRole",
      userId,
      roleId,
    });

    const assigned = userRoles.get(request.userId) ?? new Set();

    let found = assigned.has(request.roleId);

    if (!found && config.allowRoleInheritance) {
      for (const assignedRoleId of assigned) {
        const inherited = new Set();

        collectInheritedRoles(
          assignedRoleId,
          inherited,
          new Set(),
        );

        if (inherited.has(request.roleId)) {
          found = true;
          break;
        }
      }
    }

    return createRBACResponse({
      action: "checkRole",
      data: {
        userId: request.userId,
        roleId: request.roleId,
        hasRole: found,
      },
    });
  }

  function getStatus() {
    assertOpen();

    return Object.freeze({
      version: RBAC_ENGINE_VERSION,
      contractVersion: RBAC_CONTRACT_VERSION,
      closed,
      roleCount: roles.size,
      userCount: userRoles.size,
      assignmentCount: [...userRoles.values()].reduce(
        (total, assigned) => total + assigned.size,
        0,
      ),
      historySize: history.length,
      maxRoles: config.maxRoles,
      maxRolesPerUser: config.maxRolesPerUser,
      allowRoleInheritance: config.allowRoleInheritance,
    });
  }

  function getHistory() {
    assertOpen();
    return Object.freeze([...history]);
  }

  function processRequest(request = {}) {
    assertOpen();

    const validated = validateRBACRequest(request);

    switch (validated.action) {
      case "createRole":
        return createRole(validated.role);

      case "getRole":
        return getRole(validated.id);

      case "listRoles":
        return listRoles();

      case "updateRole":
        return updateRole(validated.id, validated.role);

      case "deleteRole":
        return deleteRole(validated.id);

      case "assignRole":
        return assignRole(validated.userId, validated.roleId);

      case "removeRole":
        return removeRole(validated.userId, validated.roleId);

      case "getUserRoles":
        return getUserRoles(validated.userId);

      case "checkRole":
        return checkRole(validated.userId, validated.roleId);

      case "getStatus":
        return getStatus();

      default:
        throw createRBACError(
          RBAC_ERROR_CODES.INVALID_ACTION,
          "Unsupported RBAC action.",
        );
    }
  }

  function close() {
    if (closed) {
      return false;
    }

    roles.clear();
    userRoles.clear();
    history.length = 0;
    closed = true;

    return true;
  }

  return Object.freeze({
    createRole,
    getRole,
    listRoles,
    updateRole,
    deleteRole,
    assignRole,
    removeRole,
    getUserRoles,
    checkRole,
    processRequest,
    getStatus,
    getHistory,
    close,
  });
}
