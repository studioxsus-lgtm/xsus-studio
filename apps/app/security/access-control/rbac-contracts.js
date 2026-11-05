
/**
 * XSUS App — RBAC Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Standardizimi i veprimeve RBAC.
 * - Validimi i konfigurimit dhe kërkesave.
 * - Standardizimi i gabimeve dhe përgjigjeve.
 */

export const RBAC_CONTRACT_VERSION = "1.0.0";

export const RBAC_ACTIONS = Object.freeze([
  "createRole",
  "getRole",
  "listRoles",
  "updateRole",
  "deleteRole",
  "assignRole",
  "removeRole",
  "getUserRoles",
  "checkRole",
  "getStatus",
]);

export const RBAC_ERROR_CODES = Object.freeze({
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_ACTION: "INVALID_ACTION",
  INVALID_ROLE: "INVALID_ROLE",
  ROLE_NOT_FOUND: "ROLE_NOT_FOUND",
  ROLE_ALREADY_EXISTS: "ROLE_ALREADY_EXISTS",
  INVALID_USER: "INVALID_USER",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ROLE_ALREADY_ASSIGNED: "ROLE_ALREADY_ASSIGNED",
  ROLE_NOT_ASSIGNED: "ROLE_NOT_ASSIGNED",
  CIRCULAR_INHERITANCE: "CIRCULAR_INHERITANCE",
  INHERITED_ROLE_NOT_FOUND: "INHERITED_ROLE_NOT_FOUND",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  ALREADY_CLOSED: "ALREADY_CLOSED",
});

export const DEFAULT_RBAC_CONFIG = Object.freeze({
  version: RBAC_CONTRACT_VERSION,
  maxRoles: 1000,
  maxRolesPerUser: 100,
  allowRoleInheritance: true,
});

export function createRBACError(code, message, details = null) {
  const validCode = Object.values(RBAC_ERROR_CODES).includes(code)
    ? code
    : RBAC_ERROR_CODES.PROVIDER_ERROR;

  const error = new Error(
    `[${validCode}] ${message || "RBAC error."}`,
  );

  error.name = "RBACError";
  error.code = validCode;
  error.details = details;

  return error;
}

export function validateRBACConfig(config = {}) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_CONFIG,
      "Configuration must be an object.",
    );
  }

  const allowedKeys = [
    "version",
    "maxRoles",
    "maxRolesPerUser",
    "allowRoleInheritance",
  ];

  for (const key of Object.keys(config)) {
    if (!allowedKeys.includes(key)) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_CONFIG,
        `Unknown configuration option: ${key}.`,
      );
    }
  }

  if (
    config.version !== undefined &&
    config.version !== RBAC_CONTRACT_VERSION
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_CONFIG,
      "Unsupported RBAC contract version.",
    );
  }

  for (const key of ["maxRoles", "maxRolesPerUser"]) {
    if (
      config[key] !== undefined &&
      (!Number.isInteger(config[key]) || config[key] < 1)
    ) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_CONFIG,
        `${key} must be a positive integer.`,
      );
    }
  }

  if (
    config.allowRoleInheritance !== undefined &&
    typeof config.allowRoleInheritance !== "boolean"
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_CONFIG,
      "allowRoleInheritance must be a boolean.",
    );
  }

  return Object.freeze({
    ...DEFAULT_RBAC_CONFIG,
    ...config,
  });
}

function validateRoleDefinition(role) {
  if (
    !role ||
    typeof role !== "object" ||
    Array.isArray(role)
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_ROLE,
      "Role definition must be an object.",
    );
  }

  if (
    typeof role.id !== "string" ||
    !role.id.trim() ||
    typeof role.name !== "string" ||
    !role.name.trim()
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_ROLE,
      "Role id and name are required.",
    );
  }

  if (
    role.permissions !== undefined &&
    (
      !Array.isArray(role.permissions) ||
      !role.permissions.every(
        (permission) =>
          typeof permission === "string" && permission.trim(),
      )
    )
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_ROLE,
      "Role permissions must be an array of non-empty strings.",
    );
  }

  if (
    role.inherits !== undefined &&
    (
      !Array.isArray(role.inherits) ||
      !role.inherits.every(
        (id) => typeof id === "string" && id.trim(),
      )
    )
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_ROLE,
      "Role inheritance must be an array of role IDs.",
    );
  }

  return Object.freeze({
    id: role.id,
    name: role.name,
    description:
      typeof role.description === "string"
        ? role.description
        : "",
    permissions: Object.freeze([
      ...new Set(role.permissions ?? []),
    ]),
    inherits: Object.freeze([
      ...new Set(role.inherits ?? []),
    ]),
  });
}

export function validateRBACRequest(request = {}) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_REQUEST,
      "RBAC request must be an object.",
    );
  }

  const { action } = request;

  if (
    typeof action !== "string" ||
    !RBAC_ACTIONS.includes(action)
  ) {
    throw createRBACError(
      RBAC_ERROR_CODES.INVALID_ACTION,
      "Unsupported RBAC action.",
    );
  }

  if (action === "getStatus" || action === "listRoles") {
    return Object.freeze({ action });
  }

  if (action === "createRole") {
    return Object.freeze({
      action,
      role: validateRoleDefinition(request.role),
    });
  }

  if (action === "updateRole") {
    if (
      typeof request.id !== "string" ||
      !request.id.trim()
    ) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_REQUEST,
        "Role id is required.",
      );
    }

    const role = validateRoleDefinition({
      ...request.role,
      id: request.id,
    });

    return Object.freeze({ action, id: request.id, role });
  }

  if (
    [
      "getRole",
      "deleteRole",
    ].includes(action)
  ) {
    if (
      typeof request.id !== "string" ||
      !request.id.trim()
    ) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_REQUEST,
        "Role id is required.",
      );
    }

    return Object.freeze({ action, id: request.id });
  }

  if (
    [
      "assignRole",
      "removeRole",
      "getUserRoles",
    ].includes(action)
  ) {
    if (
      typeof request.userId !== "string" ||
      !request.userId.trim()
    ) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_REQUEST,
        "User id is required.",
      );
    }

    if (
      action !== "getUserRoles" &&
      (
        typeof request.roleId !== "string" ||
        !request.roleId.trim()
      )
    ) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_REQUEST,
        "Role id is required.",
      );
    }

    return Object.freeze({
      action,
      userId: request.userId,
      ...(request.roleId ? { roleId: request.roleId } : {}),
    });
  }

  if (action === "checkRole") {
    if (
      typeof request.userId !== "string" ||
      !request.userId.trim() ||
      typeof request.roleId !== "string" ||
      !request.roleId.trim()
    ) {
      throw createRBACError(
        RBAC_ERROR_CODES.INVALID_REQUEST,
        "User id and role id are required.",
      );
    }

    return Object.freeze({
      action,
      userId: request.userId,
      roleId: request.roleId,
    });
  }

  throw createRBACError(
    RBAC_ERROR_CODES.INVALID_ACTION,
    "Unsupported RBAC action.",
  );
}

export function createRBACResponse({
  success = true,
  action = null,
  data = null,
  metadata = {},
} = {}) {
  return Object.freeze({
    success,
    action,
    data,
    version: RBAC_CONTRACT_VERSION,
    metadata: Object.freeze({ ...metadata }),
  });
}
