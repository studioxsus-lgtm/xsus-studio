
/**
 * XSUS APP — HYPER NEXUS
 * Frontier View Adapter
 * Version: 1.0.0
 *
 * Controls visibility of preserved Frontier views.
 *
 * Does not:
 * - Initialize navigation
 * - Register dynamic modules
 * - Execute App Bridge
 * - Modify Module Registry
 * - Import XSUS AI Core or Hyper XSUS Core
 */

import {
  createFrontierModulePreservation,
  FRONTIER_SECTION_IDS
} from "./frontier-module-preservation.js";

import {
  resolveLegacyRoute
} from "./legacy-route-resolver.js";

export const FRONTIER_VIEW_ADAPTER_VERSION = "1.0.0";

const LEGACY_ROUTES = new Set(FRONTIER_SECTION_IDS);

function normalizeRoute(route) {
  if (typeof route !== "string") {
    return null;
  }

  const normalized = route
    .trim()
    .replace(/^#/, "")
    .toLowerCase();

  return LEGACY_ROUTES.has(normalized)
    ? normalized
    : null;
}

/**
 * Creates a controlled Frontier view adapter.
 *
 * @param {Document|HTMLElement} root
 * @returns {object|null}
 */
export function createFrontierViewAdapter(
  root = typeof document !== "undefined"
    ? document
    : null
) {
  const preservation =
    createFrontierModulePreservation(root);

  if (!preservation) {
    return null;
  }

  let initialized = false;
  let destroyed = false;
  let activeRoute = null;

  const originalVisibility = new Map();

  /**
   * Captures existing sections and their visibility.
   *
   * Does not change the DOM.
   */
  function initialize() {
    if (destroyed) {
      throw new Error(
        "Frontier View Adapter has been destroyed."
      );
    }

    if (initialized) {
      return getStatus();
    }

    preservation.capture();

    for (const route of FRONTIER_SECTION_IDS) {
      const section = preservation.getSection(route);

      originalVisibility.set(route, section.hidden);
    }

    initialized = true;

    return getStatus();
  }

  /**
   * Activates one existing Frontier section.
   *
   * This method does not modify browser history.
   */
  function activate(route) {
    if (!initialized || destroyed) {
      return false;
    }

    const normalized = normalizeRoute(route);

    if (!normalized) {
      return false;
    }

    for (const sectionRoute of FRONTIER_SECTION_IDS) {
      const section =
        preservation.getSection(sectionRoute);

      section.hidden = sectionRoute !== normalized;
    }

    activeRoute = normalized;

    return true;
  }

  /**
   * Resolves a legacy route to its canonical module.
   */
  function getCanonicalModule(route) {
    const normalized = normalizeRoute(route);

    if (!normalized) {
      return null;
    }

    return resolveLegacyRoute(normalized);
  }

  /**
   * Returns an original Frontier DOM section.
   */
  function getSection(route) {
    if (!initialized || destroyed) {
      return null;
    }

    const normalized = normalizeRoute(route);

    return normalized
      ? preservation.getSection(normalized)
      : null;
  }

  /**
   * Restores original visibility and DOM positions.
   */
  function restore() {
    if (!initialized || destroyed) {
      return false;
    }

    preservation.restoreAll();

    for (const route of FRONTIER_SECTION_IDS) {
      const section = preservation.getSection(route);

      section.hidden =
        originalVisibility.get(route) ?? false;
    }

    activeRoute = null;

    return true;
  }

  /**
   * Returns adapter state.
   */
  function getStatus() {
    return Object.freeze({
      version: FRONTIER_VIEW_ADAPTER_VERSION,
      initialized,
      destroyed,
      activeRoute,
      sectionCount:
        preservation.getStatus().sectionCount
    });
  }

  /**
   * Releases adapter resources.
   */
  function destroy({ restore: shouldRestore = true } = {}) {
    if (destroyed) {
      return;
    }

    if (initialized && shouldRestore) {
      restore();
    }

    preservation.destroy({
      restore: false
    });

    originalVisibility.clear();

    initialized = false;
    activeRoute = null;
    destroyed = true;
  }

  return Object.freeze({
    initialize,
    activate,
    getCanonicalModule,
    getSection,
    restore,
    getStatus,
    destroy
  });
}
