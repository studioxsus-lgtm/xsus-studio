
/**
 * XSUS APP — HYPER NEXUS
 * Frontier Navigation Context
 * Version: 1.0.0
 *
 * Responsibilities:
 * - Resolve canonical Hyper Nexus modules
 * - Preserve original Frontier route identity
 * - Distinguish routes sharing one canonical module
 * - Provide immutable navigation context
 *
 * Does NOT:
 * - Modify browser history
 * - Initialize navigation listeners
 * - Load or register modules
 * - Modify the Module Registry
 * - Connect to Core systems
 */

import {
  getModuleDefinition
} from "../modules/module-registry.js";

import {
  resolveLegacyRoute
} from "./legacy-route-resolver.js";

import {
  FRONTIER_SECTION_IDS
} from "./frontier-module-preservation.js";

export const FRONTIER_NAVIGATION_CONTEXT_VERSION =
  "1.0.0";

const LEGACY_ROUTES = new Set(FRONTIER_SECTION_IDS);

const DEFAULT_MODULE = "overview";

function normalizeIdentifier(identifier) {
  if (typeof identifier !== "string") {
    return "";
  }

  return identifier
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
}

/**
 * Resolves an identifier without changing browser history.
 *
 * @param {string} identifier
 * @returns {Readonly<object>}
 */
export function resolveFrontierNavigationContext(
  identifier
) {
  const requestedRoute = normalizeIdentifier(identifier);

  const isFrontierRoute =
    LEGACY_ROUTES.has(requestedRoute);

  const resolvedModule =
    resolveLegacyRoute(requestedRoute);

  const moduleDefinition =
    resolvedModule
      ? getModuleDefinition(resolvedModule)
      : null;

  const moduleId =
    moduleDefinition?.id || DEFAULT_MODULE;

  const frontierRoute =
    isFrontierRoute
      ? requestedRoute
      : null;

  return Object.freeze({
    version: FRONTIER_NAVIGATION_CONTEXT_VERSION,
    requestedRoute,
    moduleId,
    frontierRoute,
    isFrontierRoute,
    isFallback:
      !moduleDefinition,
    canonicalRoute: `#${moduleId}`
  });
}

/**
 * Creates a lightweight context tracker.
 *
 * It stores navigation identity in memory only.
 * It does not own browser navigation.
 */
export function createFrontierNavigationContext() {
  let current =
    resolveFrontierNavigationContext(DEFAULT_MODULE);

  let destroyed = false;

  function update(identifier) {
    if (destroyed) {
      throw new Error(
        "Frontier Navigation Context is destroyed."
      );
    }

    current =
      resolveFrontierNavigationContext(identifier);

    return current;
  }

  function getCurrent() {
    return current;
  }

  function hasChanged(identifier) {
    if (destroyed) {
      return false;
    }

    const next =
      resolveFrontierNavigationContext(identifier);

    return (
      next.moduleId !== current.moduleId ||
      next.frontierRoute !== current.frontierRoute
    );
  }

  function reset() {
    if (destroyed) {
      return false;
    }

    current =
      resolveFrontierNavigationContext(DEFAULT_MODULE);

    return true;
  }

  function destroy() {
    if (destroyed) {
      return;
    }

    destroyed = true;
  }

  function getStatus() {
    return Object.freeze({
      version: FRONTIER_NAVIGATION_CONTEXT_VERSION,
      destroyed,
      moduleId: current.moduleId,
      frontierRoute: current.frontierRoute
    });
  }

  return Object.freeze({
    update,
    getCurrent,
    hasChanged,
    reset,
    destroy,
    getStatus
  });
}
