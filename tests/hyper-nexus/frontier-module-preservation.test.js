
/**
 * XSUS APP — HYPER NEXUS
 * Frontier Module Preservation Tests
 * Phase: 1.8.15
 *
 * Verifies:
 * - Section discovery
 * - Original DOM identity
 * - Form state preservation
 * - Event listener preservation
 * - Reversible relocation
 * - Original sibling ordering
 * - Controller lifecycle
 *
 * No Core systems or App Bridge execution.
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
  createFrontierModulePreservation,
  FRONTIER_SECTION_IDS,
  FRONTIER_MODULE_PRESERVATION_VERSION
} from "../../app-ui/shell/frontier-module-preservation.js";

function createFixture() {
  document.body.innerHTML = `
    <div id="xsus-app">
      <main id="frontier-content">
        <section id="overview">
          <h2>Overview</h2>
        </section>

        <section id="architect">
          <form id="app-form">
            <textarea id="prompt"></textarea>
            <select id="platform">
              <option value="web">Web</option>
              <option value="mobile">Mobile</option>
            </select>
            <button id="generate-button" type="submit">
              Generate
            </button>
          </form>
          <div id="message"></div>
          <pre id="result"></pre>
        </section>

        <section id="workspace">
          <h2>Workspace</h2>
        </section>

        <section id="nexus">
          <span id="status-dot"></span>
          <span id="status-text"></span>
        </section>

        <section id="engines">
          <h2>Engines</h2>
        </section>

        <section id="monitoring">
          <h2>Monitoring</h2>
        </section>

        <section id="architecture">
          <h2>Architecture</h2>
        </section>
      </main>

      <div id="migration-target"></div>
    </div>
  `;

  return {
    root: document,
    originalParent:
      document.querySelector("#frontier-content"),
    target:
      document.querySelector("#migration-target")
  };
}

describe(
  "XSUS Frontier Module Preservation",
  () => {
    beforeEach(() => {
      createFixture();
    });

    afterEach(() => {
      document.body.innerHTML = "";
      vi.restoreAllMocks();
    });

    test("exports the expected version", () => {
      expect(
        FRONTIER_MODULE_PRESERVATION_VERSION
      ).toBe("1.0.0");
    });

    test("defines seven Frontier sections", () => {
      expect(FRONTIER_SECTION_IDS).toHaveLength(7);

      expect(FRONTIER_SECTION_IDS).toContain(
        "architect"
      );

      expect(FRONTIER_SECTION_IDS).toContain(
        "monitoring"
      );
    });

    test("creates a controller", () => {
      const controller =
        createFrontierModulePreservation();

      expect(controller).not.toBeNull();
      expect(typeof controller.capture).toBe(
        "function"
      );
    });

    test("rejects an invalid root", () => {
      expect(
        createFrontierModulePreservation(null)
      ).toBeNull();
    });

    test("rejects a missing application root", () => {
      document.body.innerHTML =
        "<div id='another-app'></div>";

      expect(
        createFrontierModulePreservation(document)
      ).toBeNull();
    });

    test("captures all existing sections", () => {
      const controller =
        createFrontierModulePreservation();

      const status = controller.capture();

      expect(status.captured).toBe(true);
      expect(status.sectionCount).toBe(7);
      expect(status.routes).toEqual(
        FRONTIER_SECTION_IDS
      );
    });

    test("capture is idempotent", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();
      const second = controller.capture();

      expect(second.sectionCount).toBe(7);
    });

    test("capture fails when a section is missing", () => {
      document.querySelector(
        "#monitoring"
      ).remove();

      const controller =
        createFrontierModulePreservation();

      expect(() => controller.capture()).toThrow(
        "Missing Frontier section: monitoring"
      );

      expect(
        controller.getStatus().sectionCount
      ).toBe(0);
    });

    test("preserves original DOM identity", () => {
      const original =
        document.querySelector("#architect");

      const controller =
        createFrontierModulePreservation();

      controller.capture();

      expect(
        controller.getSection("architect")
      ).toBe(original);
    });

    test("normalizes section route input", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      expect(
        controller.getSection(" #ARCHITECT ")
      ).toBe(
        document.querySelector("#architect")
      );
    });

    test("returns null for unknown sections", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      expect(
        controller.getSection("unknown")
      ).toBeNull();
    });

    test("moves the original node", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      const original =
        document.querySelector("#architect");

      const target =
        document.querySelector("#migration-target");

      expect(
        controller.moveSection("architect", target)
      ).toBe(true);

      expect(target.contains(original)).toBe(
        true
      );

      expect(
        controller.getSection("architect")
      ).toBe(original);
    });

    test("preserves form values during relocation", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      const prompt =
        document.querySelector("#prompt");

      const platform =
        document.querySelector("#platform");

      prompt.value = "Build an XSUS application";
      platform.value = "mobile";

      const target =
        document.querySelector("#migration-target");

      controller.moveSection("architect", target);

      expect(prompt.value).toBe(
        "Build an XSUS application"
      );

      expect(platform.value).toBe("mobile");
    });

    test("preserves event listeners", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      const button =
        document.querySelector("#generate-button");

      const listener = vi.fn();

      button.addEventListener("click", listener);

      controller.moveSection(
        "architect",
        document.querySelector("#migration-target")
      );

      button.click();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    test("rejects invalid destinations", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      expect(
        controller.moveSection("architect", null)
      ).toBe(false);

      expect(
        controller.moveSection(
          "architect",
          document.querySelector("#prompt")
        )
      ).toBe(false);
    });

    test("rejects unknown routes", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      expect(
        controller.moveSection(
          "unknown",
          document.querySelector("#migration-target")
        )
      ).toBe(false);
    });

    test("restores a section to its original parent", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      const originalParent =
        document.querySelector("#frontier-content");

      const target =
        document.querySelector("#migration-target");

      controller.moveSection("architect", target);
      controller.restoreSection("architect");

      expect(
        document.querySelector("#architect")
          .parentNode
      ).toBe(originalParent);
    });

    test("restores original sibling order", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      const target =
        document.querySelector("#migration-target");

      controller.moveSection("architect", target);
      controller.moveSection("overview", target);
      controller.moveSection("monitoring", target);

      controller.restoreAll();

      const ids = Array.from(
        document.querySelector(
          "#frontier-content"
        ).children
      ).map((element) => element.id);

      expect(ids).toEqual(FRONTIER_SECTION_IDS);
    });

    test("preserves separate engines and monitoring", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      const engines =
        controller.getSection("engines");

      const monitoring =
        controller.getSection("monitoring");

      expect(engines).not.toBe(monitoring);

      expect(engines.id).toBe("engines");
      expect(monitoring.id).toBe("monitoring");
    });

    test("destroy restores sections by default", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      controller.moveSection(
        "architect",
        document.querySelector("#migration-target")
      );

      controller.destroy();

      expect(
        document.querySelector("#architect")
          .parentNode.id
      ).toBe("frontier-content");

      expect(
        controller.getStatus().destroyed
      ).toBe(true);
    });

    test("destroy without restore keeps moved DOM", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();

      const target =
        document.querySelector("#migration-target");

      controller.moveSection("architect", target);

      controller.destroy({
        restore: false
      });

      expect(
        target.querySelector("#architect")
      ).not.toBeNull();
    });

    test("prevents operations after destruction", () => {
      const controller =
        createFrontierModulePreservation();

      controller.capture();
      controller.destroy();

      expect(
        controller.getSection("architect")
      ).toBeNull();

      expect(
        controller.restoreAll()
      ).toBe(false);

      expect(() => controller.capture()).toThrow(
        "Frontier preservation controller is destroyed."
      );
    });

    test("exposes immutable controller API", () => {
      const controller =
        createFrontierModulePreservation();

      expect(Object.isFrozen(controller)).toBe(
        true
      );
    });
  }
);
