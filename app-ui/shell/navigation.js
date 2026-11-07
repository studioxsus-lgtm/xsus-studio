/*

* XSUS APP — HYPER NEXUS
* Navigation Controller
* Version: 1.1.0
* 
* Responsibilities:
* - Validate navigation identifiers through Module Registry
* - Resolve module metadata
* - Manage active navigation item
* - Handle browser history
* - Notify the Shell when navigation changes
* 
* Module Registry is the single source of truth.
* 
* Does not load modules or connect to Core systems.
  */

import {
getAllModuleDefinitions,
getModuleDefinition,
isModuleRegistered,
isModuleAvailable
} from "../modules/module-registry.js";

/**

* Default navigation module.
  */
  export const DEFAULT_NAVIGATION_MODULE = "overview";

/**

* Compatibility export.
* 
* This object is derived from the central registry.
* It is not an independent module definition source.
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

* Validates a navigation identifier.
* 
* @param {string} identifier
* @returns {boolean}
  */
  export function isValidNavigationModule(identifier) {
  return isModuleRegistered(identifier);
  }

/**

* Resolves an identifier to a registered module.
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

* Notifies the Shell with authoritative registry metadata.
* 
* @param {string} moduleId
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

* Navigates to a registered module.
* 
* @param {string} identifier
* @param {object} options
* @returns {string}
  */
  function navigate(identifier, options = {}) {
  const moduleId = resolveNavigationModule(identifier);

const {
  updateHistory = true,
  replaceHistory = false,
  forceNotify = false
} = options;

const nextHash = `#${moduleId}`;

if (updateHistory && windowRef.location.hash !== nextHash) {
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

* Synchronizes navigation with browser history.
* 
* Duplicate notifications are avoided when both
* popstate and hashchange report the same destination.
  */
  function handleHistoryChange() {
  const requestedModule = getNavigationFromLocation(
  windowRef.location
  );

if (requestedModule === currentModule) {
  return;
}

navigate(requestedModule, {
  updateHistory: false
});

}

/**

* Initializes history listeners and initial state.
* 
* @returns {string}
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
