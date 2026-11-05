
import { describe, it, expect, vi } from "vitest";

import {
  createSecurityIntegrationEngine,
} from "../../../apps/app/security/integration/security-integration-engine.js";

const createDependencies = ({
  directRoles = [],
  inheritedRoles = {},
} = {}) => ({
  authenticationManager: {
    verify: vi.fn(async () => ({
      success: true,
      authenticated: true,
      user: { id: "user-1" },
    })),
  },

  authorizationManager: {
    authorize: vi.fn(async () => ({ allowed: true })),
    checkPermission: vi.fn(async () => ({ allowed: true })),
    checkRole: vi.fn(async () => ({ allowed: true })),
  },

  rbacEngine: {
    getUserRoles: vi.fn(async () => ({
      data: directRoles,
    })),

    getRole: vi.fn(async (id) => ({
      data: inheritedRoles[id] || null,
    })),
  },

  permissionEngine: {
    getSubjectPermissions: vi.fn(async () => []),
  },

  auditEngine: {
    logEvent: vi.fn(async () => ({ id: "audit-1" })),
  },
});

const createRequest = () => ({
  action: "authorize",
  resource: {
    id: "document-1",
    type: "file",
  },
  operation: "read",
  authentication: {},
});

describe("Security Integration Engine — RBAC", () => {
  it("merr rolet direkte të përdoruesit", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "editor",
          name: "Editor",
          inherits: [],
          permissions: [],
        },
      ],
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    expect(
      dependencies.rbacEngine.getUserRoles
    ).toHaveBeenCalledWith("user-1");

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.roles).toContain("editor");

    await engine.close();
  });

  it("zgjidh rolet e trashëguara në mënyrë rekursive", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "admin",
          name: "Admin",
          inherits: ["manager"],
          permissions: [],
        },
      ],

      inheritedRoles: {
        manager: {
          id: "manager",
          name: "Manager",
          inherits: ["editor"],
          permissions: [],
        },

        editor: {
          id: "editor",
          name: "Editor",
          inherits: [],
          permissions: [],
        },
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.roles).toEqual(
      expect.arrayContaining(["admin", "manager", "editor"])
    );

    expect(identity.roles).toHaveLength(3);

    await engine.close();
  });

  it("nuk përsërit rolet kur ekziston trashëgimi e përbashkët", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "admin",
          name: "Admin",
          inherits: ["manager", "editor"],
          permissions: [],
        },
      ],

      inheritedRoles: {
        manager: {
          id: "manager",
          name: "Manager",
          inherits: ["editor"],
          permissions: [],
        },

        editor: {
          id: "editor",
          name: "Editor",
          inherits: [],
          permissions: [],
        },
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.roles).toHaveLength(3);
    expect(new Set(identity.roles).size).toBe(3);

    await engine.close();
  });

  it("ndalon ciklin e trashëgimisë pa përsëritur rolet", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "admin",
          name: "Admin",
          inherits: ["manager"],
          permissions: [],
        },
      ],

      inheritedRoles: {
        manager: {
          id: "manager",
          name: "Manager",
          inherits: ["admin"],
          permissions: [],
        },
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await expect(
      engine.authorize(createRequest())
    ).resolves.toMatchObject({
      allowed: true,
    });

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.roles).toEqual(["admin", "manager"]);
    expect(identity.roles).toHaveLength(2);

    await engine.close();
  });

  it("nuk kërkon role që nuk janë të trashëguara", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "viewer",
          name: "Viewer",
          inherits: [],
          permissions: [],
        },
      ],
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    expect(
      dependencies.rbacEngine.getRole
    ).not.toHaveBeenCalled();

    await engine.close();
  });

  it("nuk përdor role.permissions si burim autoritativ të lejeve", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "admin",
          name: "Admin",
          inherits: [],
          permissions: ["dangerous-delete"],
        },
      ],
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    expect(
      dependencies.permissionEngine.getSubjectPermissions
    ).toHaveBeenCalledWith({
      id: "admin",
      type: "role",
    });

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.permissions).toEqual([]);

    await engine.close();
  });
});
