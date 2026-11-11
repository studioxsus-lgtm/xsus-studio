
/**
 * XSUS APP — HYPER NEXUS
 * Frontier DOM Compatibility Audit
 * Version: 1.0.0
 *
 * @vitest-environment jsdom
 *
 * Audits the archived Frontier page. The public app.html is XSUS App V6.2.
 *
 * The audit reports migration gaps.
 * It does not claim that Hyper Nexus is integrated.
 */

import {
  describe,
  test,
  expect,
  beforeAll
} from "vitest";

import {
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";

import {
  JSDOM
} from "jsdom";

import {
  getAllModuleDefinitions
} from "../../app-ui/modules/module-registry.js";

import {
  resolveLegacyRoute
} from "../../app-ui/shell/legacy-route-resolver.js";

const FRONTIER_FIXTURE = resolve(process.cwd(), "tests/hyper-nexus/fixtures/frontier-legacy.html.fixture");

const REQUIRED_FRONTIER_IDS = Object.freeze([
  "xsus-app",
  "overview",
  "architect",
  "workspace",
  "nexus",
  "engines",
  "monitoring",
  "architecture",
  "app-form",
  "prompt",
  "platform",
  "generate-button",
  "message",
  "result",
  "status-dot",
  "status-text",
  "bridge-metric"
]);

const REQUIRED_SHELL_IDS = Object.freeze([
  "xsus-app",
  "hyper-nexus-sidebar",
  "hyper-nexus-menu-toggle",
  "hyper-nexus-page-title",
  "hyper-nexus-module-container",
  "hyper-nexus-module-loading",
  "hyper-nexus-module-error"
]);

function inspectDOM(document) {
  const allIds = Array.from(
    document.querySelectorAll("[id]"),
    element => element.id
  );

  const duplicates = allIds.filter(
    (id, index) => allIds.indexOf(id) !== index
  );

  const missingFrontierIds = REQUIRED_FRONTIER_IDS.filter(
    id => !document.getElementById(id)
  );

  const missingShellIds = REQUIRED_SHELL_IDS.filter(
    id => !document.getElementById(id)
  );

  return Object.freeze({
    duplicateIds: [...new Set(duplicates)],
    missingFrontierIds,
    missingShellIds,
    shellReady: missingShellIds.length === 0
  });
}

describe(
  "Hyper Nexus — Frontier DOM Compatibility Audit",
  () => {
    let document;
    let html;
    let report;

    beforeAll(() => {
      html = readFileSync(FRONTIER_FIXTURE, "utf8");

      const dom = new JSDOM(html, {
        url: "https://xsus.example/app.html",
        runScripts: "outside-only"
      });

      document = dom.window.document;
      report = inspectDOM(document);
    });

    test("Faqja Frontier është dokument HTML i vlefshëm për analizë", () => {
      expect(document.documentElement.tagName).toBe("HTML");
      expect(document.body).not.toBeNull();
      expect(document.title).toContain("XSUS App");
    });

    test("ekziston vetëm një element xsus-app", () => {
      expect(
        document.querySelectorAll("#xsus-app")
      ).toHaveLength(1);
    });

    test("nuk ka ID të dyfishta", () => {
      expect(report.duplicateIds).toEqual([]);
    });

    test("ruan strukturën bazë Frontier", () => {
      expect(report.missingFrontierIds).toEqual([]);
    });

    test("ruan formularin Application Architect", () => {
      const form = document.getElementById("app-form");

      expect(form?.tagName).toBe("FORM");

      expect(
        form.querySelector("#prompt")
      ).not.toBeNull();

      expect(
        form.querySelector("#platform")
      ).not.toBeNull();

      expect(
        form.querySelector("#generate-button")
      ).not.toBeNull();
    });

    test("ruan elementet e rezultateve", () => {
      expect(
        document.getElementById("message")
      ).not.toBeNull();

      expect(
        document.getElementById("result")
      ).not.toBeNull();
    });

    test("ruan elementet e statusit të App Bridge", () => {
      expect(
        document.getElementById("status-dot")
      ).not.toBeNull();

      expect(
        document.getElementById("status-text")
      ).not.toBeNull();

      expect(
        document.getElementById("bridge-metric")
      ).not.toBeNull();
    });

    test("ruan importin ekzistues të App Bridge", () => {
      const scripts = Array.from(
        document.querySelectorAll(
          'script[type="module"]'
        )
      );

      expect(
        scripts.some(script =>
          script.textContent.includes(
            "./platform/xsus-app/xsus-app-bridge.js"
          )
        )
      ).toBe(true);
    });

    test("të gjitha rrugët Frontier kanë destinacion", () => {
      const legacyRoutes = [
        "overview",
        "architect",
        "workspace",
        "nexus",
        "engines",
        "monitoring",
        "architecture"
      ];

      for (const route of legacyRoutes) {
        expect(
          resolveLegacyRoute(`#${route}`)
        ).not.toBeNull();
      }
    });

    test("destinacionet ekzistojnë në Module Registry", () => {
      const registeredIds = new Set(
        getAllModuleDefinitions().map(
          module => module.id
        )
      );

      for (const link of document.querySelectorAll(
        ".xsus-sidebar-nav a[href^='#']"
      )) {
        const target = resolveLegacyRoute(
          link.getAttribute("href")
        );

        expect(
          registeredIds.has(target)
        ).toBe(true);
      }
    });

    test("auditimi raporton elementet Shell që mungojnë", () => {
      expect(
        Array.isArray(report.missingShellIds)
      ).toBe(true);

      expect(
        report.missingShellIds
      ).toEqual(
        REQUIRED_SHELL_IDS.filter(
          id => !document.getElementById(id)
        )
      );
    });

    test("shellReady pasqyron gjendjen reale", () => {
      expect(report.shellReady).toBe(
        report.missingShellIds.length === 0
      );
    });

    test("struktura aktuale nuk pretendon integrim të përfunduar", () => {
      // Baseline audit: Frontier has not yet
      // been migrated to Hyper Nexus Shell.
      expect(report.shellReady).toBe(false);
    });

    test("raporton gjendjen e migrimit", () => {
      console.info(
        "[Hyper Nexus Frontier DOM Audit]",
        JSON.stringify(
          {
            duplicateIds: report.duplicateIds,
            missingFrontierIds: report.missingFrontierIds,
            missingShellIds: report.missingShellIds,
            shellReady: report.shellReady
          },
          null,
          2
        )
      );

      expect(report).toBeDefined();
    });
  }
);
