
/**
 * XSUS APP — HYPER NEXUS
 * Frontier Integration Adapter Tests
 * Version: 1.0.0
 *
 * @vitest-environment jsdom
 *
 * Tests the read-only Frontier Integration Adapter.
 * No App Bridge or Core systems are executed.
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach
} from "vitest";

import {
  FRONTIER_INTEGRATION_ADAPTER_VERSION,
  FRONTIER_REQUIRED_IDS,
  HYPER_NEXUS_REQUIRED_IDS,
  inspectFrontierCompatibility,
  resolveFrontierNavigation,
  getFrontierArchitectElements,
  getFrontierBridgeStatusElements
} from "../../app-ui/shell/frontier-integration-adapter.js";

const FRONTIER_ROUTES = [
  "overview",
  "architect",
  "workspace",
  "nexus",
  "engines",
  "monitoring",
  "architecture"
];

function createElement(id, tag = "div") {
  const element = document.createElement(tag);
  element.id = id;
  return element;
}

function buildFrontierDOM() {
  const root = createElement("xsus-app");

  document.body.appendChild(root);

  const navigation = document.createElement("nav");
  navigation.className = "xsus-sidebar-nav";
  root.appendChild(navigation);

  for (const route of FRONTIER_ROUTES) {
    const link = document.createElement("a");
    link.href = `#${route}`;
    link.textContent = route;
    navigation.appendChild(link);
  }

  for (const id of FRONTIER_REQUIRED_IDS) {
    if (id === "xsus-app") continue;

    let tag = "div";

    if (id === "app-form") tag = "form";
    if (id === "prompt") tag = "textarea";
    if (id === "platform") tag = "select";
    if (id === "generate-button") tag = "button";

    const element = createElement(id, tag);

    if (
      id === "prompt" ||
      id === "platform" ||
      id === "generate-button"
    ) {
      root.querySelector("#app-form")?.appendChild(element);
    } else {
      root.appendChild(element);
    }
  }

  return root;
}

function addShellElements(root) {
  for (const id of HYPER_NEXUS_REQUIRED_IDS) {
    if (id === "xsus-app") continue;

    root.appendChild(createElement(id));
  }
}

describe(
  "Hyper Nexus — Frontier Integration Adapter",
  () => {
    let root;

    beforeEach(() => {
      document.body.innerHTML = "";
      root = buildFrontierDOM();
    });

    afterEach(() => {
      document.body.innerHTML = "";
    });

    test("eksporton versionin e adapterit", () => {
      expect(FRONTIER_INTEGRATION_ADAPTER_VERSION)
        .toBe("1.0.0");
    });

    test("listat e elementeve janë të pandryshueshme", () => {
      expect(Object.isFrozen(FRONTIER_REQUIRED_IDS))
        .toBe(true);

      expect(Object.isFrozen(HYPER_NEXUS_REQUIRED_IDS))
        .toBe(true);
    });

    test("refuzon root të pavlefshëm", () => {
      const result = inspectFrontierCompatibility(null);

      expect(result.validRoot).toBe(false);
      expect(result.frontierReady).toBe(false);
      expect(result.shellReady).toBe(false);
      expect(result.migrationReady).toBe(false);
    });

    test("identifikon strukturën ekzistuese Frontier", () => {
      const result = inspectFrontierCompatibility(document);

      expect(result.validRoot).toBe(true);
      expect(result.frontierReady).toBe(true);
      expect(result.missingFrontierIds).toEqual([]);
    });

    test("raporton elementet Shell që mungojnë", () => {
      const result = inspectFrontierCompatibility(document);

      expect(result.shellReady).toBe(false);

      expect(result.missingShellIds)
        .toContain("hyper-nexus-sidebar");
    });

    test("identifikon strukturën e përbashkët", () => {
      addShellElements(root);

      const result = inspectFrontierCompatibility(document);

      expect(result.frontierReady).toBe(true);
      expect(result.shellReady).toBe(true);
      expect(result.migrationReady).toBe(true);
    });

    test("raporton ID të dyfishta", () => {
      root.appendChild(createElement("prompt"));

      const result = inspectFrontierCompatibility(document);

      expect(result.duplicateIds).toContain("prompt");
      expect(result.frontierReady).toBe(false);
    });

    test("ID të dyfishta bllokojnë migrationReady", () => {
      addShellElements(root);
      root.appendChild(createElement("result"));

      const result = inspectFrontierCompatibility(document);

      expect(result.migrationReady).toBe(false);
    });

    test("raporton elementet Frontier që mungojnë", () => {
      document.getElementById("app-form").remove();

      const result = inspectFrontierCompatibility(document);

      expect(result.missingFrontierIds)
        .toContain("app-form");
    });

    test("raporton rrugët e panjohura", () => {
      const link = document.createElement("a");
      link.href = "#unknown-frontier-route";

      root.querySelector(".xsus-sidebar-nav")
        .appendChild(link);

      const result = inspectFrontierCompatibility(document);

      expect(result.navigation.valid).toBe(false);

      expect(result.navigation.unresolvedRoutes)
        .toContain("#unknown-frontier-route");
    });

    test("të gjitha rrugët Frontier përkthehen", () => {
      const result = inspectFrontierCompatibility(document);

      expect(result.navigation.valid).toBe(true);
      expect(result.navigation.routes).toHaveLength(7);
    });

    test("përkthen architect në command-center", () => {
      expect(resolveFrontierNavigation("#architect"))
        .toBe("command-center");
    });

    test("përkthen workspace në living-workspace", () => {
      expect(resolveFrontierNavigation("#workspace"))
        .toBe("living-workspace");
    });

    test("përkthen nexus në integration-layer", () => {
      expect(resolveFrontierNavigation("#nexus"))
        .toBe("integration-layer");
    });

    test("përkthen monitoring në system-control", () => {
      expect(resolveFrontierNavigation("#monitoring"))
        .toBe("system-control");
    });

    test("refuzon rrugë të panjohura", () => {
      expect(resolveFrontierNavigation("#unknown"))
        .toBeNull();
    });

    test("kthen elementet e Application Architect", () => {
      const elements = getFrontierArchitectElements(document);

      expect(elements).not.toBeNull();
      expect(elements.form.id).toBe("app-form");
      expect(elements.prompt.id).toBe("prompt");
      expect(elements.platform.id).toBe("platform");
      expect(elements.generateButton.id)
        .toBe("generate-button");
    });

    test("refuzon Application Architect të paplotë", () => {
      document.getElementById("prompt").remove();

      expect(
        getFrontierArchitectElements(document)
      ).toBeNull();
    });

    test("kthen elementet e statusit App Bridge", () => {
      const elements = getFrontierBridgeStatusElements(document);

      expect(elements).not.toBeNull();
      expect(elements.statusDot.id).toBe("status-dot");
      expect(elements.statusText.id).toBe("status-text");
      expect(elements.bridgeMetric.id).toBe("bridge-metric");
    });

    test("nuk ndryshon DOM gjatë auditimit", () => {
      const before = document.body.innerHTML;

      inspectFrontierCompatibility(document);
      getFrontierArchitectElements(document);
      getFrontierBridgeStatusElements(document);

      expect(document.body.innerHTML).toBe(before);
    });
  }
);
