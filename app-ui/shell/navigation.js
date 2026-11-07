
/**
 * XSUS APP — HYPER NEXUS
 * Navigation Controller
 * Version: 1.3.0
 *
 * Responsibilities:
 * - Validate navigation identifiers
 * - Resolve native and legacy Frontier routes
 * - Preserve Frontier route identity in history.state
 * - Manage browser history and Back/Forward
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

import {
  resolveFrontierNavigationContext
} from "./frontier-navigation-context.js";

export const NAVIGATION_CONTROLLER_VERSION = "1.3.0";

export const DEFAULT_NAVIGATION_MODULE = "overview";

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

export function isValidNavigationModule(identifier) {
  return isModuleRegistered(identifier);
}

export function resolveNavigationModule(identifier) {
  const resolved = resolveLegacyRoute(identifier);

  return resolved && isModuleRegistered(resolved)
    ? resolved
    : DEFAULT_NAVIGATION_MODULE;
}

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

function resolveNavigationIdentity(identifier) {
  const context =
    resolveFrontierNavigationContext(identifier);

  return {
    moduleId: context.moduleId,
    frontierRoute: context.frontierRoute
  };
}

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
  let currentFrontierRoute = null;
  let initialized = false;

  function notifyNavigation(moduleId, frontierRoute) {
    const definition = getModuleDefinition(moduleId);

    if (!definition) {
      return;
    }

    onNavigate({
      ...definition,
      available: isModuleAvailable(moduleId),
      frontierRoute
    });
  }

  function applyNavigation(
    moduleId,
    frontierRoute,
    forceNotify = false
  ) {
    const hasChanged =
      currentModule !== moduleId ||
      currentFrontierRoute !== frontierRoute;

    currentModule = moduleId;
    currentFrontierRoute = frontierRoute;

    if (hasChanged || forceNotify) {
      notifyNavigation(moduleId, frontierRoute);
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
    const frontierRoute = identity.frontierRoute;

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
   */
  function handleHistoryChange() {
    const moduleId =
      getNavigationFromLocation(windowRef.location);

    const historyIdentity =
      getHistoryIdentity(windowRef);

    const frontierRoute =
      historyIdentity?.moduleId === moduleId
        ? historyIdentity.frontierRoute
        : null;

    const canonicalHash = `#${moduleId}`;

    const hashChanged =
      windowRef.location.hash !== canonicalHash;

    if (hashChanged) {
      const hashContext =
        resolveFrontierNavigationContext(
          windowRef.location.hash
        );

      const resolvedFrontierRoute =
        hashContext.moduleId === moduleId
          ? hashContext.frontierRoute
          : null;

      windowRef.history.replaceState(
        createHistoryState(
          moduleId,
          resolvedFrontierRoute,
          windowRef.history.state
        ),
        "",
        canonicalHash
      );

      return applyNavigation(
        moduleId,
        resolvedFrontierRoute
      );
    }

    return applyNavigation(
      moduleId,
      frontierRoute
    );
  }

  /**
   * Initializes navigation.
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
      getNavigationFromLocation(windowRef.location);

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
   * Removes browser listeners.
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
