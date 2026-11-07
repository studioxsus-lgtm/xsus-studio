
/**
 * XSUS APP — HYPER NEXUS
 * Frontier DOM Contract Validation Tests
 * Version: 1.0.0
 *
 * @vitest-environment jsdom
 *
 * Structural validation only.
 * Does not execute App Bridge or Core systems.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from "vitest";

import {
  FRONTIER_DOM_CONTRACT_VERSION,
  FRONTIER_DOM_CONTRACT_RULES,
  validateFrontierDOMContract,
  getFrontierDOMContractRule,
  isFrontierDOMContractSatisfied
} from "../../app-ui/shell/frontier-dom-contract.js";

import {
  FRONTIER_REQUIRED_IDS,
  HYPER_NEXUS_REQUIRED_IDS
} from "../../app-ui/shell/frontier-integration-adapter.js";

const LEGACY_ROUTES = [
  "overview",
  "architect",
  "workspace",
  "nexus",
  "engines",
  "monitoring",
  "architecture"
];

function element(tag, id, parent) {
  const node = document.createElement(tag);
  node.id = id;
  parent.appendChild(node);
  return node;
}

function buildValidDOM() {
  const app = element("div", "xsus-app", document.body);

  const sidebar = element(
    "aside",
    "hyper-nexus-sidebar",
    app
  );

  sidebar.className = "xsus-sidebar";

  const navigation = document.createElement("nav");
  navigation.className = "xsus-sidebar-nav";
  sidebar.appendChild(navigation);

  for (const route of LEGACY_ROUTES) {
    const link = document.createElement("a");
    link.href = `#${route}`;
    navigation.appendChild(link);
  }

  const form = element("form", "app-form", app);

  for (const id of FRONTIER_REQUIRED_IDS) {
    if (
      id === "xsus-app" ||
      id === "app-form"
    ) {
      continue;
    }

    let tag = "div";

    if (id === "prompt") tag = "textarea";
    if (id === "platform") tag = "select";
    if (id === "generate-button") tag = "button";

    const parent = [
      "prompt",
      "platform",
      "generate-button"
    ].includes(id) ? form : app;

    element(tag, id, parent);
  }

  for (const id of HYPER_NEXUS_REQUIRED_IDS) {
    if (
      id === "xsus-app" ||
      id === "hyper-nexus-sidebar"
    ) {
      continue;
    }

    element("div", id, app);
  }

  const container = document.getElementById(
    "hyper-nexus-module-container"
  );

  const overview = document.createElement("section");
  overview.dataset.module = "overview";
  container.appendChild(overview);

  return app;
}

describe(
  "Hyper Nexus — Frontier DOM Contract",
  () => {
    let app;

    beforeEach(() => {
      document.body.innerHTML = "";
      app = buildValidDOM();
    });

    afterEach(() => {
      document.body.innerHTML = "";
    });

    test("eksporton versionin e kontratës", () => {
      expect(FRONTIER_DOM_CONTRACT_VERSION)
        .toBe("1.0.0");
    });

    test("rregullat e kontratës janë immutable", () => {
      expect(Object.isFrozen(FRONTIER_DOM_CONTRACT_RULES))
        .toBe(true);

      expect(FRONTIER_DOM_CONTRACT_RULES)
        .toHaveLength(9);
    });

    test("pranon një strukturë të vlefshme", () => {
      const report = validateFrontierDOMContract(
        document
      );

      expect(report.validRoot).toBe(true);
      expect(report.valid).toBe(true);
      expect(report.readyForIntegration).toBe(true);
      expect(report.failures).toEqual([]);
    });

    test("refuzon root të pavlefshëm", () => {
      const report = validateFrontierDOMContract(null);

      expect(report.validRoot).toBe(false);
      expect(report.valid).toBe(false);
      expect(report.readyForIntegration).toBe(false);
      expect(report.failures).toContain("INVALID_ROOT");
    });

    test("raporti është immutable", () => {
      const report = validateFrontierDOMContract(
        document
      );

      expect(Object.isFrozen(report)).toBe(true);
      expect(Object.isFrozen(report.rules)).toBe(true);
      expect(Object.isFrozen(report.failures)).toBe(true);
      expect(Object.isFrozen(report.warnings)).toBe(true);
    });

    test("zbulon ID të dyfishta", () => {
      element("div", "prompt", app);

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("UNIQUE_DOM_IDS");
    });

    test("zbulon root të dyfishtë", () => {
      element("div", "xsus-app", document.body);

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("SINGLE_APP_ROOT");
    });

    test("zbulon mungesën e sidebar", () => {
      document.getElementById(
        "hyper-nexus-sidebar"
      ).remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("SINGLE_SIDEBAR");
    });

    test("zbulon sidebar të dyfishtë", () => {
      const extra = document.createElement("aside");
      extra.className = "xsus-sidebar";
      app.appendChild(extra);

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("SINGLE_SIDEBAR");
    });

    test("zbulon elementet Shell që mungojnë", () => {
      document.getElementById(
        "hyper-nexus-menu-toggle"
      ).remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("SHELL_REQUIRED_ELEMENTS");
    });

    test("zbulon mungesën e Overview", () => {
      document.querySelector(
        '[data-module="overview"]'
      ).remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("OVERVIEW_CONTAINER");
    });

    test("zbulon mungesën e Architect", () => {
      document.getElementById("app-form").remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("ARCHITECT_ELEMENTS");
    });

    test("zbulon mungesën e statusit Bridge", () => {
      document.getElementById("status-text").remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("BRIDGE_STATUS_ELEMENTS");
    });

    test("zbulon rrugë të panjohura", () => {
      const navigation = app.querySelector(
        ".xsus-sidebar-nav"
      );

      const link = document.createElement("a");
      link.href = "#unknown-route";
      navigation.appendChild(link);

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("NAVIGATION_RESOLUTION");
    });

    test("kontrollon pronësinë e navigimit", () => {
      const report = validateFrontierDOMContract(
        document
      );

      const rule = getFrontierDOMContractRule(
        report,
        "SINGLE_NAVIGATION_OWNER"
      );

      expect(rule.passed).toBe(true);
      expect(rule.details.owner)
        .toBe("hyper-nexus-shell");
    });

    test("zbulon mungesën e pronarit të navigimit", () => {
      document.getElementById(
        "hyper-nexus-sidebar"
      ).remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.failures)
        .toContain("SINGLE_NAVIGATION_OWNER");
    });

    test("kthen një rregull sipas ID", () => {
      const report = validateFrontierDOMContract(
        document
      );

      const rule = getFrontierDOMContractRule(
        report,
        "SINGLE_APP_ROOT"
      );

      expect(rule.id).toBe("SINGLE_APP_ROOT");
      expect(rule.passed).toBe(true);
    });

    test("kthen null për rregull të panjohur", () => {
      const report = validateFrontierDOMContract(
        document
      );

      expect(
        getFrontierDOMContractRule(
          report,
          "UNKNOWN_RULE"
        )
      ).toBeNull();
    });

    test("konfirmon kontratën e plotësuar", () => {
      const report = validateFrontierDOMContract(
        document
      );

      expect(
        isFrontierDOMContractSatisfied(report)
      ).toBe(true);
    });

    test("refuzon kontratën e paplotë", () => {
      document.getElementById("result").remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(
        isFrontierDOMContractSatisfied(report)
      ).toBe(false);
    });

    test("raporton paralajmërime për Frontier të paplotë", () => {
      document.getElementById("prompt").remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.warnings)
        .toContain("FRONTIER_STRUCTURE_INCOMPLETE");
    });

    test("raporton paralajmërime për Shell të paplotë", () => {
      document.getElementById(
        "hyper-nexus-module-loading"
      ).remove();

      const report = validateFrontierDOMContract(
        document
      );

      expect(report.warnings)
        .toContain("SHELL_STRUCTURE_INCOMPLETE");
    });

    test("validimi nuk ndryshon DOM", () => {
      const before = document.body.innerHTML;

      validateFrontierDOMContract(document);

      expect(document.body.innerHTML).toBe(before);
    });
  }
);
