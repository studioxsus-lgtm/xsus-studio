
/**
 * XSUS APP — HYPER NEXUS
 * Navigation Controller
 * Version: 1.3.1
 *
 * Responsibilities:
 * - Validate navigation identifiers
 * - Resolve native and legacy Frontier routes
 * - Preserve Frontier route identity in history.state
 * - Manage browser history and Back/Forward
 * - Prevent duplicate navigation notifications
 * - Notify Hyper Nexus Shell
 *
 * Compatibility:
 * - Preserve existing navigation APIs
 * - Preserve legacy canonical navigation behavior
 * - Notify when distinct Frontier views change
 *
 * Module Registry remains the source of truth.
 *
 * Does not load modules.
 * Does not connect to XSUS AI Core or Hyper XSUS Core.
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

import {
  resolveFrontierNavigationContext
} from "./frontier-navigation-context.js";

export const NAVIGATION_CONTROLLER_VERSION = "1.3.1";

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
 * Reads the canonical module from a location object.
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

function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

/**
 * Resolves both canonical and Frontier identities.
 */
function resolveNavigationIdentity(identifier) {
  const context =
    resolveFrontierNavigationContext(identifier);

  return {
    moduleId: context.moduleId,
    frontierRoute: context.frontierRoute
  };
}

/**
 * Reads validated navigation identity from history.
 */
function getHistoryIdentity(windowRef) {
  const state = windowRef.history.state;

  if (!isObject(state)) {
    return null;
  }

  if (typeof state.module !== "string") {
    return null;
  }

  const moduleId =
    resolveNavigationModule(state.module);

  if (moduleId !== state.module) {
    return null;
  }

  let frontierRoute = null;

  if (typeof state.frontierRoute === "string") {
    const context =
      resolveFrontierNavigationContext(
        state.frontierRoute
      );

    if (
      context.isFrontierRoute &&
      context.moduleId === moduleId
    ) {
      frontierRoute = context.frontierRoute;
    }
  }

  return {
    moduleId,
    frontierRoute
  };
}

/**
 * Creates navigation history state.
 *
 * Preserves unrelated existing history metadata.
 */
function createHistoryState(
  moduleId,
  frontierRoute,
  previousState = null
) {
  const base = isObject(previousState)
    ? previousState
    : {};

  return {
    ...base,
    module: moduleId,
    frontierRoute
  };
}

/**
 * Creates a Navigation Controller.
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
  let currentFrontierRoute = null;
  let initialized = false;

  /**
   * Sends registry metadata to Hyper Nexus Shell.
   */
  function notifyNavigation(
    moduleId,
    frontierRoute
  ) {
    const definition =
      getModuleDefinition(moduleId);

    if (!definition) {
      return;
    }

    onNavigate({
      ...definition,
      available: isModuleAvailable(moduleId),
      frontierRoute
    });
  }

  /**
   * Applies navigation state.
   *
   * Compatibility rules:
   *
   * 1. Notify when the canonical module changes.
   *
   * 2. Notify when switching between distinct
   *    Frontier views within the same module.
   *
   * 3. Do not notify again when navigating from
   *    a Frontier route to its canonical identifier.
   *
   * 4. Preserve forceNotify behavior.
   */
  function applyNavigation(
    moduleId,
    frontierRoute,
    forceNotify = false
  ) {
    const previousModule = currentModule;
    const previousFrontierRoute =
      currentFrontierRoute;

    const moduleChanged =
      previousModule !== moduleId;

    const frontierChanged =
      previousFrontierRoute !== frontierRoute;

    /*
     * A transition between two distinct Frontier
     * views must notify the Shell even when both
     * resolve to the same canonical module.
     */
    const distinctFrontierTransition =
      !moduleChanged &&
      frontierChanged &&
      frontierRoute !== null;

    currentModule = moduleId;
    currentFrontierRoute = frontierRoute;

    if (
      moduleChanged ||
      distinctFrontierTransition ||
      forceNotify
    ) {
      notifyNavigation(
        moduleId,
        frontierRoute
      );
    }

    return moduleId;
  }

  /**
   * Navigate to a native or legacy route.
   */
  function navigate(identifier, options = {}) {
    const identity =
      resolveNavigationIdentity(identifier);

    const {
      updateHistory = true,
      replaceHistory = false,
      forceNotify = false
    } = options;

    const moduleId = identity.moduleId;
    const frontierRoute =
      identity.frontierRoute;

    const nextHash = `#${moduleId}`;

    const existingIdentity =
      getHistoryIdentity(windowRef);

    const historyIdentityChanged =
      !existingIdentity ||
      existingIdentity.moduleId !== moduleId ||
      existingIdentity.frontierRoute !== frontierRoute;

    const hashChanged =
      windowRef.location.hash !== nextHash;

    if (
      updateHistory &&
      (hashChanged || historyIdentityChanged)
    ) {
      const historyMethod = replaceHistory
        ? "replaceState"
        : "pushState";

      windowRef.history[historyMethod](
        createHistoryState(
          moduleId,
          frontierRoute,
          windowRef.history.state
        ),
        "",
        nextHash
      );
    }

    return applyNavigation(
      moduleId,
      frontierRoute,
      forceNotify
    );
  }

  /**
   * Synchronizes browser history.
   *
   * Restores the Frontier route when valid.
   */
  function handleHistoryChange() {
    const moduleId =
      getNavigationFromLocation(
        windowRef.location
      );

    const historyIdentity =
      getHistoryIdentity(windowRef);

    const canonicalHash = `#${moduleId}`;

    const hashChanged =
      windowRef.location.hash !== canonicalHash;

    if (hashChanged) {
      const hashContext =
        resolveFrontierNavigationContext(
          windowRef.location.hash
        );

      const frontierRoute =
        hashContext.moduleId === moduleId &&
        hashContext.isFrontierRoute
          ? hashContext.frontierRoute
          : null;

      windowRef.history.replaceState(
        createHistoryState(
          moduleId,
          frontierRoute,
          windowRef.history.state
        ),
        "",
        canonicalHash
      );

      return applyNavigation(
        moduleId,
        frontierRoute
      );
    }

    const frontierRoute =
      historyIdentity?.moduleId === moduleId
        ? historyIdentity.frontierRoute
        : null;

    return applyNavigation(
      moduleId,
      frontierRoute
    );
  }

  /**
   * Initializes browser navigation.
   *
   * Preserves initialization behavior.
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

    const moduleId =
      getNavigationFromLocation(
        windowRef.location
      );

    const historyIdentity =
      getHistoryIdentity(windowRef);

    const hashContext =
      resolveFrontierNavigationContext(
        windowRef.location.hash ||
        DEFAULT_NAVIGATION_MODULE
      );

    const frontierRoute =
      historyIdentity?.moduleId === moduleId
        ? historyIdentity.frontierRoute
        : hashContext.frontierRoute;

    windowRef.history.replaceState(
      createHistoryState(
        moduleId,
        frontierRoute,
        windowRef.history.state
      ),
      "",
      `#${moduleId}`
    );

    return applyNavigation(
      moduleId,
      frontierRoute,
      true
    );
  }

  /**
   * Removes browser history listeners.
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

    getCurrentModule() {
      return currentModule;
    },

    getCurrentFrontierRoute() {
      return currentFrontierRoute;
    },

    isInitialized() {
      return initialized;
    }
  });
}
