
import { describe, it, expect } from "vitest";

import {
  createSecurityIntegrationEngine,
} from "../../../apps/app/security/integration/security-integration-engine.js";

const createDependencies = ({
  authorizationResult = {
    allowed: true,
    reason: "POLICY_ALLOWED",
  },
  auditFailure = false,
} = {}) => {
  const calls = {
    verify: [],
    authorize: [],
    audit: [],
  };

  const dependencies = {
    authenticationManager: {
      verify: async (payload = {}) => {
        calls.verify.push(payload);

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

    authorizationManager: {
      authorize: async (request) => {
        calls.authorize.push(request);

        return authorizationResult;
      },

      checkPermission: async () => ({
        allowed: true,
      }),

      checkRole: async () => ({
        allowed: true,
      }),
    },

    rbacEngine: {
      getUserRoles: async () => ({
        data: [],
      }),

      getRole: async () => ({
        data: null,
      }),
    },

    permissionEngine: {
      getSubjectPermissions: async () => [],
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
    source: "audit-integration-test",
  },
  ...overrides,
});

describe("Security Integration Engine — Audit Integration", () => {
  it("regjistron kërkesën e autorizuar në Audit Engine", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      const result = await engine.authorize(
        createAuthorizeRequest()
      );

      expect(result.allowed).toBe(true);
      expect(calls.audit.length).toBeGreaterThan(0);
    } finally {
      await engine.close();
    }
  });

  it("regjistron kërkesën e refuzuar në Audit Engine", async () => {
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
      expect(calls.audit.length).toBeGreaterThan(0);
    } finally {
      await engine.close();
    }
  });

  it("regjistron ngjarje auditimi me të dhëna objekti", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      await engine.authorize(createAuthorizeRequest());

      expect(calls.audit.length).toBeGreaterThan(0);

      for (const event of calls.audit) {
        expect(event).toBeDefined();
        expect(typeof event).toBe("object");
        expect(event).not.toBeNull();
      }
    } finally {
      await engine.close();
    }
  });

  it("refuzon kërkesën me AUDIT_UNAVAILABLE kur Audit Engine dështon dhe requireAudit është aktiv", async () => {
    const { dependencies } = createDependencies({
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
    } finally {
      await engine.close();
    }
  });

  it("regjistron refuzimin edhe kur politika e ndalon kërkesën", async () => {
    const { dependencies, calls } = createDependencies({
      authorizationResult: {
        allowed: false,
        reason: "POLICY_DENIED",
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      const result = await engine.authorize(
        createAuthorizeRequest({
          operation: "delete",
        })
      );

      expect(result.allowed).toBe(false);
      expect(calls.audit.length).toBeGreaterThan(0);
    } finally {
      await engine.close();
    }
  });
});
