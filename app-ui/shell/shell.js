/**

* XSUS APP — HYPER NEXUS SHELL
* Version: 1.1.0
* Module: Shell Controller
* 
* Responsibilities:
* - Shell interface initialization
* - Module presentation
* - Mobile sidebar
* - Page title management
* 
* Navigation is managed by navigation.js.
* Module metadata is managed by module-registry.js.
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

/**

* Initializes the Hyper Nexus Shell.
* 
* @param {Document|HTMLElement} root
* @returns {{
* destroy: Function,
* getCurrentModule: Function
* } | null}
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
!overviewSection
) {
console.error(
"[Hyper Nexus Shell] Required shell elements are missing."
);

return null;

}

const windowRef = root.defaultView ||
(typeof window !== "undefined" ? window : null);

if (!windowRef) {
console.error(
"[Hyper Nexus Shell] Browser environment is unavailable."
);

return null;

}

let currentModule = DEFAULT_NAVIGATION_MODULE;
let destroyed = false;

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
  const placeholder = moduleContainer.querySelector(
  "#hyper-nexus-unavailable-module"
  );

placeholder?.remove();

}

/**

* Creates a safe placeholder for modules
* that are not yet available.
* 
* @param {string} title
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
  "This module has not been implemented and verified yet. " +
  "It will become available after its development and testing.";

placeholder.append(heading, description);
moduleContainer.appendChild(placeholder);

}

/**

* Updates active navigation links.

* 

* @param {string} moduleId
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

* Renders a module using registry metadata.
* 
* @param {{id: string}} navigationState
  */
  function renderModule(navigationState) {
  if (destroyed || !navigationState) {
  return;
  }

const moduleId = navigationState.id;
const moduleDefinition = getModuleDefinition(moduleId);

if (!moduleDefinition) {
  console.error(
    `[Hyper Nexus Shell] Module definition not found: ${moduleId}`
  );

  return;
}

currentModule = moduleId;

pageTitle.textContent = moduleDefinition.title ||
  moduleDefinition.name ||
  moduleId;

if (loadingState) {
  loadingState.hidden = true;
}

if (errorState) {
  errorState.hidden = true;
}

updateNavigationUI(moduleId);

overviewSection.hidden =
  moduleId !== DEFAULT_NAVIGATION_MODULE;

removeUnavailablePlaceholder();

if (!isModuleAvailable(moduleId)) {
  renderUnavailableModule(
    pageTitle.textContent
  );
}

closeSidebar();

moduleContainer.focus({
  preventScroll: true
});

}

/**

* Navigation controller.
* Owns hash navigation and browser history.
  */
  const navigationController = createNavigationController({
  windowRef,

onNavigate(navigationState) {
  renderModule(navigationState);
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

/**

* Handles mobile menu click.
  */
  function handleMenuClick() {
  toggleSidebar();
  }

/**

* Handles Escape key.
  */
  function handleKeydown(event) {
  if (event.key === "Escape") {
  closeSidebar();
  }
  }

/**

* Handles viewport changes.
  */
  function handleResize() {
  if (windowRef.innerWidth > 760) {
  closeSidebar();
  }
  }

/**

* Register Shell-specific events.
  */
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

/**

* Initialize centralized navigation.
  */
  try {
  navigationController.initialize();
  } catch (error) {
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

closeSidebar();
removeUnavailablePlaceholder();

console.info(
  "[Hyper Nexus Shell] Destroyed."
);

}

return {
destroy,

getCurrentModule() {
  return currentModule;
}

};
}
