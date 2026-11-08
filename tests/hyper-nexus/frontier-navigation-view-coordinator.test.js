
/**
 * XSUS APP — HYPER NEXUS
 * Frontier Navigation View Coordinator Tests
 * Version: 1.0.0
 * Phase: 1.8.25
 *
 * Tests:
 * - Coordinator validation
 * - Legacy Frontier routes
 * - Canonical navigation payloads
 * - Shared canonical module identities
 * - Duplicate activation prevention
 * - Reset and destruction lifecycle
 *
 * No DOM mutation.
 * No browser history.
 * No Core connections.
 */

import {
  describe,
  test,
  expect,
  vi
} from "vitest";

import {
  FRONTIER_NAVIGATION_VIEW_COORDINATOR_VERSION,
  createFrontierNavigationViewCoordinator
} from "../../app-ui/shell/frontier-navigation-view-coordinator.js";

function createMockViewAdapter() {
  const state = {
    destroyed: false,
    activeRoute: null
  };

  return {
    activate: vi.fn((route) => {
      if (state.destroyed) {
        return false;
      }

      state.activeRoute = route;
      return true;
    }),

    getStatus: vi.fn(() => ({
      destroyed: state.destroyed,
      activeRoute: state.activeRoute
    })),

    destroy() {
      state.destroyed = true;
    }
  };
}

describe(
  "Hyper Nexus — Frontier Navigation View Coordinator",
  () => {
    test("exports version 1.0.0", () => {
      expect(
        FRONTIER_NAVIGATION_VIEW_COORDINATOR_VERSION
      ).toBe("1.0.0");
    });

    test("requires a valid view adapter", () => {
      expect(() =>
        createFrontierNavigationViewCoordinator()
      ).toThrow(
        "A valid Frontier View Adapter is required."
      );
    });

    test("requires activate method", () => {
      expect(() =>
        createFrontierNavigationViewCoordinator({
          viewAdapter: {
            getStatus() {
              return {};
            }
          }
        })
      ).toThrow(TypeError);
    });

    test("requires getStatus method", () => {
      expect(() =>
        createFrontierNavigationViewCoordinator({
          viewAdapter: {
            activate() {
              return true;
            }
          }
        })
      ).toThrow(TypeError);
    });

    test("creates immutable coordinator API", () => {
      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: createMockViewAdapter()
        });

      expect(Object.isFrozen(coordinator)).toBe(true);
    });

    test("starts without an active view", () => {
      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: createMockViewAdapter()
        });

      expect(coordinator.getCurrent()).toEqual({
        moduleId: null,
        frontierRoute: null
      });

      expect(
        coordinator.getStatus().synchronizationCount
      ).toBe(0);
    });

    test("activates architect", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize("architect")
      ).toBe(true);

      expect(adapter.activate).toHaveBeenCalledWith(
        "architect"
      );

      expect(coordinator.getCurrent()).toEqual({
        moduleId: "command-center",
        frontierRoute: "architect"
      });
    });

    test("activates workspace", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize("#workspace")
      ).toBe(true);

      expect(adapter.activate).toHaveBeenCalledWith(
        "workspace"
      );
    });

    test("activates nexus", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize("nexus")
      ).toBe(true);

      expect(coordinator.getCurrent()).toEqual({
        moduleId: "integration-layer",
        frontierRoute: "nexus"
      });
    });

    test("activates engines", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize("engines")
      ).toBe(true);

      expect(coordinator.getCurrent()).toEqual({
        moduleId: "system-control",
        frontierRoute: "engines"
      });
    });

    test("distinguishes engines and monitoring", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      coordinator.synchronize("engines");
      coordinator.synchronize("monitoring");

      expect(adapter.activate).toHaveBeenCalledTimes(2);

      expect(adapter.activate).toHaveBeenNthCalledWith(
        1,
        "engines"
      );

      expect(adapter.activate).toHaveBeenNthCalledWith(
        2,
        "monitoring"
      );

      expect(coordinator.getCurrent()).toEqual({
        moduleId: "system-control",
        frontierRoute: "monitoring"
      });
    });

    test("accepts canonical navigation payload", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize({
          id: "system-control",
          frontierRoute: "monitoring"
        })
      ).toBe(true);

      expect(adapter.activate).toHaveBeenCalledWith(
        "monitoring"
      );
    });

    test("accepts moduleId navigation payload", () => {
      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: createMockViewAdapter()
        });

      expect(
        coordinator.synchronize({
          moduleId: "command-center",
          frontierRoute: "architect"
        })
      ).toBe(true);
    });

    test("rejects mismatched Frontier identity", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize({
          id: "command-center",
          frontierRoute: "monitoring"
        })
      ).toBe(false);

      expect(adapter.activate).not.toHaveBeenCalled();
    });

    test("does not activate canonical-only modules", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize("multi-agent")
      ).toBe(false);

      expect(adapter.activate).not.toHaveBeenCalled();
    });

    test("rejects unknown canonical modules", () => {
      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: createMockViewAdapter()
        });

      expect(
        coordinator.synchronize({
          id: "unknown-module",
          frontierRoute: "architect"
        })
      ).toBe(false);
    });

    test("rejects invalid navigation input", () => {
      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: createMockViewAdapter()
        });

      expect(coordinator.synchronize(null)).toBe(false);
      expect(coordinator.synchronize(42)).toBe(false);
      expect(coordinator.synchronize({})).toBe(false);
    });

    test("normalizes Frontier route payload", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize({
          id: "system-control",
          frontierRoute: " #MONITORING "
        })
      ).toBe(true);

      expect(adapter.activate).toHaveBeenCalledWith(
        "monitoring"
      );
    });

    test("prevents duplicate activation", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      coordinator.synchronize("architect");
      coordinator.synchronize("architect");

      expect(adapter.activate).toHaveBeenCalledTimes(1);

      expect(
        coordinator.getStatus().synchronizationCount
      ).toBe(1);
    });

    test("does not record failed activation", () => {
      const adapter = createMockViewAdapter();

      adapter.activate.mockReturnValue(false);

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      expect(
        coordinator.synchronize("architect")
      ).toBe(false);

      expect(
        coordinator.getStatus().synchronizationCount
      ).toBe(0);
    });

    test("does not activate destroyed adapter", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      adapter.destroy();

      expect(
        coordinator.synchronize("architect")
      ).toBe(false);

      expect(adapter.activate).not.toHaveBeenCalled();
    });

    test("resets coordinator tracking", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      coordinator.synchronize("architect");

      expect(coordinator.reset()).toBe(true);

      expect(coordinator.getCurrent()).toEqual({
        moduleId: null,
        frontierRoute: null
      });
    });

    test("allows synchronization after reset", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      coordinator.synchronize("architect");
      coordinator.reset();
      coordinator.synchronize("architect");

      expect(adapter.activate).toHaveBeenCalledTimes(2);
    });

    test("returns immutable status snapshot", () => {
      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: createMockViewAdapter()
        });

      expect(
        Object.isFrozen(coordinator.getStatus())
      ).toBe(true);

      expect(
        Object.isFrozen(coordinator.getCurrent())
      ).toBe(true);
    });

    test("destroys coordinator safely", () => {
      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: createMockViewAdapter()
        });

      coordinator.destroy();
      coordinator.destroy();

      expect(coordinator.getStatus().destroyed).toBe(
        true
      );

      expect(coordinator.synchronize("architect")).toBe(
        false
      );

      expect(coordinator.reset()).toBe(false);
    });

    test("does not destroy the adapter", () => {
      const adapter = createMockViewAdapter();

      const coordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: adapter
        });

      coordinator.destroy();

      expect(adapter.getStatus().destroyed).toBe(false);
    });
  }
);
