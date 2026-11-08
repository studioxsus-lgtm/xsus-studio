
/** @vitest-environment jsdom */

/**
 * XSUS APP — HYPER NEXUS
 * Shell–Frontier Integration Tests
 * Version: 1.0.0
 * Phase: 1.8.27
 *
 * Verifies:
 * - Optional Frontier initialization
 * - Original DOM preservation
 * - Navigation between Frontier views
 * - Shared canonical module identity
 * - Browser History restoration
 * - Placeholder handling
 * - Shell cleanup and compatibility
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
  initializeHyperNexusShell
} from "../../app-ui/shell/shell.js";

const FRONTIER_ROUTES = [
  "overview",
  "architect",
  "workspace",
  "nexus",
  "engines",
  "monitoring",
  "architecture"
];

function createTestDOM() {
  document.body.innerHTML = `
    <div id="xsus-app">
      <aside id="hyper-nexus-sidebar">
        <a href="#overview"
           data-module-link="overview">Overview</a>

        <a href="#architect"
           data-module-link="architect">Architect</a>

        <a href="#workspace"
           data-module-link="workspace">Workspace</a>

        <a href="#engines"
           data-module-link="engines">Engines</a>

        <a href="#monitoring"
           data-module-link="monitoring">Monitoring</a>

        <a href="#multi-agent"
           data-module-link="multi-agent">Multi Agent</a>
      </aside>

      <button
        id="hyper-nexus-menu-toggle"
        aria-expanded="false">
        Menu
      </button>

      <h1 id="hyper-nexus-page-title"></h1>

      <main
        id="hyper-nexus-module-container"
        tabindex="-1">

        <section data-module="overview">
          Canonical Overview
        </section>

        <div
          id="hyper-nexus-module-loading"
          hidden>
        </div>

        <div
          id="hyper-nexus-module-error"
          hidden>
        </div>
      </main>

      <div id="frontier-original-views">
        <section id="overview">Frontier Overview</section>

        <section id="architect">
          <form id="app-form">
            <input id="prompt" />
            <button type="submit">
              Generate
            </button>
          </form>
        </section>

        <section id="workspace">Frontier Workspace</section>
        <section id="nexus">Frontier Nexus</section>
        <section id="engines">Frontier Engines</section>
        <section id="monitoring">Frontier Monitoring</section>
        <section id="architecture">Frontier Architecture</section>
      </div>
    </div>
  `;
}

function getFrontierSection(route) {
  return document.getElementById(route);
}

function navigateThroughLink(route) {
  const link = document.querySelector(
    `[data-module-link="${route}"]`
  );

  if (!link) {
    throw new Error(
      `Missing navigation link: ${route}`
    );
  }

  link.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    })
  );
}

function dispatchHistoryState(
  moduleId,
  frontierRoute = null
) {
  window.history.replaceState(
    {
      module: moduleId,
      frontierRoute
    },
    "",
    `#${moduleId}`
  );

  window.dispatchEvent(
    new PopStateEvent("popstate", {
      state: window.history.state
    })
  );
}

describe(
  "Hyper Nexus — Shell Frontier Integration",
  () => {
    let shell;
    let originalSections;
    let originalForm;

    beforeEach(() => {
      window.history.replaceState(
        null,
        "",
        "#overview"
      );

      createTestDOM();

      originalSections = new Map(
        FRONTIER_ROUTES.map((route) => [
          route,
          getFrontierSection(route)
        ])
      );

      originalForm =
        document.getElementById("app-form");

      shell = null;
    });

    afterEach(() => {
      shell?.destroy();

      vi.restoreAllMocks();

      document.body.innerHTML = "";

      window.history.replaceState(
        null,
        "",
        "#overview"
      );
    });

    test("initializes with Frontier enabled", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      expect(shell).not.toBeNull();

      expect(
        shell.getCurrentModule()
      ).toBe("overview");
    });

    test("preserves original Frontier DOM elements", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      for (const route of FRONTIER_ROUTES) {
        expect(
          getFrontierSection(route)
        ).toBe(originalSections.get(route));
      }
    });

    test("preserves original architect form", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("architect");

      expect(
        document.getElementById("app-form")
      ).toBe(originalForm);

      expect(
        getFrontierSection("architect").hidden
      ).toBe(false);
    });

    test("preserves existing form event listeners", () => {
      const listener = vi.fn();

      originalForm.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();
          listener();
        }
      );

      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("architect");

      originalForm.dispatchEvent(
        new Event("submit", {
          bubbles: true,
          cancelable: true
        })
      );

      expect(listener).toHaveBeenCalledTimes(1);
    });

    test("activates architect through navigation", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("architect");

      expect(
        shell.getCurrentModule()
      ).toBe("command-center");

      expect(
        getFrontierSection("architect").hidden
      ).toBe(false);
    });

    test("activates workspace through navigation", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("workspace");

      expect(
        shell.getCurrentModule()
      ).toBe("living-workspace");

      expect(
        getFrontierSection("workspace").hidden
      ).toBe(false);
    });

    test("distinguishes engines and monitoring", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("engines");

      expect(
        getFrontierSection("engines").hidden
      ).toBe(false);

      navigateThroughLink("monitoring");

      expect(
        getFrontierSection("engines").hidden
      ).toBe(true);

      expect(
        getFrontierSection("monitoring").hidden
      ).toBe(false);

      expect(
        shell.getCurrentModule()
      ).toBe("system-control");
    });

    test("stores Frontier identity in history.state", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("monitoring");

      expect(window.history.state).toEqual(
        expect.objectContaining({
          module: "system-control",
          frontierRoute: "monitoring"
        })
      );
    });

    test("restores engines from browser history", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("monitoring");

      dispatchHistoryState(
        "system-control",
        "engines"
      );

      expect(
        getFrontierSection("engines").hidden
      ).toBe(false);

      expect(
        getFrontierSection("monitoring").hidden
      ).toBe(true);
    });

    test("restores architect from browser history", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("workspace");

      dispatchHistoryState(
        "command-center",
        "architect"
      );

      expect(
        shell.getCurrentModule()
      ).toBe("command-center");

      expect(
        getFrontierSection("architect").hidden
      ).toBe(false);
    });

    test("does not render placeholder for Frontier architect", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("architect");

      expect(
        document.getElementById(
          "hyper-nexus-unavailable-module"
        )
      ).toBeNull();
    });

    test("renders placeholder for canonical-only planned module", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("multi-agent");

      expect(
        document.getElementById(
          "hyper-nexus-unavailable-module"
        )
      ).not.toBeNull();
    });

    test("hides Frontier views for canonical-only module", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("architect");
      navigateThroughLink("multi-agent");

      for (const route of FRONTIER_ROUTES) {
        expect(
          getFrontierSection(route).hidden
        ).toBe(true);
      }
    });

    test("returns from canonical module to Frontier view", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("architect");
      navigateThroughLink("multi-agent");
      navigateThroughLink("workspace");

      expect(
        getFrontierSection("workspace").hidden
      ).toBe(false);

      expect(
        document.getElementById(
          "hyper-nexus-unavailable-module"
        )
      ).toBeNull();
    });

    test("restores original DOM identity on destroy", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("architect");

      shell.destroy();

      for (const route of FRONTIER_ROUTES) {
        expect(
          getFrontierSection(route)
        ).toBe(originalSections.get(route));
      }
    });

    test("restores original visibility on destroy", () => {
      const originalVisibility = new Map(
        FRONTIER_ROUTES.map((route) => [
          route,
          getFrontierSection(route).hidden
        ])
      );

      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      navigateThroughLink("monitoring");

      shell.destroy();

      for (const route of FRONTIER_ROUTES) {
        expect(
          getFrontierSection(route).hidden
        ).toBe(originalVisibility.get(route));
      }
    });

    test("does not react to navigation after destroy", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      shell.destroy();

      navigateThroughLink("architect");

      expect(
        shell.getCurrentModule()
      ).toBe("overview");
    });

    test("supports repeated destroy safely", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      expect(() => {
        shell.destroy();
        shell.destroy();
      }).not.toThrow();
    });

    test("supports Shell without Frontier", () => {
      shell = initializeHyperNexusShell(
        document
      );

      expect(shell).not.toBeNull();

      navigateThroughLink("architect");

      expect(
        document.getElementById(
          "hyper-nexus-unavailable-module"
        )
      ).not.toBeNull();
    });

    test("preserves existing Shell public API", () => {
      shell = initializeHyperNexusShell(
        document,
        {
          enableFrontier: true
        }
      );

      expect(typeof shell.destroy).toBe("function");
      expect(typeof shell.getCurrentModule).toBe("function");
      expect(typeof shell.registerModule).toBe("function");

      expect(Object.isFrozen(shell)).toBe(true);
    });
  }
);
