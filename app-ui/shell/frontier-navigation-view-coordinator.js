
/**
 * XSUS APP — HYPER NEXUS
 * Frontier Navigation View Coordinator
 * Version: 1.0.0
 * Phase: 1.8.24
 *
 * Responsibilities:
 * - Synchronize navigation identity with Frontier views
 * - Preserve original Frontier route identity
 * - Distinguish engines and monitoring
 * - Avoid redundant view activation
 * - Expose immutable status snapshots
 *
 * Does NOT:
 * - Own or modify browser history
 * - Create a Navigation Controller
 * - Move, clone or replace DOM elements
 * - Register or load Hyper Nexus modules
 * - Connect to XSUS AI Core or Hyper XSUS Core
 */

import {
  resolveFrontierNavigationContext
} from "./frontier-navigation-context.js";

import {
  FRONTIER_SECTION_IDS
} from "./frontier-module-preservation.js";

export const FRONTIER_NAVIGATION_VIEW_COORDINATOR_VERSION =
  "1.0.0";

const FRONTIER_ROUTES = new Set(
  FRONTIER_SECTION_IDS
);

function normalizeRoute(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/^#/, "")
    .toLowerCase();
}

function resolveIdentity(navigation) {
  if (typeof navigation === "string") {
    const context =
      resolveFrontierNavigationContext(navigation);

    return {
      moduleId: context.moduleId,
      frontierRoute: context.frontierRoute
    };
  }

  if (
    !navigation ||
    typeof navigation !== "object"
  ) {
    return null;
  }

  const identifier =
    typeof navigation.id === "string"
      ? navigation.id
      : navigation.moduleId;

  if (typeof identifier !== "string") {
    return null;
  }

  const context =
    resolveFrontierNavigationContext(identifier);

  if (context.isFallback) {
    return null;
  }

  const requestedFrontierRoute =
    normalizeRoute(navigation.frontierRoute);

  let frontierRoute = null;

  if (
    FRONTIER_ROUTES.has(requestedFrontierRoute)
  ) {
    const frontierContext =
      resolveFrontierNavigationContext(
        requestedFrontierRoute
      );

    if (
      frontierContext.moduleId === context.moduleId
    ) {
      frontierRoute = requestedFrontierRoute;
    }
  } else if (context.isFrontierRoute) {
    frontierRoute = context.frontierRoute;
  }

  return {
    moduleId: context.moduleId,
    frontierRoute
  };
}

/**
 * Creates a coordinator for an existing
 * Frontier View Adapter.
 *
 * The adapter must be initialized separately.
 */
export function createFrontierNavigationViewCoordinator({
  viewAdapter
} = {}) {
  if (
    !viewAdapter ||
    typeof viewAdapter.activate !== "function" ||
    typeof viewAdapter.getStatus !== "function"
  ) {
    throw new TypeError(
      "A valid Frontier View Adapter is required."
    );
  }

  let destroyed = false;
  let activeModule = null;
  let activeFrontierRoute = null;
  let synchronizationCount = 0;

  /**
   * Synchronizes a Navigation Controller payload
   * or a route identifier with the Frontier view.
   *
   * Returns false when no Frontier view is
   * available for the requested identity.
   */
  function synchronize(navigation) {
    if (destroyed) {
      return false;
    }

    const identity =
      resolveIdentity(navigation);

    if (!identity) {
      return false;
    }

    const {
      moduleId,
      frontierRoute
    } = identity;

    /*
     * Canonical modules without a specific
     * Frontier identity are not activated here.
     *
     * Hyper Nexus Shell remains responsible
     * for rendering native module views.
     */
    if (!frontierRoute) {
      return false;
    }

    const adapterStatus =
      viewAdapter.getStatus();

    if (
      adapterStatus?.destroyed === true
    ) {
      return false;
    }

    if (
      activeModule === moduleId &&
      activeFrontierRoute === frontierRoute
    ) {
      return true;
    }

    const activated =
      viewAdapter.activate(frontierRoute);

    if (!activated) {
      return false;
    }

    activeModule = moduleId;
    activeFrontierRoute = frontierRoute;
    synchronizationCount += 1;

    return true;
  }

  /**
   * Returns the active Frontier identity.
   */
  function getCurrent() {
    return Object.freeze({
      moduleId: activeModule,
      frontierRoute: activeFrontierRoute
    });
  }

  /**
   * Clears coordinator tracking only.
   *
   * Does not modify the DOM or adapter state.
   */
  function reset() {
    if (destroyed) {
      return false;
    }

    activeModule = null;
    activeFrontierRoute = null;

    return true;
  }

  /**
   * Returns an immutable status snapshot.
   */
  function getStatus() {
    return Object.freeze({
      version:
        FRONTIER_NAVIGATION_VIEW_COORDINATOR_VERSION,
      destroyed,
      activeModule,
      activeFrontierRoute,
      synchronizationCount
    });
  }

  /**
   * Releases coordinator state.
   *
   * The View Adapter lifecycle remains
   * controlled by its owner.
   */
  function destroy() {
    if (destroyed) {
      return;
    }

    destroyed = true;
    activeModule = null;
    activeFrontierRoute = null;
  }

  return Object.freeze({
    synchronize,
    getCurrent,
    reset,
    getStatus,
    destroy
  });
}
