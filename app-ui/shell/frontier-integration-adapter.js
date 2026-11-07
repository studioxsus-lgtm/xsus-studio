
/**
 * XSUS APP — HYPER NEXUS
 * Frontier Integration Adapter
 * Version: 1.0.0
 *
 * Responsibilities:
 * - Inspect existing Frontier DOM
 * - Resolve Frontier routes to Hyper Nexus modules
 * - Verify required Frontier application elements
 * - Report Shell compatibility
 * - Preserve existing Application Architect elements
 *
 * This adapter does NOT:
 * - Modify the DOM
 * - Initialize Hyper Nexus Shell
 * - Execute App Bridge
 * - Import XSUS AI Core
 * - Import Hyper XSUS Core
 * - Register planned modules
 */

import {
  resolveLegacyRoute
} from "./legacy-route-resolver.js";

import {
  isModuleRegistered
} from "../modules/module-registry.js";

export const FRONTIER_INTEGRATION_ADAPTER_VERSION =
  "1.0.0";

export const FRONTIER_REQUIRED_IDS = Object.freeze([
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

export const HYPER_NEXUS_REQUIRED_IDS = Object.freeze([
  "xsus-app",
  "hyper-nexus-sidebar",
  "hyper-nexus-menu-toggle",
  "hyper-nexus-page-title",
  "hyper-nexus-module-container",
  "hyper-nexus-module-loading",
  "hyper-nexus-module-error"
]);

function isValidRoot(root) {
  return (
    root !== null &&
    typeof root === "object" &&
    typeof root.querySelector === "function" &&
    typeof root.querySelectorAll === "function"
  );
}

function findElement(root, id) {
  return root.querySelector(
    `[id="${id}"]`
  );
}

function findMissingIds(root, ids) {
  return ids.filter(
    id => !findElement(root, id)
  );
}

function findDuplicateIds(root) {
  const elements = root.querySelectorAll("[id]");
  const seen = new Set();
  const duplicates = new Set();

  for (const element of elements) {
    if (seen.has(element.id)) {
      duplicates.add(element.id);
    }

    seen.add(element.id);
  }

  return [...duplicates];
}

function inspectFrontierNavigation(root) {
  const links = root.querySelectorAll(
    '.xsus-sidebar-nav a[href^="#"]'
  );

  const routes = [];
  const unresolvedRoutes = [];

  for (const link of links) {
    const originalRoute = link.getAttribute("href");
    const moduleId = resolveLegacyRoute(originalRoute);

    const entry = Object.freeze({
      route: originalRoute,
      moduleId,
      resolved:
        moduleId !== null &&
        isModuleRegistered(moduleId)
    });

    routes.push(entry);

    if (!entry.resolved) {
      unresolvedRoutes.push(originalRoute);
    }
  }

  return Object.freeze({
    routes: Object.freeze(routes),
    unresolvedRoutes: Object.freeze(unresolvedRoutes),
    valid: unresolvedRoutes.length === 0
  });
}

/**
 * Performs a read-only compatibility inspection.
 *
 * @param {Document|HTMLElement} root
 * @returns {object}
 */
export function inspectFrontierCompatibility(
  root = typeof document !== "undefined"
    ? document
    : null
) {
  if (!isValidRoot(root)) {
    return Object.freeze({
      validRoot: false,
      frontierReady: false,
      shellReady: false,
      migrationReady: false,
      missingFrontierIds: Object.freeze([]),
      missingShellIds: Object.freeze([]),
      duplicateIds: Object.freeze([]),
      navigation: null
    });
  }

  const missingFrontierIds = findMissingIds(
    root,
    FRONTIER_REQUIRED_IDS
  );

  const missingShellIds = findMissingIds(
    root,
    HYPER_NEXUS_REQUIRED_IDS
  );

  const duplicateIds = findDuplicateIds(root);

  const navigation = inspectFrontierNavigation(root);

  const frontierReady =
    missingFrontierIds.length === 0 &&
    duplicateIds.length === 0 &&
    navigation.valid;

  const shellReady =
    missingShellIds.length === 0 &&
    duplicateIds.length === 0;

  return Object.freeze({
    validRoot: true,
    frontierReady,
    shellReady,
    migrationReady:
      frontierReady && shellReady,
    missingFrontierIds:
      Object.freeze(missingFrontierIds),
    missingShellIds:
      Object.freeze(missingShellIds),
    duplicateIds:
      Object.freeze(duplicateIds),
    navigation
  });
}

/**
 * Resolves a Frontier navigation route
 * without changing browser history.
 *
 * @param {string} route
 * @returns {string|null}
 */
export function resolveFrontierNavigation(route) {
  return resolveLegacyRoute(route);
}

/**
 * Returns the existing Application Architect
 * DOM references without modifying them.
 *
 * @param {Document|HTMLElement} root
 * @returns {object|null}
 */
export function getFrontierArchitectElements(
  root = typeof document !== "undefined"
    ? document
    : null
) {
  if (!isValidRoot(root)) {
    return null;
  }

  const elements = {
    form: findElement(root, "app-form"),
    prompt: findElement(root, "prompt"),
    platform: findElement(root, "platform"),
    generateButton: findElement(
      root,
      "generate-button"
    ),
    message: findElement(root, "message"),
    result: findElement(root, "result")
  };

  if (
    Object.values(elements).some(
      element => element === null
    )
  ) {
    return null;
  }

  return Object.freeze(elements);
}

/**
 * Returns existing App Bridge status
 * DOM references without executing Bridge.
 *
 * @param {Document|HTMLElement} root
 * @returns {object|null}
 */
export function getFrontierBridgeStatusElements(
  root = typeof document !== "undefined"
    ? document
    : null
) {
  if (!isValidRoot(root)) {
    return null;
  }

  const elements = {
    statusDot: findElement(root, "status-dot"),
    statusText: findElement(root, "status-text"),
    bridgeMetric: findElement(root, "bridge-metric")
  };

  if (
    Object.values(elements).some(
      element => element === null
    )
  ) {
    return null;
  }

  return Object.freeze(elements);
}
