
import { describe, it, expect, vi } from "vitest";

import {
  createSecurityIntegrationEngine,
} from "../../../apps/app/security/integration/security-integration-engine.js";

const createDependencies = ({
  directRoles = [],
  inheritedRoles = {},
  permissions = {},
  permissionEngine,
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

  permissionEngine: permissionEngine || {
    getSubjectPermissions: vi.fn(async (subject) => {
      const key = `${subject.type}:${subject.id}`;
      return permissions[key] || [];
    }),
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

describe("Security Integration Engine — Permission Aggregation", () => {
  it("mbledh lejet direkte të përdoruesit", async () => {
    const dependencies = createDependencies({
      permissions: {
        "user:user-1": [
          {
            id: "permission-read",
            resource: "file",
            action: "read",
          },
        ],
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    expect(
      dependencies.permissionEngine.getSubjectPermissions
    ).toHaveBeenCalledWith({
      id: "user-1",
      type: "user",
    });

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.permissions).toContain("permission-read");

    await engine.close();
  });

  it("mbledh lejet e roleve direkte", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "editor",
          name: "Editor",
          inherits: [],
          permissions: [],
        },
      ],

      permissions: {
        "role:editor": [
          {
            id: "permission-edit",
            resource: "file",
            action: "write",
          },
        ],
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    expect(
      dependencies.permissionEngine.getSubjectPermissions
    ).toHaveBeenCalledWith({
      id: "editor",
      type: "role",
    });

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.permissions).toContain("permission-edit");

    await engine.close();
  });

  it("mbledh lejet e roleve të trashëguara", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "admin",
          name: "Admin",
          inherits: ["editor"],
          permissions: [],
        },
      ],

      inheritedRoles: {
        editor: {
          id: "editor",
          name: "Editor",
          inherits: [],
          permissions: [],
        },
      },

      permissions: {
        "role:admin": [
          {
            id: "permission-delete",
            resource: "file",
            action: "delete",
          },
        ],

        "role:editor": [
          {
            id: "permission-read",
            resource: "file",
            action: "read",
          },
        ],
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.permissions).toEqual(
      expect.arrayContaining([
        "permission-delete",
        "permission-read",
      ])
    );

    await engine.close();
  });

  it("eliminon lejet e përsëritura sipas ID-së", async () => {
    const sharedPermission = {
      id: "permission-read",
      resource: "file",
      action: "read",
    };

    const dependencies = createDependencies({
      directRoles: [
        {
          id: "editor",
          name: "Editor",
          inherits: [],
          permissions: [],
        },
      ],

      permissions: {
        "user:user-1": [sharedPermission],
        "role:editor": [sharedPermission],
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.permissions).toEqual(["permission-read"]);

    await engine.close();
  });

  it("nuk merr leje nga fusha role.permissions", async () => {
    const dependencies = createDependencies({
      directRoles: [
        {
          id: "admin",
          name: "Admin",
          inherits: [],
          permissions: ["fake-permission"],
        },
      ],
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.permissions).toEqual([]);

    await engine.close();
  });

  it("refuzon përgjigjen e pavlefshme nga Permission Engine", async () => {
    const dependencies = createDependencies({
      permissionEngine: {
        getSubjectPermissions: vi.fn(async () => null),
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await expect(
      engine.authorize(createRequest())
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
    });

    expect(
      dependencies.authorizationManager.authorize
    ).not.toHaveBeenCalled();

    await engine.close();
  });

  it("nuk dublikon lejet kur dy role trashëgojnë të njëjtin rol", async () => {
    const sharedPermission = {
      id: "permission-read",
      resource: "file",
      action: "read",
    };

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

      permissions: {
        "role:admin": [],
        "role:manager": [sharedPermission],
        "role:editor": [sharedPermission],
      },
    });

    const engine = createSecurityIntegrationEngine(dependencies);

    await engine.authorize(createRequest());

    const identity =
      dependencies.authorizationManager.authorize.mock.calls[0][0]
        .identity;

    expect(identity.permissions).toEqual(["permission-read"]);

    await engine.close();
  });
});
