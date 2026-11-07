/**

* XSUS APP — HYPER NEXUS SHELL
* Version: 1.2.0
* Module: Shell Controller
* 
* Responsibilities:
* - Shell interface initialization
* - Centralized navigation
* - Static Overview presentation
* - Dynamic module loading
* - Mobile sidebar
* - Page title management
* 
* Module metadata is managed by Module Registry.
* Navigation is managed by Navigation Controller.
* Dynamic views are managed by Module Loader.
* 
* Does not connect to XSUS AI Core or Hyper XSUS Core.
  */

import {
DEFAULT_NAVIGATION_MODULE,
createNavigationController
} from "./navigation.js";

import {
getModuleDefinition,
isModuleAvailable
} from "../modules/module-registry.js";

import {
createModuleLoader
} from "./module-loader.js";

/**

* Initializes the Hyper Nexus Shell.
* 
* @param {Document|HTMLElement} root
* @returns {object|null}
  */
  export function initializeHyperNexusShell(root = document) {
  if (!root || typeof root.querySelector !== "function") {
  return null;
  }

const shell = root.querySelector("#xsus-app");

if (!shell) {
return null;
}

const sidebar = shell.querySelector(
"#hyper-nexus-sidebar"
);

const menuToggle = shell.querySelector(
"#hyper-nexus-menu-toggle"
);

const pageTitle = shell.querySelector(
"#hyper-nexus-page-title"
);

const moduleContainer = shell.querySelector(
"#hyper-nexus-module-container"
);

const loadingState = shell.querySelector(
"#hyper-nexus-module-loading"
);

const errorState = shell.querySelector(
"#hyper-nexus-module-error"
);

const overviewSection = moduleContainer?.querySelector(
'[data-module="overview"]'
);

if (
!sidebar ||
!menuToggle ||
!pageTitle ||
!moduleContainer ||
!overviewSection ||
!loadingState ||
!errorState
) {
console.error(
"[Hyper Nexus Shell] Required shell elements are missing."
);

return null;

}

const windowRef =
root.defaultView ||
(typeof window !== "undefined" ? window : null);

if (!windowRef) {
return null;
}

let currentModule = DEFAULT_NAVIGATION_MODULE;
let destroyed = false;

const moduleLoader = createModuleLoader({
container: moduleContainer,
loadingElement: loadingState,
errorElement: errorState
});

/**

* Closes the mobile sidebar.
  */
  function closeSidebar() {
  shell.classList.remove("is-sidebar-open");

menuToggle.setAttribute(
  "aria-expanded",
  "false"
);

}

/**

* Toggles the mobile sidebar.
  */
  function toggleSidebar() {
  const isOpen = shell.classList.toggle(
  "is-sidebar-open"
  );

menuToggle.setAttribute(
  "aria-expanded",
  String(isOpen)
);

}

/**

* Removes an existing unavailable-module placeholder.
  */
  function removeUnavailablePlaceholder() {
  moduleContainer.querySelector(
  "#hyper-nexus-unavailable-module"
  )?.remove();
  }

/**

* Displays a safe placeholder for modules
* that do not yet have a registered factory.
  */
  function renderUnavailableModule(title) {
  const placeholder = document.createElement("section");

placeholder.id = "hyper-nexus-unavailable-module";
placeholder.className = "xsus-panel";
placeholder.setAttribute("role", "status");

const heading = document.createElement("h2");
heading.textContent = title;

const description = document.createElement("p");

description.textContent =
  "This module is not yet available. " +
  "Its implementation and runtime registration " +
  "must be completed and verified first.";

placeholder.append(heading, description);
moduleContainer.appendChild(placeholder);

}

/**

* Updates active navigation links.
  */
  function updateNavigationUI(moduleId) {
  shell.querySelectorAll("[data-module-link]")
  .forEach((link) => {
  const isActive =
  link.dataset.moduleLink === moduleId;
  
  link.classList.toggle("active", isActive);
  
  if (isActive) {
  link.setAttribute("aria-current", "page");
  } else {
  link.removeAttribute("aria-current");
  }
  });
  }

/**

* Renders the selected module.
  */
  async function renderModule(navigationState) {
  if (destroyed || !navigationState) {
  return;
  }

const moduleId = navigationState.id;
const definition = getModuleDefinition(moduleId);

if (!definition) {
  console.error(
    `[Hyper Nexus Shell] Unknown module: ${moduleId}`
  );

  return;
}

currentModule = moduleId;

pageTitle.textContent =
  definition.title || definition.name || moduleId;

updateNavigationUI(moduleId);
removeUnavailablePlaceholder();

closeSidebar();

if (moduleId === DEFAULT_NAVIGATION_MODULE) {
  moduleLoader.unloadModule();

  overviewSection.hidden = false;
  moduleContainer.focus({ preventScroll: true });

  return;
}

overviewSection.hidden = true;

if (
  !isModuleAvailable(moduleId) ||
  !moduleLoader.isRegistered(moduleId)
) {
  moduleLoader.unloadModule();

  renderUnavailableModule(pageTitle.textContent);

  moduleContainer.focus({ preventScroll: true });

  return;
}

const result = await moduleLoader.loadModule(moduleId);

if (destroyed || currentModule !== moduleId) {
  return;
}

if (!result.success) {
  console.error(
    `[Hyper Nexus Shell] Module "${moduleId}" was not loaded.`,
    result.reason
  );
}

moduleContainer.focus({ preventScroll: true });

}

/**

* Creates the centralized navigation controller.
  */
  const navigationController = createNavigationController({
  windowRef,

onNavigate(navigationState) {
  void renderModule(navigationState);
}

});

/**

* Handles navigation clicks.
  */
  function handleNavigation(event) {
  const target = event.target;

if (!target || typeof target.closest !== "function") {
  return;
}

const link = target.closest("[data-module-link]");

if (!link || !shell.contains(link)) {
  return;
}

event.preventDefault();

navigationController.navigate(
  link.dataset.moduleLink
);

}

function handleMenuClick() {
toggleSidebar();
}

function handleKeydown(event) {
if (event.key === "Escape") {
closeSidebar();
}
}

function handleResize() {
if (windowRef.innerWidth > 760) {
closeSidebar();
}
}

shell.addEventListener(
"click",
handleNavigation
);

menuToggle.addEventListener(
"click",
handleMenuClick
);

windowRef.addEventListener(
"keydown",
handleKeydown
);

windowRef.addEventListener(
"resize",
handleResize
);

try {
navigationController.initialize();
} catch (error) {
shell.removeEventListener("click", handleNavigation);
menuToggle.removeEventListener("click", handleMenuClick);

windowRef.removeEventListener("keydown", handleKeydown);
windowRef.removeEventListener("resize", handleResize);

navigationController.destroy();
moduleLoader.unloadModule();

console.error(
  "[Hyper Nexus Shell] Initialization failed.",
  error
);

return null;

}

console.info(
"[Hyper Nexus Shell] Initialized successfully."
);

/**

* Cleanup.
  */
  function destroy() {
  if (destroyed) {
  return;
  }

destroyed = true;

shell.removeEventListener(
  "click",
  handleNavigation
);

menuToggle.removeEventListener(
  "click",
  handleMenuClick
);

windowRef.removeEventListener(
  "keydown",
  handleKeydown
);

windowRef.removeEventListener(
  "resize",
  handleResize
);

navigationController.destroy();
moduleLoader.unloadModule();

closeSidebar();

console.info(
  "[Hyper Nexus Shell] Destroyed."
);

}

return Object.freeze({
destroy,

getCurrentModule() {
  return currentModule;
},

registerModule(moduleId, factory) {
  if (destroyed) {
    throw new Error(
      "Hyper Nexus Shell has been destroyed."
    );
  }

  return moduleLoader.registerModule(
    moduleId,
    factory
  );
}

});
}
