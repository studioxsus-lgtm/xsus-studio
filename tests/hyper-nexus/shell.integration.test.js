
/**
 * XSUS APP — HYPER NEXUS
 * Shell Integration Tests
 *
 * @vitest-environment jsdom
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
  initializeHyperNexusShell
} from "../../app-ui/shell/shell.js";

const MODULES = [
  "overview",
  "command-center",
  "living-workspace",
  "multi-agent",
  "workflow-studio",
  "knowledge-graph",
  "system-control",
  "integration-layer",
  "architecture"
];

function createShellFixture() {
  const navigation = MODULES.map((id) => `
    <a
      href="#${id}"
      data-module-link="${id}"
      class="xsus-nav-item"
    >${id}</a>
  `).join("");

  document.body.innerHTML = `
    <div class="xsus-app-shell" id="xsus-app">

      <aside id="hyper-nexus-sidebar">
        <nav>${navigation}</nav>
      </aside>

      <div class="xsus-main-content">
        <header>
          <div id="hyper-nexus-page-title">
            Hyper Nexus
          </div>

          <button
            id="hyper-nexus-menu-toggle"
            type="button"
            aria-expanded="false"
          >Menu</button>
        </header>

        <main
          id="hyper-nexus-module-container"
          tabindex="-1"
        >
          <section
            id="overview"
            data-module="overview"
          >
            <h1>Hyper Nexus Overview</h1>
          </section>

          <div
            id="hyper-nexus-module-loading"
            hidden
          >Loading...</div>

          <div
            id="hyper-nexus-module-error"
            hidden
          >Error</div>
        </main>
      </div>
    </div>
  `;
}

function clickModule(id) {
  const link = document.querySelector(
    `[data-module-link="${id}"]`
  );

  expect(link).not.toBeNull();

  link.click();
}

describe("Hyper Nexus — Shell Integration", () => {
  let shell;

  beforeEach(() => {
    window.history.replaceState(
      null,
      "",
      "#overview"
    );

    createShellFixture();

    shell = initializeHyperNexusShell(document);

    expect(shell).not.toBeNull();
  });

  afterEach(() => {
    shell?.destroy();
    shell = null;

    document.body.innerHTML = "";

    window.history.replaceState(
      null,
      "",
      "#overview"
    );

    vi.restoreAllMocks();
  });

  test("inicializon Shell me API të vlefshme", () => {
    expect(typeof shell.destroy).toBe("function");

    expect(typeof shell.getCurrentModule)
      .toBe("function");

    expect(typeof shell.registerModule)
      .toBe("function");
  });

  test("Overview është moduli fillestar", () => {
    expect(shell.getCurrentModule())
      .toBe("overview");

    expect(
      document.querySelector("#overview").hidden
    ).toBe(false);
  });

  test("ruan përmbajtjen statike të Overview", () => {
    const overview = document.querySelector(
      "#overview"
    );

    expect(overview).not.toBeNull();

    expect(overview.textContent)
      .toContain("Hyper Nexus Overview");
  });

  test("shënon lidhjen aktive të navigimit", () => {
    const link = document.querySelector(
      '[data-module-link="overview"]'
    );

    expect(link.classList.contains("active"))
      .toBe(true);

    expect(link.getAttribute("aria-current"))
      .toBe("page");
  });

  test("navigon te Command Center", () => {
    clickModule("command-center");

    expect(shell.getCurrentModule())
      .toBe("command-center");

    expect(window.location.hash)
      .toBe("#command-center");
  });

  test("fsheh Overview për module të tjera", () => {
    clickModule("architecture");

    expect(
      document.querySelector("#overview").hidden
    ).toBe(true);
  });

  test("shfaq placeholder për modul planned", () => {
    clickModule("multi-agent");

    const placeholder = document.querySelector(
      "#hyper-nexus-unavailable-module"
    );

    expect(placeholder).not.toBeNull();

    expect(placeholder.textContent)
      .toContain("not yet available");
  });

  test("nuk fshin Overview gjatë navigimit", () => {
    const originalOverview = document.querySelector(
      "#overview"
    );

    clickModule("workflow-studio");
    clickModule("overview");

    expect(document.querySelector("#overview"))
      .toBe(originalOverview);

    expect(originalOverview.hidden).toBe(false);

    expect(
      document.querySelector(
        "#hyper-nexus-unavailable-module"
      )
    ).toBeNull();
  });

  test("përditëson titullin e faqes", () => {
    clickModule("architecture");

    const title = document.querySelector(
      "#hyper-nexus-page-title"
    );

    expect(title.textContent.trim())
      .toBe("Architecture");
  });

  test("hap dhe mbyll menunë mobile", () => {
    const root = document.querySelector("#xsus-app");

    const toggle = document.querySelector(
      "#hyper-nexus-menu-toggle"
    );

    toggle.click();

    expect(root.classList.contains("is-sidebar-open"))
      .toBe(true);

    expect(toggle.getAttribute("aria-expanded"))
      .toBe("true");

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape"
      })
    );

    expect(root.classList.contains("is-sidebar-open"))
      .toBe(false);

    expect(toggle.getAttribute("aria-expanded"))
      .toBe("false");
  });

  test("mbyll menunë pas navigimit", () => {
    const root = document.querySelector("#xsus-app");

    document.querySelector(
      "#hyper-nexus-menu-toggle"
    ).click();

    clickModule("system-control");

    expect(root.classList.contains("is-sidebar-open"))
      .toBe(false);
  });

  test("refuzon inicializimin pa elementet bazë", () => {
    const emptyDocument = document.implementation
      .createHTMLDocument("Empty");

    const result = initializeHyperNexusShell(
      emptyDocument
    );

    expect(result).toBeNull();
  });

  test("destroy pastron gjendjen e Shell", () => {
    const root = document.querySelector("#xsus-app");

    document.querySelector(
      "#hyper-nexus-menu-toggle"
    ).click();

    shell.destroy();

    expect(root.classList.contains("is-sidebar-open"))
      .toBe(false);

    expect(() => shell.destroy()).not.toThrow();

    expect(() => {
      shell.registerModule(
        "overview",
        () => document.createElement("section")
      );
    }).toThrow();
  });

  test("nuk regjistron module planned", () => {
    expect(() => {
      shell.registerModule(
        "command-center",
        () => document.createElement("section")
      );
    }).toThrow();
  });

});
