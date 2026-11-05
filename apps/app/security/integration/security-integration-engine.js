
/**
 * XSUS App — Security Integration Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Koordinimi i motorëve të sigurisë.
 * - Verifikimi i identitetit përmes Authentication Manager.
 * - Marrja e roleve dhe lejeve nga motorët autoritativë.
 * - Delegimi i autorizimit te Authorization Manager.
 * - Auditimi i vendimeve.
 * - Ruajtja e pavarësisë së motorëve të integruar.
 *
 * Ky modul nuk zëvendëson asnjë Security Engine.
 */

import {
  SECURITY_INTEGRATION_VERSION,
  SECURITY_INTEGRATION_ACTIONS,
  SECURITY_INTEGRATION_ERRORS,
  validateSecurityIntegrationConfig,
  validateSecurityIntegrationIdentity,
  validateSecurityIntegrationResource,
  validateSecurityIntegrationRequest,
  createSecurityIntegrationResponse,
  createSecurityIntegrationError,
} from "./security-integration-contracts.js";

import {
  encodeSecurityResource,
} from "./adapters/resource-adapter.js";

export const SECURITY_INTEGRATION_ENGINE_VERSION = "1.0.0";

const isObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const freeze = (value) => {
  if (!isObject(value) && !Array.isArray(value)) {
    return value;
  }

  for (const item of Object.values(value)) {
    freeze(item);
  }

  return Object.freeze(value);
};

const uniqueById = (items) => {
  const result = new Map();

  for (const item of items) {
    if (item && typeof item.id === "string") {
      result.set(item.id, item);
    }
  }

  return [...result.values()];
};

const normalizeError = (error, fallbackCode) => ({
  code:
    typeof error?.code === "string"
      ? error.code
      : fallbackCode,
  message:
    typeof error?.message === "string"
      ? error.message
      : "Security integration failed.",
});

export function createSecurityIntegrationEngine(options = {}) {
  const {
    authenticationManager,
    authorizationManager,
    rbacEngine,
    permissionEngine,
    auditEngine,
    config = {},
  } = options;

  const settings = validateSecurityIntegrationConfig(config);

  const dependencies = {
    authenticationManager,
    authorizationManager,
    rbacEngine,
    permissionEngine,
    auditEngine,
  };

  for (const [name, dependency] of Object.entries(dependencies)) {
    if (!dependency || typeof dependency !== "object") {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
        `${name} dependency is required.`
      );
    }
  }

  const requiredMethods = {
    authenticationManager: ["verify"],
    authorizationManager: [
      "authorize",
      "checkPermission",
      "checkRole",
    ],
    rbacEngine: [
      "getUserRoles",
      "getRole",
    ],
    permissionEngine: [
      "getSubjectPermissions",
    ],
    auditEngine: ["logEvent"],
  };

  for (const [name, methods] of Object.entries(requiredMethods)) {
    for (const method of methods) {
      if (typeof dependencies[name][method] !== "function") {
        throw createSecurityIntegrationError(
          SECURITY_INTEGRATION_ERRORS.INVALID_CONFIG,
          `${name}.${method} is required.`
        );
      }
    }
  }

  let closed = false;
  let sequence = Promise.resolve();
  const history = [];

  const ensureOpen = () => {
    if (closed) {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.INTEGRATION_CLOSED,
        "Security Integration Engine is closed."
      );
    }
  };

  const enqueue = (operation) => {
    const current = sequence.then(async () => {
      ensureOpen();
      return operation();
    });

    sequence = current.catch(() => undefined);
    return current;
  };

  const recordHistory = (entry) => {
    history.push(
      freeze({
        timestamp: new Date().toISOString(),
        ...entry,
      })
    );

    while (history.length > settings.maxHistory) {
      history.shift();
    }
  };

  const audit = async (event) => {
    if (!settings.requireAudit) {
      try {
        await auditEngine.logEvent(event);
        return true;
      } catch {
        return false;
      }
    }

    try {
      await auditEngine.logEvent(event);
      return true;
    } catch (error) {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.AUDIT_UNAVAILABLE,
        `Audit logging failed: ${error.message}`
      );
    }
  };

  const verifyIdentity = async (payload = {}) => {
    const verification = await authenticationManager.verify(payload);

    if (
      verification?.success !== true ||
      verification?.authenticated !== true ||
      !verification?.user
    ) {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.IDENTITY_NOT_VERIFIED,
        "Identity verification failed."
      );
    }

    const user = verification.user;

    const identity = {
      id: user.id,
      verified: true,
      roles: [],
      permissions: [],
    };

    validateSecurityIntegrationIdentity(identity);

    return identity;
  };

  const resolveRoles = async (userId) => {
    const response = await rbacEngine.getUserRoles(userId);

    if (!Array.isArray(response?.data)) {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
        "RBAC Engine returned an invalid role collection."
      );
    }

    const roles = [];
    const visited = new Set();

    const visit = async (role) => {
      if (
        !role ||
        typeof role.id !== "string" ||
        !role.id.trim()
      ) {
        throw createSecurityIntegrationError(
          SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
          "RBAC Engine returned an invalid role."
        );
      }

      if (visited.has(role.id)) {
        return;
      }

      visited.add(role.id);
      roles.push(role);

      if (!Array.isArray(role.inherits)) {
        return;
      }

      for (const inheritedId of role.inherits) {
        if (
          typeof inheritedId !== "string" ||
          !inheritedId.trim()
        ) {
          throw createSecurityIntegrationError(
            SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
            "RBAC Engine returned an invalid inherited role reference."
          );
        }

        const inherited = await rbacEngine.getRole(inheritedId);

        if (!inherited?.data) {
          throw createSecurityIntegrationError(
            SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
            "RBAC Engine could not resolve an inherited role."
          );
        }

        await visit(inherited.data);
      }
    };

    for (const role of response.data) {
      await visit(role);
    }

    return roles;
  };

  /**
   * Merr lejet vetëm nga Permission Engine.
   * Çdo përgjigje dhe çdo leje validohet.
   * Përgjigjet e pavlefshme nuk trajtohen si lista bosh.
   */
  const resolvePermissions = async (userId, roles) => {
    const permissionsById = new Map();

    const collect = async (subject) => {
      let result;

      try {
        result = await permissionEngine.getSubjectPermissions(subject);
      } catch (error) {
        throw createSecurityIntegrationError(
          SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
          `Permission Engine request failed: ${error?.message || "Unknown error."}`
        );
      }

      if (!Array.isArray(result)) {
        throw createSecurityIntegrationError(
          SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
          "Permission Engine returned an invalid permission collection."
        );
      }

      for (const permission of result) {
        if (
          !isObject(permission) ||
          typeof permission.id !== "string" ||
          !permission.id.trim() ||
          typeof permission.resource !== "string" ||
          !permission.resource.trim() ||
          typeof permission.action !== "string" ||
          !permission.action.trim()
        ) {
          throw createSecurityIntegrationError(
            SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
            "Permission Engine returned an invalid permission."
          );
        }

        permissionsById.set(permission.id, permission);
      }
    };

    await collect({
      id: userId,
      type: "user",
    });

    for (const role of roles) {
      await collect({
        id: role.id,
        type: "role",
      });
    }

    return [...permissionsById.values()];
  };

  const buildTrustedIdentity = async (payload) => {
    const verified = await verifyIdentity(payload);

    const roles = await resolveRoles(verified.id);

    const permissions = await resolvePermissions(
      verified.id,
      roles
    );

    const identity = {
      id: verified.id,
      verified: true,
      roles: roles.map((role) => role.id),
      permissions: permissions.map(
        (permission) => permission.id
      ),
    };

    validateSecurityIntegrationIdentity(identity);

    return freeze(identity);
  };

  const authorizeInternal = async (request) => {
    validateSecurityIntegrationRequest(request);

    const identity = await buildTrustedIdentity(
      request.authentication || {}
    );

    const resource = request.resource;

    validateSecurityIntegrationResource(resource);

    const encodedResource = encodeSecurityResource({
      id: resource.id,
      type: resource.type,
    });

    let authorization;

    try {
      authorization = await authorizationManager.authorize({
        identity,
        resource: encodedResource,
        operation: request.operation,
        context: request.context || {},
      });
    } catch (error) {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
        normalizeError(
          error,
          SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR
        ).message
      );
    }

    if (
      !authorization ||
      typeof authorization.allowed !== "boolean"
    ) {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
        "Authorization Manager returned an invalid decision."
      );
    }

    const allowed = authorization.allowed;

    const event = {
      type: "SECURITY_AUTHORIZATION",
      action: request.operation,
      subject: {
        id: identity.id,
        type: "user",
      },
      resource: {
        id: resource.id,
        type: resource.type,
      },
      metadata: {
        allowed,
        reason:
          typeof authorization.reason === "string"
            ? authorization.reason
            : null,
      },
    };

    await audit(event);

    recordHistory({
      action: SECURITY_INTEGRATION_ACTIONS.AUTHORIZE,
      subjectId: identity.id,
      resourceId: resource.id,
      allowed,
    });

    return createSecurityIntegrationResponse({
      action: SECURITY_INTEGRATION_ACTIONS.AUTHORIZE,
      allowed,
      reason: authorization.reason || null,
      data: {
        identity,
        resource,
      },
    });
  };

  const checkPermissionInternal = async (request) => {
    validateSecurityIntegrationRequest(request);

    const identity = await buildTrustedIdentity(
      request.authentication || {}
    );

    const permission = request.permission;

    if (typeof permission !== "string" || !permission.trim()) {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "permission is required."
      );
    }

    const result = await authorizationManager.checkPermission({
      identity,
      permission,
      context: request.context || {},
    });

    if (!result || typeof result.allowed !== "boolean") {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
        "Authorization Manager returned an invalid permission decision."
      );
    }

    const allowed = result.allowed;

    await audit({
      type: "SECURITY_PERMISSION_CHECK",
      action: permission,
      subject: {
        id: identity.id,
        type: "user",
      },
      metadata: { allowed },
    });

    recordHistory({
      action: SECURITY_INTEGRATION_ACTIONS.CHECK_PERMISSION,
      subjectId: identity.id,
      allowed,
    });

    return createSecurityIntegrationResponse({
      action: SECURITY_INTEGRATION_ACTIONS.CHECK_PERMISSION,
      allowed,
      reason: result.reason || null,
    });
  };

  const checkRoleInternal = async (request) => {
    validateSecurityIntegrationRequest(request);

    const identity = await buildTrustedIdentity(
      request.authentication || {}
    );

    const role = request.role;

    if (typeof role !== "string" || !role.trim()) {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.INVALID_REQUEST,
        "role is required."
      );
    }

    const result = await authorizationManager.checkRole({
      identity,
      role,
      context: request.context || {},
    });

    if (!result || typeof result.allowed !== "boolean") {
      throw createSecurityIntegrationError(
        SECURITY_INTEGRATION_ERRORS.PROVIDER_ERROR,
        "Authorization Manager returned an invalid role decision."
      );
    }

    const allowed = result.allowed;

    await audit({
      type: "SECURITY_ROLE_CHECK",
      action: role,
      subject: {
        id: identity.id,
        type: "user",
      },
      metadata: { allowed },
    });

    recordHistory({
      action: SECURITY_INTEGRATION_ACTIONS.CHECK_ROLE,
      subjectId: identity.id,
      allowed,
    });

    return createSecurityIntegrationResponse({
      action: SECURITY_INTEGRATION_ACTIONS.CHECK_ROLE,
      allowed,
      reason: result.reason || null,
    });
  };

  return Object.freeze({
    version: SECURITY_INTEGRATION_ENGINE_VERSION,

    authorize(request) {
      return enqueue(() => authorizeInternal(request));
    },

    checkPermission(request) {
      return enqueue(() => checkPermissionInternal(request));
    },

    checkRole(request) {
      return enqueue(() => checkRoleInternal(request));
    },

    getStatus() {
      return Object.freeze({
        version: SECURITY_INTEGRATION_ENGINE_VERSION,
        integrationVersion: SECURITY_INTEGRATION_VERSION,
        closed,
        historySize: history.length,
        denyByDefault: settings.denyByDefault,
        requireVerifiedIdentity: settings.requireVerifiedIdentity,
        requireAudit: settings.requireAudit,
      });
    },

    getHistory() {
      return Object.freeze([...history]);
    },

    async close() {
      if (closed) {
        return false;
      }

      await sequence;
      closed = true;
      history.length = 0;

      // Nuk mbyllim motorët e jashtëm.
      return true;
    },
  });
}
