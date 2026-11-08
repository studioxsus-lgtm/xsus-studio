
/**
 * @vitest-environment jsdom
 */

/**
 * XSUS APP — HYPER NEXUS
 * Browser History Integration Tests
 * Version: 1.0.1
 * Phase: 1.8.23.1
 *
 * Verifies:
 * - Canonical browser URLs
 * - Frontier route identity
 * - History state preservation
 * - Simulated Back / Forward restoration
 * - Navigation notification compatibility
 * - Controller lifecycle
 *
 * No Core connections.
 */

import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach
} from "vitest";

import {
  createNavigationController
} from "../../app-ui/shell/navigation.js";

describe(
  "Hyper Nexus — Browser History Integration",
  () => {
    let controller;
    let onNavigate;

    beforeEach(() => {
      controller = undefined;

      window.history.replaceState(
        null,
        "",
        "#overview"
      );

      onNavigate = vi.fn();

      controller = createNavigationController({
        windowRef: window,
        onNavigate
      });
    });

    afterEach(() => {
      controller?.destroy();

      vi.restoreAllMocks();

      window.history.replaceState(
        null,
        "",
        "#overview"
      );

      controller = undefined;
    });

    test("initializes browser navigation", () => {
      controller.initialize();

      expect(controller.isInitialized()).toBe(true);

      expect(controller.getCurrentModule()).toBe(
        "overview"
      );

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    test("stores canonical module in URL", () => {
      controller.initialize();

      controller.navigate("architect");

      expect(window.location.hash).toBe(
        "#command-center"
      );
    });

    test("preserves Frontier route in history.state", () => {
      controller.initialize();

      controller.navigate("architect");

      expect(window.history.state.module).toBe(
        "command-center"
      );

      expect(
        window.history.state.frontierRoute
      ).toBe("architect");
    });

    test("preserves engines identity", () => {
      controller.initialize();

      controller.navigate("engines");

      expect(window.location.hash).toBe(
        "#system-control"
      );

      expect(
        window.history.state.frontierRoute
      ).toBe("engines");
    });

    test("preserves monitoring identity", () => {
      controller.initialize();

      controller.navigate("monitoring");

      expect(window.location.hash).toBe(
        "#system-control"
      );

      expect(
        window.history.state.frontierRoute
      ).toBe("monitoring");
    });

    test("distinguishes engines and monitoring", () => {
      controller.initialize();

      controller.navigate("engines");
      controller.navigate("monitoring");

      expect(controller.getCurrentModule()).toBe(
        "system-control"
      );

      expect(
        controller.getCurrentFrontierRoute()
      ).toBe("monitoring");

      expect(onNavigate).toHaveBeenCalledTimes(3);
    });

    test("does not duplicate canonical notification", () => {
      controller.navigate("architect");

      controller.navigate("command-center");

      expect(onNavigate).toHaveBeenCalledTimes(1);

      expect(controller.getCurrentModule()).toBe(
        "command-center"
      );
    });

    test("does not notify twice for unchanged route", () => {
      controller.navigate("monitoring");

      controller.navigate("monitoring");

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    test("supports forceNotify", () => {
      controller.navigate("architect");

      controller.navigate("architect", {
        forceNotify: true
      });

      expect(onNavigate).toHaveBeenCalledTimes(2);
    });

    test("preserves unrelated history metadata", () => {
      window.history.replaceState(
        {
          application: "xsus-app",
          session: "test-session"
        },
        "",
        "#overview"
      );

      controller.initialize();

      controller.navigate("architect");

      expect(window.history.state.application).toBe(
        "xsus-app"
      );

      expect(window.history.state.session).toBe(
        "test-session"
      );
    });

    test("supports replaceHistory", () => {
      controller.initialize();

      const replaceSpy = vi.spyOn(
        window.history,
        "replaceState"
      );

      controller.navigate("architect", {
        replaceHistory: true
      });

      expect(replaceSpy).toHaveBeenCalled();

      expect(window.location.hash).toBe(
        "#command-center"
      );
    });

    test("supports navigation without history update", () => {
      controller.initialize();

      controller.navigate("architect", {
        updateHistory: false
      });

      expect(controller.getCurrentModule()).toBe(
        "command-center"
      );

      expect(window.location.hash).toBe(
        "#overview"
      );
    });

    test("restores Frontier route from history state", () => {
      controller.initialize();

      window.history.replaceState(
        {
          module: "system-control",
          frontierRoute: "monitoring"
        },
        "",
        "#system-control"
      );

      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: window.history.state
        })
      );

      expect(controller.getCurrentModule()).toBe(
        "system-control"
      );

      expect(
        controller.getCurrentFrontierRoute()
      ).toBe("monitoring");
    });

    test("restores engines after monitoring", () => {
      controller.initialize();

      controller.navigate("monitoring");

      window.history.replaceState(
        {
          module: "system-control",
          frontierRoute: "engines"
        },
        "",
        "#system-control"
      );

      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: window.history.state
        })
      );

      expect(
        controller.getCurrentFrontierRoute()
      ).toBe("engines");
    });

    test("rejects mismatched Frontier history identity", () => {
      controller.initialize();

      window.history.replaceState(
        {
          module: "command-center",
          frontierRoute: "monitoring"
        },
        "",
        "#command-center"
      );

      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: window.history.state
        })
      );

      expect(controller.getCurrentModule()).toBe(
        "command-center"
      );

      expect(
        controller.getCurrentFrontierRoute()
      ).toBeNull();
    });

    test("canonicalizes legacy URL on initialization", () => {
      window.history.replaceState(
        null,
        "",
        "#architect"
      );

      controller.initialize();

      expect(window.location.hash).toBe(
        "#command-center"
      );

      expect(
        window.history.state.frontierRoute
      ).toBe("architect");
    });

    test("canonicalizes legacy hashchange", () => {
      controller.initialize();

      window.history.replaceState(
        null,
        "",
        "#workspace"
      );

      window.dispatchEvent(
        new Event("hashchange")
      );

      expect(window.location.hash).toBe(
        "#living-workspace"
      );

      expect(
        controller.getCurrentFrontierRoute()
      ).toBe("workspace");
    });

    test("falls back to overview for unknown hash", () => {
      controller.initialize();

      window.history.replaceState(
        null,
        "",
        "#unknown-module"
      );

      window.dispatchEvent(
        new Event("hashchange")
      );

      expect(controller.getCurrentModule()).toBe(
        "overview"
      );

      expect(window.location.hash).toBe(
        "#overview"
      );
    });

    test("keeps a valid canonical route without Frontier identity", () => {
      controller.initialize();

      window.history.replaceState(
        {
          module: "multi-agent",
          frontierRoute: null
        },
        "",
        "#multi-agent"
      );

      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: window.history.state
        })
      );

      expect(controller.getCurrentModule()).toBe(
        "multi-agent"
      );

      expect(
        controller.getCurrentFrontierRoute()
      ).toBeNull();
    });

    test("does not initialize twice", () => {
      controller.initialize();
      controller.initialize();

      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    test("removes navigation listeners on destroy", () => {
      controller.initialize();

      controller.destroy();

      expect(controller.isInitialized()).toBe(false);

      const callsBefore =
        onNavigate.mock.calls.length;

      window.history.replaceState(
        null,
        "",
        "#architect"
      );

      window.dispatchEvent(
        new Event("hashchange")
      );

      expect(onNavigate).toHaveBeenCalledTimes(
        callsBefore
      );
    });

    test("supports repeated destroy calls", () => {
      controller.initialize();

      controller.destroy();
      controller.destroy();

      expect(controller.isInitialized()).toBe(false);
    });
  }
);
