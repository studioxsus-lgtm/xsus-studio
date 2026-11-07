
/**
 * XSUS APP — HYPER NEXUS
 * Navigation Controller
 * Version: 1.2.0
 *
 * Responsibilities:
 * - Validate navigation identifiers
 * - Resolve legacy Frontier routes
 * - Resolve authoritative module metadata
 * - Manage active navigation state
 * - Handle browser history
 * - Notify Hyper Nexus Shell
 *
 * Module Registry remains the source of truth.
 *
 * Does not load modules.
 * Does not connect to Core systems.
 */

import {
  getAllModuleDefinitions,
  getModuleDefinition,
  isModuleRegistered,
  isModuleAvailable
} from "../modules/module-registry.js";

import {
  resolveLegacyRoute
} from "./legacy-route-resolver.js";

export const NAVIGATION_CONTROLLER_VERSION = "1.2.0";

export const DEFAULT_NAVIGATION_MODULE = "overview";

/**
 * Compatibility export derived from Module Registry.
 */
export const HYPER_NEXUS_NAVIGATION = Object.freeze(
  Object.fromEntries(
    getAllModuleDefinitions().map((module) => [
      module.id,
      Object.freeze({
        title: module.title,
        available: isModuleAvailable(module.id)
      })
    ])
  )
);

/**
 * Validates native module identifiers.
 *
 * Legacy routes are resolved separately.
 */
export function isValidNavigationModule(identifier) {
  return isModuleRegistered(identifier);
}

/**
 * Resolves native and legacy navigation routes.
 *
 * Unknown routes fall back to Overview.
 */
export function resolveNavigationModule(identifier) {
  const resolved = resolveLegacyRoute(identifier);

  return resolved && isModuleRegistered(resolved)
    ? resolved
    : DEFAULT_NAVIGATION_MODULE;
}

/**
 * Reads navigation state from a location object.
 */
export function getNavigationFromLocation(
  location = window.location
) {
  const hash =
    typeof location?.hash === "string"
      ? location.hash
      : "";

  return resolveNavigationModule(
    hash || DEFAULT_NAVIGATION_MODULE
  );
}

/**
 * Creates a navigation controller.
 */
export function createNavigationController({
  windowRef = window,
  onNavigate = () => {}
} = {}) {
  if (
    !windowRef ||
    !windowRef.location ||
    !windowRef.history ||
    typeof windowRef.addEventListener !== "function" ||
    typeof windowRef.removeEventListener !== "function"
  ) {
    throw new TypeError(
      "A valid browser window reference is required."
    );
  }

  if (typeof onNavigate !== "function") {
    throw new TypeError(
      "onNavigate must be a function."
    );
  }

  let currentModule = DEFAULT_NAVIGATION_MODULE;
  let initialized = false;

  /**
   * Sends registry metadata to the Shell.
   */
  function notifyNavigation(moduleId) {
    const definition = getModuleDefinition(moduleId);

    if (!definition) {
      return;
    }

    onNavigate({
      ...definition,
      available: isModuleAvailable(moduleId)
    });
  }

  /**
   * Navigate to a native or legacy route.
   */
  function navigate(identifier, options = {}) {
    const moduleId = resolveNavigationModule(identifier);

    const {
      updateHistory = true,
      replaceHistory = false,
      forceNotify = false
    } = options;

    const nextHash = `#${moduleId}`;

    if (
      updateHistory &&
      windowRef.location.hash !== nextHash
    ) {
      const historyMethod = replaceHistory
        ? "replaceState"
        : "pushState";

      windowRef.history[historyMethod](
        { module: moduleId },
        "",
        nextHash
      );
    }

    const hasChanged = currentModule !== moduleId;

    currentModule = moduleId;

    if (hasChanged || forceNotify) {
      notifyNavigation(moduleId);
    }

    return moduleId;
  }

  /**
   * Synchronizes browser history.
   *
   * Legacy routes are normalized through the
   * central route resolver.
   */
  function handleHistoryChange() {
    const requestedModule = getNavigationFromLocation(
      windowRef.location
    );

    const canonicalHash = `#${requestedModule}`;

    if (windowRef.location.hash !== canonicalHash) {
      windowRef.history.replaceState(
        { module: requestedModule },
        "",
        canonicalHash
      );
    }

    if (requestedModule === currentModule) {
      return;
    }

    navigate(requestedModule, {
      updateHistory: false
    });
  }

  /**
   * Initializes the controller.
   *
   * Existing API and initialization behavior
   * are preserved.
   */
  function initialize() {
    if (initialized) {
      return currentModule;
    }

    windowRef.addEventListener(
      "popstate",
      handleHistoryChange
    );

    windowRef.addEventListener(
      "hashchange",
      handleHistoryChange
    );

    initialized = true;

    return navigate(
      getNavigationFromLocation(windowRef.location),
      {
        updateHistory: true,
        replaceHistory: true,
        forceNotify: true
      }
    );
  }

  /**
   * Removes history listeners.
   */
  function destroy() {
    if (!initialized) {
      return;
    }

    windowRef.removeEventListener(
      "popstate",
      handleHistoryChange
    );

    windowRef.removeEventListener(
      "hashchange",
      handleHistoryChange
    );

    initialized = false;
  }

  return Object.freeze({
    initialize,
    navigate,
    destroy,
    getCurrentModule: () => currentModule,
    isInitialized: () => initialized
  });
}
