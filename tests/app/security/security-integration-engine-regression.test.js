
import { describe, it, expect } from "vitest";

import {
  createSecurityIntegrationEngine,
} from "../../../apps/app/security/integration/security-integration-engine.js";

const createDependencies = ({
  authorizationResult = {
    allowed: true,
    reason: "POLICY_ALLOWED",
  },
  authenticationValid = true,
  auditFailure = false,
} = {}) => {
  const calls = {
    authentication: [],
    userRoles: [],
    inheritedRoles: [],
    userPermissions: [],
    rolePermissions: [],
    authorization: [],
    audit: [],
  };

  const role = {
    id: "role-editor",
    name: "Editor",
    description: "Document editor",
    permissions: [],
    inherits: [],
  };

  const userPermission = {
    id: "permission-user-read",
    resource: "file",
    action: "read",
  };

  const rolePermission = {
    id: "permission-role-update",
    resource: "file",
    action: "update",
  };

  const dependencies = {
    authenticationManager: {
      verify: async (payload = {}) => {
        calls.authentication.push(payload);

        if (!authenticationValid) {
          return {
            success: false,
            authenticated: false,
            user: null,
          };
        }

        return {
          success: true,
          authenticated: true,
          user: {
            id: "user-1",
            verified: true,
          },
        };
      },
    },

    rbacEngine: {
      getUserRoles: async (userId) => {
        calls.userRoles.push(userId);

        return {
          data: [role],
        };
      },

      getRole: async (roleId) => {
        calls.inheritedRoles.push(roleId);

        if (roleId === role.id) {
          return {
            data: role,
          };
        }

        return {
          data: null,
        };
      },
    },

    permissionEngine: {
      getSubjectPermissions: async (subject) => {
        if (subject?.type === "user") {
          calls.userPermissions.push(subject);

          return [userPermission];
        }

        if (subject?.type === "role") {
          calls.rolePermissions.push(subject);

          return [rolePermission];
        }

        return [];
      },
    },

    authorizationManager: {
      authorize: async (request) => {
        calls.authorization.push(request);

        return authorizationResult;
      },

      checkPermission: async () => ({
        allowed: true,
      }),

      checkRole: async () => ({
        allowed: true,
      }),
    },

    auditEngine: {
      logEvent: async (event) => {
        calls.audit.push(event);

        if (auditFailure) {
          throw new Error("Audit storage unavailable.");
        }

        return {
          id: `audit-${calls.audit.length}`,
        };
      },
    },
  };

  return {
    dependencies,
    calls,
  };
};

const createAuthorizeRequest = (overrides = {}) => ({
  action: "authorize",
  session: "session-1",
  resource: {
    id: "document-1",
    type: "file",
  },
  operation: "read",
  context: {
    source: "regression-test",
  },
  ...overrides,
});

describe("Security Integration Engine — Regression", () => {
  it("kalon kërkesën përmes Authentication, RBAC, Permissions, Authorization dhe Audit", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      const result = await engine.authorize(
        createAuthorizeRequest()
      );

      expect(result.allowed).toBe(true);

      expect(calls.authentication).toHaveLength(1);
      expect(calls.userRoles).toHaveLength(1);
      expect(calls.userPermissions).toHaveLength(1);
      expect(calls.rolePermissions).toHaveLength(1);
      expect(calls.authorization).toHaveLength(1);
      expect(calls.audit.length).toBeGreaterThan(0);
    } finally {
      await engine.close();
    }
  });

  it("përdor identitetin e verifikuar dhe jo identitetin e klientit", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      await engine.authorize(
        createAuthorizeRequest({
          identity: {
            id: "attacker",
            verified: true,
            roles: ["admin"],
            permissions: ["*"],
          },
        })
      );

      expect(calls.authorization).toHaveLength(1);

      const authorizationRequest = calls.authorization[0];

      expect(authorizationRequest.identity.id).toBe("user-1");
      expect(authorizationRequest.identity.id).not.toBe("attacker");
      expect(authorizationRequest.identity.verified).toBe(true);
    } finally {
      await engine.close();
    }
  });

  it("ndalon rrjedhën kur identiteti nuk verifikohet", async () => {
    const { dependencies, calls } = createDependencies({
      authenticationValid: false,
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      await expect(
        engine.authorize(createAuthorizeRequest())
      ).rejects.toMatchObject({
        code: "IDENTITY_NOT_VERIFIED",
      });

      expect(calls.authorization).toHaveLength(0);
      expect(calls.audit).toHaveLength(0);
    } finally {
      await engine.close();
    }
  });

  it("ruan vendimin Deny të Authorization Manager", async () => {
    const { dependencies, calls } = createDependencies({
      authorizationResult: {
        allowed: false,
        reason: "POLICY_DENIED",
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      const result = await engine.authorize(
        createAuthorizeRequest()
      );

      expect(result.allowed).toBe(false);
      expect(calls.authorization).toHaveLength(1);
      expect(calls.audit.length).toBeGreaterThan(0);
    } finally {
      await engine.close();
    }
  });

  it("refuzon kërkesën kur auditimi dështon", async () => {
    const { dependencies, calls } = createDependencies({
      authorizationResult: {
        allowed: true,
        reason: "POLICY_ALLOWED",
      },
      auditFailure: true,
    });

    const engine = createSecurityIntegrationEngine(dependencies, {
      requireAudit: true,
    });

    try {
      await expect(
        engine.authorize(createAuthorizeRequest())
      ).rejects.toMatchObject({
        code: "AUDIT_UNAVAILABLE",
      });

      expect(calls.authorization).toHaveLength(1);
      expect(calls.audit.length).toBeGreaterThan(0);
    } finally {
      await engine.close();
    }
  });
});
