
/**
 * XSUS App — Permission Contracts
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Standardizimi i veprimeve të lejeve.
 * - Validimi i konfigurimit dhe kërkesave.
 * - Standardizimi i gabimeve dhe përgjigjeve.
 */

export const PERMISSION_CONTRACT_VERSION = "1.0.0";

export const PERMISSION_ACTIONS = Object.freeze([
  "createPermission",
  "getPermission",
  "listPermissions",
  "updatePermission",
  "deletePermission",
  "grantPermission",
  "revokePermission",
  "getSubjectPermissions",
  "checkPermission",
  "getStatus",
]);

export const PERMISSION_SUBJECT_TYPES = Object.freeze([
  "user",
  "role",
]);

export const PERMISSION_ERROR_CODES = Object.freeze({
  INVALID_CONFIG: "INVALID_CONFIG",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_ACTION: "INVALID_ACTION",
  INVALID_PERMISSION: "INVALID_PERMISSION",
  PERMISSION_NOT_FOUND: "PERMISSION_NOT_FOUND",
  PERMISSION_ALREADY_EXISTS: "PERMISSION_ALREADY_EXISTS",
  INVALID_SUBJECT: "INVALID_SUBJECT",
  SUBJECT_NOT_FOUND: "SUBJECT_NOT_FOUND",
  PERMISSION_ALREADY_GRANTED: "PERMISSION_ALREADY_GRANTED",
  PERMISSION_NOT_GRANTED: "PERMISSION_NOT_GRANTED",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  ALREADY_CLOSED: "ALREADY_CLOSED",
});

export const DEFAULT_PERMISSION_CONFIG = Object.freeze({
  version: PERMISSION_CONTRACT_VERSION,
  maxPermissions: 2000,
  maxPermissionsPerSubject: 200,
  allowRolePermissions: true,
  allowUserPermissions: true,
});

export function createPermissionError(
  code,
  message,
  details = null,
) {
  const validCode = Object.values(PERMISSION_ERROR_CODES).includes(code)
    ? code
    : PERMISSION_ERROR_CODES.PROVIDER_ERROR;

  const error = new Error(
    `[${validCode}] ${message || "Permission error."}`,
  );

  error.name = "PermissionError";
  error.code = validCode;
  error.details = details;

  return error;
}

export function validatePermissionConfig(config = {}) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_CONFIG,
      "Configuration must be an object.",
    );
  }

  const allowedKeys = [
    "version",
    "maxPermissions",
    "maxPermissionsPerSubject",
    "allowRolePermissions",
    "allowUserPermissions",
  ];

  for (const key of Object.keys(config)) {
    if (!allowedKeys.includes(key)) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_CONFIG,
        `Unknown configuration option: ${key}.`,
      );
    }
  }

  if (
    config.version !== undefined &&
    config.version !== PERMISSION_CONTRACT_VERSION
  ) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_CONFIG,
      "Unsupported permission contract version.",
    );
  }

  for (const key of [
    "maxPermissions",
    "maxPermissionsPerSubject",
  ]) {
    if (
      config[key] !== undefined &&
      (!Number.isInteger(config[key]) || config[key] < 1)
    ) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_CONFIG,
        `${key} must be a positive integer.`,
      );
    }
  }

  for (const key of [
    "allowRolePermissions",
    "allowUserPermissions",
  ]) {
    if (
      config[key] !== undefined &&
      typeof config[key] !== "boolean"
    ) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_CONFIG,
        `${key} must be a boolean.`,
      );
    }
  }

  return Object.freeze({
    ...DEFAULT_PERMISSION_CONFIG,
    ...config,
  });
}

function validatePermissionDefinition(permission) {
  if (
    !permission ||
    typeof permission !== "object" ||
    Array.isArray(permission)
  ) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_PERMISSION,
      "Permission definition must be an object.",
    );
  }

  if (
    typeof permission.id !== "string" ||
    !permission.id.trim() ||
    typeof permission.resource !== "string" ||
    !permission.resource.trim() ||
    typeof permission.action !== "string" ||
    !permission.action.trim()
  ) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_PERMISSION,
      "Permission id, resource and action are required.",
    );
  }

  return Object.freeze({
    id: permission.id,
    resource: permission.resource,
    action: permission.action,
    description:
      typeof permission.description === "string"
        ? permission.description
        : "",
  });
}

function validateSubject(subject) {
  if (
    !subject ||
    typeof subject !== "object" ||
    Array.isArray(subject)
  ) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_SUBJECT,
      "Subject must be an object.",
    );
  }

  if (!PERMISSION_SUBJECT_TYPES.includes(subject.type)) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_SUBJECT,
      "Unsupported subject type.",
    );
  }

  if (
    typeof subject.id !== "string" ||
    !subject.id.trim()
  ) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_SUBJECT,
      "Subject id is required.",
    );
  }

  return Object.freeze({
    type: subject.type,
    id: subject.id,
  });
}

export function validatePermissionRequest(request = {}) {
  if (
    !request ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_REQUEST,
      "Permission request must be an object.",
    );
  }

  const { action } = request;

  if (
    typeof action !== "string" ||
    !PERMISSION_ACTIONS.includes(action)
  ) {
    throw createPermissionError(
      PERMISSION_ERROR_CODES.INVALID_ACTION,
      "Unsupported permission action.",
    );
  }

  if (
    action === "getStatus" ||
    action === "listPermissions"
  ) {
    return Object.freeze({ action });
  }

  if (action === "createPermission") {
    return Object.freeze({
      action,
      permission: validatePermissionDefinition(request.permission),
    });
  }

  if (action === "updatePermission") {
    if (
      typeof request.id !== "string" ||
      !request.id.trim()
    ) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_REQUEST,
        "Permission id is required.",
      );
    }

    return Object.freeze({
      action,
      id: request.id,
      permission: validatePermissionDefinition({
        ...request.permission,
        id: request.id,
      }),
    });
  }

  if (
    action === "getPermission" ||
    action === "deletePermission"
  ) {
    if (
      typeof request.id !== "string" ||
      !request.id.trim()
    ) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_REQUEST,
        "Permission id is required.",
      );
    }

    return Object.freeze({
      action,
      id: request.id,
    });
  }

  if (
    [
      "grantPermission",
      "revokePermission",
      "checkPermission",
    ].includes(action)
  ) {
    const subject = validateSubject(request.subject);

    if (
      typeof request.permissionId !== "string" ||
      !request.permissionId.trim()
    ) {
      throw createPermissionError(
        PERMISSION_ERROR_CODES.INVALID_REQUEST,
        "Permission id is required.",
      );
    }

    return Object.freeze({
      action,
      subject,
      permissionId: request.permissionId,
    });
  }

  if (action === "getSubjectPermissions") {
    return Object.freeze({
      action,
      subject: validateSubject(request.subject),
    });
  }

  throw createPermissionError(
    PERMISSION_ERROR_CODES.INVALID_ACTION,
    "Unsupported permission action.",
  );
}

export function createPermissionResponse({
  success = true,
  action = null,
  data = null,
  metadata = {},
} = {}) {
  return Object.freeze({
    success,
    action,
    data,
    version: PERMISSION_CONTRACT_VERSION,
    metadata: Object.freeze({ ...metadata }),
  });
}
