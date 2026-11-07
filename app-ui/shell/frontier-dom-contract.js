
/**
 * XSUS APP — HYPER NEXUS
 * Frontier DOM Integration Contract
 * Version: 1.0.0
 *
 * Read-only structural validation.
 *
 * Does not:
 * - Modify the DOM
 * - Initialize Shell
 * - Execute App Bridge
 * - Import either Core system
 * - Register planned modules
 */

import {
  inspectFrontierCompatibility,
  getFrontierArchitectElements,
  getFrontierBridgeStatusElements
} from "./frontier-integration-adapter.js";

import {
  resolveLegacyRoute
} from "./legacy-route-resolver.js";

export const FRONTIER_DOM_CONTRACT_VERSION = "1.0.0";

export const FRONTIER_DOM_CONTRACT_RULES =
  Object.freeze([
    "UNIQUE_DOM_IDS",
    "SINGLE_APP_ROOT",
    "SINGLE_SIDEBAR",
    "SHELL_REQUIRED_ELEMENTS",
    "OVERVIEW_CONTAINER",
    "ARCHITECT_ELEMENTS",
    "BRIDGE_STATUS_ELEMENTS",
    "NAVIGATION_RESOLUTION",
    "SINGLE_NAVIGATION_OWNER"
  ]);

function isRoot(root) {
  return !!root &&
    typeof root.querySelector === "function" &&
    typeof root.querySelectorAll === "function";
}

function findApp(root) {
  if (!isRoot(root)) return null;

  if (root.id === "xsus-app") {
    return root;
  }

  return root.querySelector("#xsus-app");
}

function checkRule(id, passed, details = null) {
  return Object.freeze({
    id,
    passed: Boolean(passed),
    details
  });
}

function freezeReport(report) {
  return Object.freeze({
    ...report,
    rules: Object.freeze(report.rules),
    failures: Object.freeze(report.failures),
    warnings: Object.freeze(report.warnings)
  });
}

/**
 * Validates the intended unified DOM structure.
 *
 * @param {Document|HTMLElement} root
 * @returns {object} Frozen validation report
 */
export function validateFrontierDOMContract(
  root = typeof document !== "undefined"
    ? document
    : null
) {
  if (!isRoot(root)) {
    return freezeReport({
      validRoot: false,
      valid: false,
      readyForIntegration: false,
      rules: [],
      failures: ["INVALID_ROOT"],
      warnings: []
    });
  }

  const app = findApp(root);

  // Inspect the entire document when available,
  // so duplicate IDs outside the app are not ignored.
  const scope = app?.ownerDocument || root;

  const compatibility =
    inspectFrontierCompatibility(scope);

  const architect =
    getFrontierArchitectElements(scope);

  const bridge =
    getFrontierBridgeStatusElements(scope);

  const appRoots =
    scope.querySelectorAll("#xsus-app");

  const sidebars = app
    ? app.querySelectorAll(".xsus-sidebar")
    : [];

  const moduleContainer = app?.querySelector(
    "#hyper-nexus-module-container"
  );

  const overview = moduleContainer?.querySelector(
    '[data-module="overview"]'
  );

  const navigationLinks = app
    ? Array.from(
        app.querySelectorAll(
          ".xsus-sidebar-nav a[href^='#']"
        )
      )
    : [];

  const unresolvedLinks = navigationLinks
    .filter(link => !resolveLegacyRoute(
      link.getAttribute("href")
    ))
    .map(link => link.getAttribute("href"));

  const rules = [
    checkRule(
      "UNIQUE_DOM_IDS",
      compatibility.duplicateIds.length === 0,
      compatibility.duplicateIds
    ),

    checkRule(
      "SINGLE_APP_ROOT",
      appRoots.length === 1,
      { count: appRoots.length }
    ),

    checkRule(
      "SINGLE_SIDEBAR",
      sidebars.length === 1,
      { count: sidebars.length }
    ),

    checkRule(
      "SHELL_REQUIRED_ELEMENTS",
      compatibility.shellReady,
      compatibility.missingShellIds
    ),

    checkRule(
      "OVERVIEW_CONTAINER",
      Boolean(overview),
      { found: Boolean(overview) }
    ),

    checkRule(
      "ARCHITECT_ELEMENTS",
      Boolean(architect),
      { found: Boolean(architect) }
    ),

    checkRule(
      "BRIDGE_STATUS_ELEMENTS",
      Boolean(bridge),
      { found: Boolean(bridge) }
    ),

    checkRule(
      "NAVIGATION_RESOLUTION",
      unresolvedLinks.length === 0,
      unresolvedLinks
    ),

    checkRule(
      "SINGLE_NAVIGATION_OWNER",
      Boolean(
        app &&
        app.querySelector(
          "#hyper-nexus-sidebar"
        ) &&
        sidebars.length === 1
      ),
      {
        owner: "hyper-nexus-shell"
      }
    )
  ];

  const failures = rules
    .filter(rule => !rule.passed)
    .map(rule => rule.id);

  const warnings = [];

  if (!compatibility.frontierReady) {
    warnings.push("FRONTIER_STRUCTURE_INCOMPLETE");
  }

  if (!compatibility.shellReady) {
    warnings.push("SHELL_STRUCTURE_INCOMPLETE");
  }

  const valid = failures.length === 0;

  return freezeReport({
    validRoot: true,
    valid,
    readyForIntegration:
      valid && compatibility.frontierReady,
    rules,
    failures,
    warnings
  });
}

/**
 * Returns a single rule from a validation report.
 */
export function getFrontierDOMContractRule(
  report,
  ruleId
) {
  if (
    !report ||
    !Array.isArray(report.rules) ||
    typeof ruleId !== "string"
  ) {
    return null;
  }

  return report.rules.find(
    rule => rule.id === ruleId
  ) || null;
}

/**
 * Checks whether a report satisfies every
 * structural integration rule.
 */
export function isFrontierDOMContractSatisfied(report) {
  return Boolean(
    report &&
    report.validRoot === true &&
    report.valid === true &&
    report.readyForIntegration === true &&
    Array.isArray(report.failures) &&
    report.failures.length === 0
  );
}
