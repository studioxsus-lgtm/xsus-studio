
/**
 * XSUS APP — HYPER NEXUS
 * Navigation History & Legacy Integration Tests
 * Version: 1.0.0
 *
 * @vitest-environment jsdom
 *
 * Verifies:
 * - Legacy Frontier route resolution
 * - URL normalization
 * - Browser history synchronization
 * - popstate and hashchange handling
 * - Duplicate notification prevention
 * - Controller lifecycle
 *
 * No Core systems or application services are used.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi
} from "vitest";

import {
  createNavigationController,
  getNavigationFromLocation,
  resolveNavigationModule,
  DEFAULT_NAVIGATION_MODULE
} from "../../app-ui/shell/navigation.js";

describe(
  "Hyper Nexus — Navigation Legacy Integration",
  () => {
    let controller;
    let onNavigate;

    function setHash(hash) {
      window.history.replaceState(null, "", hash);
    }

    function createController() {
      controller = createNavigationController({
        windowRef: window,
        onNavigate
      });

      return controller;
    }

    beforeEach(() => {
      setHash("#overview");
      onNavigate = vi.fn();
      controller = null;
    });

    afterEach(() => {
      controller?.destroy();
      setHash("#overview");
      vi.restoreAllMocks();
    });

    test(
      "përkthen legacy architect në command-center",
      () => {
        expect(
          resolveNavigationModule("#architect")
        ).toBe("command-center");
      }
    );

    test(
      "përkthen legacy workspace në living-workspace",
      () => {
        expect(
          resolveNavigationModule("#workspace")
        ).toBe("living-workspace");
      }
    );

    test(
      "përkthen legacy nexus në integration-layer",
      () => {
        expect(
          resolveNavigationModule("#nexus")
        ).toBe("integration-layer");
      }
    );

    test(
      "përkthen monitoring në system-control",
      () => {
        expect(
          resolveNavigationModule("#monitoring")
        ).toBe("system-control");
      }
    );

    test(
      "ruan rrugët moderne të Hyper Nexus",
      () => {
        expect(
          resolveNavigationModule("#multi-agent")
        ).toBe("multi-agent");

        expect(
          resolveNavigationModule("#workflow-studio")
        ).toBe("workflow-studio");
      }
    );

    test(
      "rrugët e panjohura kthehen te Overview",
      () => {
        expect(
          resolveNavigationModule("#unknown-route")
        ).toBe(DEFAULT_NAVIGATION_MODULE);
      }
    );

    test(
      "lexon rrugën legacy nga location",
      () => {
        setHash("#architect");

        expect(
          getNavigationFromLocation(window.location)
        ).toBe("command-center");
      }
    );

    test(
      "initialize normalizon hash legacy",
      () => {
        setHash("#architect");

        createController();

        expect(controller.initialize())
          .toBe("command-center");

        expect(window.location.hash)
          .toBe("#command-center");

        expect(controller.getCurrentModule())
          .toBe("command-center");
      }
    );

    test(
      "initialize njofton Shell vetëm një herë",
      () => {
        setHash("#workspace");

        createController();

        controller.initialize();
        controller.initialize();

        expect(onNavigate).toHaveBeenCalledTimes(1);

        expect(onNavigate.mock.calls[0][0].id)
          .toBe("living-workspace");
      }
    );

    test(
      "navigate pranon rrugë legacy",
      () => {
        createController();
        controller.initialize();

        const result = controller.navigate("#nexus");

        expect(result).toBe("integration-layer");

        expect(window.location.hash)
          .toBe("#integration-layer");

        expect(controller.getCurrentModule())
          .toBe("integration-layer");
      }
    );

    test(
      "navigate nuk njofton dy herë për të njëjtin modul",
      () => {
        createController();
        controller.initialize();

        onNavigate.mockClear();

        controller.navigate("#architect");
        controller.navigate("#command-center");

        expect(onNavigate).toHaveBeenCalledTimes(1);
      }
    );

    test(
      "forceNotify lejon njoftimin e përsëritur",
      () => {
        createController();
        controller.initialize();

        onNavigate.mockClear();

        controller.navigate("overview", {
          forceNotify: true
        });

        expect(onNavigate).toHaveBeenCalledTimes(1);
      }
    );

    test(
      "hashchange normalizon rrugën legacy",
      () => {
        createController();
        controller.initialize();

        onNavigate.mockClear();

        setHash("#monitoring");

        window.dispatchEvent(
          new Event("hashchange")
        );

        expect(controller.getCurrentModule())
          .toBe("system-control");

        expect(window.location.hash)
          .toBe("#system-control");

        expect(onNavigate).toHaveBeenCalledTimes(1);
      }
    );

    test(
      "popstate sinkronizon navigimin legacy",
      () => {
        createController();
        controller.initialize();

        controller.navigate("multi-agent");

        onNavigate.mockClear();

        setHash("#workspace");

        window.dispatchEvent(
          new PopStateEvent("popstate")
        );

        expect(controller.getCurrentModule())
          .toBe("living-workspace");

        expect(window.location.hash)
          .toBe("#living-workspace");

        expect(onNavigate).toHaveBeenCalledTimes(1);
      }
    );

    test(
      "popstate dhe hashchange nuk krijojnë njoftime të dyfishta",
      () => {
        createController();
        controller.initialize();

        onNavigate.mockClear();

        setHash("#architect");

        window.dispatchEvent(
          new PopStateEvent("popstate")
        );

        window.dispatchEvent(
          new Event("hashchange")
        );

        expect(controller.getCurrentModule())
          .toBe("command-center");

        expect(onNavigate).toHaveBeenCalledTimes(1);
      }
    );

    test(
      "hash i panjohur normalizohet në Overview",
      () => {
        createController();
        controller.initialize();

        setHash("#does-not-exist");

        window.dispatchEvent(
          new Event("hashchange")
        );

        expect(window.location.hash)
          .toBe("#overview");

        expect(controller.getCurrentModule())
          .toBe("overview");
      }
    );

    test(
      "metadata vjen nga Module Registry",
      () => {
        createController();
        controller.initialize();

        onNavigate.mockClear();

        controller.navigate("#architect");

        expect(onNavigate).toHaveBeenCalledTimes(1);

        const metadata = onNavigate.mock.calls[0][0];

        expect(metadata.id).toBe("command-center");
        expect(metadata.available).toBe(false);
        expect(metadata.status).toBe("planned");
      }
    );

    test(
      "destroy çaktivizon sinkronizimin me browser history",
      () => {
        createController();
        controller.initialize();

        controller.destroy();

        onNavigate.mockClear();

        setHash("#architect");

        window.dispatchEvent(
          new Event("hashchange")
        );

        expect(controller.getCurrentModule())
          .toBe("overview");

        expect(onNavigate).not.toHaveBeenCalled();
      }
    );

    test(
      "destroy mund të thirret disa herë",
      () => {
        createController();
        controller.initialize();

        expect(() => {
          controller.destroy();
          controller.destroy();
        }).not.toThrow();

        expect(controller.isInitialized()).toBe(false);
      }
    );

    test(
      "navigimi ruan pavarësinë nga Core systems",
      () => {
        createController();
        controller.initialize();

        const result = controller.navigate(
          "#architecture"
        );

        expect(result).toBe("architecture");

        expect(controller.getCurrentModule())
          .toBe("architecture");

        expect(onNavigate.mock.lastCall[0].id)
          .toBe("architecture");
      }
    );
  }
);
