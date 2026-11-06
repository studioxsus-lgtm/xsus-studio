
import { describe, it, expect } from "vitest";

import {
  createSecurityIntegrationEngine,
} from "../../../apps/app/security/integration/security-integration-engine.js";

const createDependencies = ({
  authorizationFailure = false,
  authorizationDelay = 0,
} = {}) => {
  const calls = {
    verify: 0,
    authorize: 0,
    audit: 0,
    providerClose: 0,
    activeAuthorizations: 0,
    maxActiveAuthorizations: 0,
  };

  const dependencies = {
    authenticationManager: {
      verify: async () => {
        calls.verify += 1;

        return {
          success: true,
          authenticated: true,
          user: {
            id: "user-1",
            verified: true,
          },
        };
      },

      close: async () => {
        calls.providerClose += 1;
        return true;
      },
    },

    authorizationManager: {
      authorize: async () => {
        calls.authorize += 1;
        calls.activeAuthorizations += 1;

        calls.maxActiveAuthorizations = Math.max(
          calls.maxActiveAuthorizations,
          calls.activeAuthorizations
        );

        try {
          if (authorizationDelay > 0) {
            await new Promise((resolve) => {
              setTimeout(resolve, authorizationDelay);
            });
          }

          if (authorizationFailure) {
            throw new Error("Authorization provider unavailable.");
          }

          return {
            allowed: true,
            reason: "POLICY_ALLOWED",
          };
        } finally {
          calls.activeAuthorizations -= 1;
        }
      },

      checkPermission: async () => ({
        allowed: true,
      }),

      checkRole: async () => ({
        allowed: true,
      }),

      close: async () => {
        calls.providerClose += 1;
        return true;
      },
    },

    rbacEngine: {
      getUserRoles: async () => ({
        data: [],
      }),

      getRole: async () => ({
        data: null,
      }),

      close: async () => {
        calls.providerClose += 1;
        return true;
      },
    },

    permissionEngine: {
      getSubjectPermissions: async () => [],

      close: async () => {
        calls.providerClose += 1;
        return true;
      },
    },

    auditEngine: {
      logEvent: async () => {
        calls.audit += 1;

        return {
          id: `audit-${calls.audit}`,
        };
      },

      close: async () => {
        calls.providerClose += 1;
        return true;
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
    source: "lifecycle-test",
  },
  ...overrides,
});

describe("Security Integration Engine — Lifecycle & Error Handling", () => {
  it("mbyllet me sukses", async () => {
    const { dependencies } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    await expect(engine.close()).resolves.toBe(true);
  });

  it("refuzon kërkesat pas mbylljes", async () => {
    const { dependencies } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.close();

    await expect(
      engine.authorize(createAuthorizeRequest())
    ).rejects.toMatchObject({
      code: "INTEGRATION_CLOSED",
    });
  });

  it("nuk i mbyll provider-at e jashtëm kur mbyllet Integration Engine", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.close();

    expect(calls.providerClose).toBe(0);
  });

  it("trajton gabimin e Authorization Manager si PROVIDER_ERROR", async () => {
    const { dependencies } = createDependencies({
      authorizationFailure: true,
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      await expect(
        engine.authorize(createAuthorizeRequest())
      ).rejects.toMatchObject({
        code: "PROVIDER_ERROR",
      });
    } finally {
      await engine.close();
    }
  });

  it("ekzekuton operacionet në mënyrë të serializuar", async () => {
    const { dependencies, calls } = createDependencies({
      authorizationDelay: 10,
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    try {
      const results = await Promise.all([
        engine.authorize(
          createAuthorizeRequest({
            resource: {
              id: "document-1",
              type: "file",
            },
          })
        ),

        engine.authorize(
          createAuthorizeRequest({
            resource: {
              id: "document-2",
              type: "file",
            },
          })
        ),

        engine.authorize(
          createAuthorizeRequest({
            resource: {
              id: "document-3",
              type: "file",
            },
          })
        ),
      ]);

      expect(results).toHaveLength(3);

      for (const result of results) {
        expect(result.allowed).toBe(true);
      }

      expect(calls.authorize).toBe(3);
      expect(calls.maxActiveAuthorizations).toBe(1);
    } finally {
      await engine.close();
    }
  });
});
