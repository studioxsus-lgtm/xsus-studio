
/**
 * XSUS APP — HYPER NEXUS
 * Frontier View Adapter Tests
 * Version: 1.0.0
 * Phase: 1.8.18
 *
 * @vitest-environment jsdom
 *
 * Tests:
 * - Initialization
 * - Route validation
 * - View activation
 * - DOM identity
 * - Form state and event listeners
 * - Engines / Monitoring isolation
 * - Visibility restoration
 * - Lifecycle and destruction
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
  createFrontierViewAdapter,
  FRONTIER_VIEW_ADAPTER_VERSION
} from "../../app-ui/shell/frontier-view-adapter.js";

import {
  FRONTIER_SECTION_IDS
} from "../../app-ui/shell/frontier-module-preservation.js";

function createFixture() {
  document.body.innerHTML = `
    <div id="xsus-app">
      <main id="frontier-content">
        <section id="overview">
          <h2>Overview</h2>
        </section>

        <section id="architect" hidden>
          <form id="app-form">
            <textarea id="prompt"></textarea>

            <select id="platform">
              <option value="web">Web</option>
              <option value="mobile">Mobile</option>
            </select>

            <button
              id="generate-button"
              type="submit"
            >
              Generate
            </button>
          </form>

          <div id="message"></div>
          <pre id="result"></pre>
        </section>

        <section id="workspace" hidden>
          <h2>Workspace</h2>
        </section>

        <section id="nexus" hidden>
          <span id="status-dot"></span>
          <span id="status-text"></span>
        </section>

        <section id="engines" hidden>
          <h2>Engines</h2>
        </section>

        <section id="monitoring" hidden>
          <h2>Monitoring</h2>
        </section>

        <section id="architecture" hidden>
          <h2>Architecture</h2>
        </section>
      </main>
    </div>
  `;
}

function createInitializedAdapter() {
  const adapter = createFrontierViewAdapter(document);

  expect(adapter).not.toBeNull();

  adapter.initialize();

  return adapter;
}

describe("XSUS Frontier View Adapter", () => {
  beforeEach(() => {
    createFixture();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  test("exports the expected version", () => {
    expect(FRONTIER_VIEW_ADAPTER_VERSION).toBe(
      "1.0.0"
    );
  });

  test("creates a valid adapter", () => {
    const adapter = createFrontierViewAdapter();

    expect(adapter).not.toBeNull();
    expect(typeof adapter.initialize).toBe("function");
    expect(typeof adapter.activate).toBe("function");
    expect(typeof adapter.restore).toBe("function");
    expect(typeof adapter.destroy).toBe("function");
  });

  test("rejects invalid root", () => {
    expect(
      createFrontierViewAdapter(null)
    ).toBeNull();
  });

  test("rejects missing application root", () => {
    document.body.innerHTML =
      "<div id='other-app'></div>";

    expect(
      createFrontierViewAdapter(document)
    ).toBeNull();
  });

  test("initializes seven sections", () => {
    const adapter = createInitializedAdapter();
    const status = adapter.getStatus();

    expect(status.initialized).toBe(true);
    expect(status.destroyed).toBe(false);
    expect(status.sectionCount).toBe(7);
    expect(status.activeRoute).toBeNull();
  });

  test("initialization is idempotent", () => {
    const adapter = createInitializedAdapter();

    const first = adapter.getStatus();
    const second = adapter.initialize();

    expect(second.sectionCount).toBe(
      first.sectionCount
    );
  });

  test("initialization does not change visibility", () => {
    const overview =
      document.querySelector("#overview");

    const architect =
      document.querySelector("#architect");

    const adapter = createInitializedAdapter();

    expect(overview.hidden).toBe(false);
    expect(architect.hidden).toBe(true);
    expect(adapter.getStatus().activeRoute).toBeNull();
  });

  test("fails when a required section is missing", () => {
    document.querySelector("#monitoring").remove();

    const adapter = createFrontierViewAdapter();

    expect(() => adapter.initialize()).toThrow(
      "Missing Frontier section: monitoring"
    );

    expect(adapter.getStatus().initialized).toBe(
      false
    );
  });

  test("does not activate before initialization", () => {
    const adapter = createFrontierViewAdapter();

    expect(adapter.activate("architect")).toBe(false);
  });

  test("activates Application Architect", () => {
    const adapter = createInitializedAdapter();

    expect(adapter.activate("architect")).toBe(true);

    expect(
      document.querySelector("#architect").hidden
    ).toBe(false);

    expect(
      document.querySelector("#overview").hidden
    ).toBe(true);

    expect(adapter.getStatus().activeRoute).toBe(
      "architect"
    );
  });

  test("normalizes legacy route input", () => {
    const adapter = createInitializedAdapter();

    expect(
      adapter.activate(" #ARCHITECT ")
    ).toBe(true);

    expect(adapter.getStatus().activeRoute).toBe(
      "architect"
    );
  });

  test("rejects unknown routes without changing view", () => {
    const adapter = createInitializedAdapter();

    adapter.activate("architect");

    expect(adapter.activate("unknown")).toBe(false);

    expect(adapter.getStatus().activeRoute).toBe(
      "architect"
    );

    expect(
      document.querySelector("#architect").hidden
    ).toBe(false);
  });

  test("activates exactly one Frontier section", () => {
    const adapter = createInitializedAdapter();

    for (const route of FRONTIER_SECTION_IDS) {
      expect(adapter.activate(route)).toBe(true);

      const visible = FRONTIER_SECTION_IDS.filter(
        (id) => !adapter.getSection(id).hidden
      );

      expect(visible).toEqual([route]);
    }
  });

  test("preserves original DOM node identity", () => {
    const original =
      document.querySelector("#architect");

    const adapter = createInitializedAdapter();

    adapter.activate("architect");
    adapter.activate("workspace");
    adapter.activate("architect");

    expect(adapter.getSection("architect")).toBe(
      original
    );

    expect(
      document.querySelector("#architect")
    ).toBe(original);
  });

  test("preserves Application Architect form values", () => {
    const adapter = createInitializedAdapter();

    const prompt = document.querySelector("#prompt");
    const platform =
      document.querySelector("#platform");

    prompt.value = "Build XSUS App";
    platform.value = "mobile";

    adapter.activate("architect");
    adapter.activate("workspace");
    adapter.activate("architect");

    expect(prompt.value).toBe("Build XSUS App");
    expect(platform.value).toBe("mobile");
  });

  test("preserves existing event listeners", () => {
    const adapter = createInitializedAdapter();

    const button =
      document.querySelector("#generate-button");

    const listener = vi.fn();

    button.addEventListener("click", listener);

    adapter.activate("architect");
    adapter.activate("workspace");
    adapter.activate("architect");

    button.click();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("keeps Engines and Monitoring separate", () => {
    const adapter = createInitializedAdapter();

    const engines = adapter.getSection("engines");
    const monitoring =
      adapter.getSection("monitoring");

    expect(engines).not.toBe(monitoring);

    adapter.activate("engines");

    expect(engines.hidden).toBe(false);
    expect(monitoring.hidden).toBe(true);

    adapter.activate("monitoring");

    expect(engines.hidden).toBe(true);
    expect(monitoring.hidden).toBe(false);
  });

  test("resolves canonical module identifiers", () => {
    const adapter = createInitializedAdapter();

    expect(
      adapter.getCanonicalModule("architect")
    ).toBe("command-center");

    expect(
      adapter.getCanonicalModule("workspace")
    ).toBe("living-workspace");

    expect(
      adapter.getCanonicalModule("engines")
    ).toBe("system-control");

    expect(
      adapter.getCanonicalModule("monitoring")
    ).toBe("system-control");

    expect(
      adapter.getCanonicalModule("unknown")
    ).toBeNull();
  });

  test("restores original section visibility", () => {
    const adapter = createInitializedAdapter();

    adapter.activate("architect");
    adapter.activate("monitoring");

    expect(adapter.restore()).toBe(true);

    expect(
      document.querySelector("#overview").hidden
    ).toBe(false);

    for (const route of FRONTIER_SECTION_IDS) {
      if (route === "overview") continue;

      expect(
        document.getElementById(route).hidden
      ).toBe(true);
    }

    expect(adapter.getStatus().activeRoute).toBeNull();
  });

  test("preserves DOM positions during activation", () => {
    const parent =
      document.querySelector("#frontier-content");

    const originalOrder = Array.from(
      parent.children
    ).map((element) => element.id);

    const adapter = createInitializedAdapter();

    adapter.activate("architect");
    adapter.activate("monitoring");
    adapter.restore();

    const restoredOrder = Array.from(
      parent.children
    ).map((element) => element.id);

    expect(restoredOrder).toEqual(originalOrder);
  });

  test("destroy restores original visibility", () => {
    const adapter = createInitializedAdapter();

    adapter.activate("architect");
    adapter.destroy();

    expect(
      document.querySelector("#overview").hidden
    ).toBe(false);

    expect(
      document.querySelector("#architect").hidden
    ).toBe(true);

    expect(adapter.getStatus().destroyed).toBe(true);
  });

  test("destroy without restore retains visibility", () => {
    const adapter = createInitializedAdapter();

    adapter.activate("architect");

    adapter.destroy({ restore: false });

    expect(
      document.querySelector("#architect").hidden
    ).toBe(false);
  });

  test("prevents activation after destruction", () => {
    const adapter = createInitializedAdapter();

    adapter.destroy();

    expect(adapter.activate("architect")).toBe(false);
    expect(adapter.restore()).toBe(false);
    expect(adapter.getSection("architect")).toBeNull();

    expect(() => adapter.initialize()).toThrow(
      "Frontier View Adapter has been destroyed."
    );
  });

  test("exposes an immutable API", () => {
    const adapter = createFrontierViewAdapter();

    expect(Object.isFrozen(adapter)).toBe(true);
  });
});
