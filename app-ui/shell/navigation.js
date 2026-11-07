
/*
 * XSUS APP — HYPER NEXUS
 * Navigation Controller
 * Version: 1.0.0
 *
 * Responsibilities:
 * - Validate navigation identifiers
 * - Manage active navigation item
 * - Handle browser history
 * - Notify the Shell when navigation changes
 *
 * Does not load modules or connect to Core systems.
 */

export const DEFAULT_NAVIGATION_MODULE = "overview";

export const HYPER_NEXUS_NAVIGATION = Object.freeze({
  overview: {
    title: "Hyper Nexus",
    available: true
  },

  "command-center": {
    title: "Command Center",
    available: false
  },

  "living-workspace": {
    title: "Living Workspace",
    available: false
  },

  "multi-agent": {
    title: "Multi-Agent Center",
    available: false
  },

  "workflow-studio": {
    title: "Workflow Studio",
    available: false
  },

  "knowledge-graph": {
    title: "Knowledge Graph Explorer",
    available: false
  },

  "system-control": {
    title: "System Control",
    available: false
  },

  "integration-layer": {
    title: "Integration Layer",
    available: false
  },

  architecture: {
    title: "Architecture",
    available: false
  }
});

/**
 * Validates a navigation identifier.
 *
 * @param {string} identifier
 * @returns {boolean}
 */
export function isValidNavigationModule(identifier) {
  return (
    typeof identifier === "string" &&
    Object.prototype.hasOwnProperty.call(
      HYPER_NEXUS_NAVIGATION,
      identifier
    )
  );
}

/**
 * Resolves an identifier to a valid module.
 *
 * @param {string} identifier
 * @returns {string}
 */
export function resolveNavigationModule(identifier) {
  return isValidNavigationModule(identifier)
    ? identifier
    : DEFAULT_NAVIGATION_MODULE;
}

/**
 * Reads the current module from the URL.
 *
 * @param {Location} location
 * @returns {string}
 */
export function getNavigationFromLocation(
  location = window.location
) {
  const identifier = location.hash.replace(/^#/, "");

  return resolveNavigationModule(
    identifier || DEFAULT_NAVIGATION_MODULE
  );
}

/**
 * Creates an independent navigation controller.
 *
 * @param {object} options
 * @param {Window} options.windowRef
 * @param {Function} options.onNavigate
 * @returns {object}
 */
export function createNavigationController({
  windowRef = window,
  onNavigate = () => {}
} = {}) {
  if (typeof onNavigate !== "function") {
    throw new TypeError(
      "onNavigate must be a function."
    );
  }

  let currentModule = DEFAULT_NAVIGATION_MODULE;
  let initialized = false;

  /**
   * Navigates to a registered module.
   *
   * @param {string} identifier
   * @param {object} options
   */
  function navigate(identifier, options = {}) {
    const moduleId = resolveNavigationModule(identifier);

    const {
      updateHistory = true,
      replaceHistory = false
    } = options;

    const nextHash = `#${moduleId}`;

    if (updateHistory) {
      if (windowRef.location.hash !== nextHash) {
        const historyMethod = replaceHistory
          ? "replaceState"
          : "pushState";

        windowRef.history[historyMethod](
          { module: moduleId },
          "",
          nextHash
        );
      }
    }

    currentModule = moduleId;

    onNavigate({
      id: moduleId,
      ...HYPER_NEXUS_NAVIGATION[moduleId]
    });

    return moduleId;
  }

  /**
   * Synchronizes navigation with browser history.
   */
  function handleHistoryChange() {
    navigate(
      getNavigationFromLocation(windowRef.location),
      { updateHistory: false }
    );
  }

  /**
   * Initializes history listeners and initial state.
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
        replaceHistory: true
      }
    );
  }

  /**
   * Removes registered listeners.
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
