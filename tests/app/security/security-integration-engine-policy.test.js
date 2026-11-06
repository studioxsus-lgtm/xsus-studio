
import { describe, it, expect } from "vitest";

import {
  createSecurityIntegrationEngine,
} from "../../../apps/app/security/integration/security-integration-engine.js";

import {
  decodeSecurityResource,
} from "../../../apps/app/security/integration/adapters/resource-adapter.js";

const createDependencies = ({
  authorizationResult = {
    allowed: true,
    reason: "POLICY_ALLOWED",
  },
  onAuthorize = null,
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

        if (onAuthorize) {
          return onAuthorize(request);
        }

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
    source: "policy-integration-test",
  },
  ...overrides,
});

describe("Security Integration Engine — Policy Integration", () => {
  it("përcjell kërkesën e autorizimit te Authorization Manager", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    const result = await engine.authorize(
      createAuthorizeRequest()
    );

    expect(result).toBeDefined();
    expect(calls.authorize).toHaveLength(1);

    await engine.close();
  });

  it("përcjell burimin e serializuar në formatin e Resource Adapter", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createAuthorizeRequest());

    expect(calls.authorize).toHaveLength(1);

    const encodedResource = calls.authorize[0].resource;

    expect(typeof encodedResource).toBe("string");

    expect(
      encodedResource.startsWith("xsus-resource:v1:")
    ).toBe(true);

    expect(
      decodeSecurityResource(encodedResource)
    ).toEqual({
      id: "document-1",
      type: "file",
    });

    await engine.close();
  });

  it("përcjell operacionin e kërkuar pa ndryshime", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(
      createAuthorizeRequest({
        operation: "delete",
      })
    );

    expect(calls.authorize).toHaveLength(1);
    expect(calls.authorize[0].operation).toBe("delete");

    await engine.close();
  });

  it("përcjell kontekstin e kërkesës te Authorization Manager", async () => {
    const { dependencies, calls } = createDependencies();

    const context = {
      source: "policy-integration-test",
      environment: "test",
    };

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(
      createAuthorizeRequest({
        context,
      })
    );

    expect(calls.authorize).toHaveLength(1);
    expect(calls.authorize[0].context).toEqual(context);

    await engine.close();
  });

  it("përdor identitetin e marrë nga sesioni i verifikuar", async () => {
    const { dependencies, calls } = createDependencies();

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(
      createAuthorizeRequest({
        identity: {
          id: "attacker",
          verified: true,
          roles: ["admin"],
          permissions: ["delete"],
        },
      })
    );

    expect(calls.authorize).toHaveLength(1);

    expect(
      calls.authorize[0].identity.id
    ).toBe("user-1");

    expect(
      calls.authorize[0].identity.id
    ).not.toBe("attacker");

    await engine.close();
  });

  it("ruan vendimin Allow të Authorization Manager", async () => {
    const { dependencies } = createDependencies({
      authorizationResult: {
        allowed: true,
        reason: "POLICY_ALLOWED",
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    const result = await engine.authorize(
      createAuthorizeRequest()
    );

    expect(result.allowed).toBe(true);

    await engine.close();
  });

  it("ruan vendimin Deny të Authorization Manager", async () => {
    const { dependencies } = createDependencies({
      authorizationResult: {
        allowed: false,
        reason: "POLICY_DENIED",
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    const result = await engine.authorize(
      createAuthorizeRequest()
    );

    expect(result.allowed).toBe(false);

    await engine.close();
  });

  it("nuk e konsideron mungesën e vendimit si leje", async () => {
    const { dependencies } = createDependencies({
      authorizationResult: {},
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    const result = await engine.authorize(
      createAuthorizeRequest()
    );

    expect(result.allowed).toBe(false);

    await engine.close();
  });
});
