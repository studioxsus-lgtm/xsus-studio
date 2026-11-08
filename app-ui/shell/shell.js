
/**
 * XSUS APP — HYPER NEXUS SHELL
 * Version: 1.3.0
 * Module: Shell Controller
 * Phase: 1.8.26
 *
 * Responsibilities:
 * - Shell interface initialization
 * - Centralized navigation
 * - Static Overview presentation
 * - Dynamic module loading
 * - Optional preserved Frontier views
 * - Mobile sidebar
 * - Page title management
 *
 * Does not connect directly to XSUS AI Core
 * or Hyper XSUS Core.
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

import {
  createFrontierViewAdapter
} from "./frontier-view-adapter.js";

import {
  createFrontierNavigationViewCoordinator
} from "./frontier-navigation-view-coordinator.js";

export const HYPER_NEXUS_SHELL_VERSION = "1.3.0";

/**
 * Initializes the Hyper Nexus Shell.
 *
 * Frontier integration is opt-in.
 *
 * @param {Document|HTMLElement} root
 * @param {object} options
 * @returns {object|null}
 */
export function initializeHyperNexusShell(
  root = document,
  options = {}
) {
  if (
    !root ||
    typeof root.querySelector !== "function"
  ) {
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

  const overviewSection =
    moduleContainer?.querySelector(
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

  const ownerDocument =
    shell.ownerDocument ||
    (root.nodeType === 9 ? root : null);

  const windowRef =
    ownerDocument?.defaultView ||
    (typeof window !== "undefined" ? window : null);

  if (!windowRef || !ownerDocument) {
    return null;
  }

  const frontierEnabled =
    options?.enableFrontier === true;

  let frontierAdapter = null;
  let frontierCoordinator = null;

  if (frontierEnabled) {
    try {
      frontierAdapter =
        createFrontierViewAdapter(root);

      if (!frontierAdapter) {
        console.error(
          "[Hyper Nexus Shell] Frontier adapter unavailable."
        );

        return null;
      }

      frontierAdapter.initialize();

      frontierCoordinator =
        createFrontierNavigationViewCoordinator({
          viewAdapter: frontierAdapter
        });
    } catch (error) {
      frontierCoordinator?.destroy();

      frontierAdapter?.destroy({
        restore: true
      });

      console.error(
        "[Hyper Nexus Shell] Frontier initialization failed.",
        error
      );

      return null;
    }
  }

  let currentModule = DEFAULT_NAVIGATION_MODULE;
  let destroyed = false;
  let renderSequence = 0;

  const moduleLoader = createModuleLoader({
    container: moduleContainer,
    loadingElement: loadingState,
    errorElement: errorState
  });

  function closeSidebar() {
    shell.classList.remove("is-sidebar-open");

    menuToggle.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  function toggleSidebar() {
    const isOpen = shell.classList.toggle(
      "is-sidebar-open"
    );

    menuToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  }

  function removeUnavailablePlaceholder() {
    moduleContainer.querySelector(
      "#hyper-nexus-unavailable-module"
    )?.remove();
  }

  function renderUnavailableModule(title) {
    const placeholder =
      ownerDocument.createElement("section");

    placeholder.id =
      "hyper-nexus-unavailable-module";

    placeholder.className = "xsus-panel";

    placeholder.setAttribute(
      "role",
      "status"
    );

    const heading =
      ownerDocument.createElement("h2");

    heading.textContent = title;

    const description =
      ownerDocument.createElement("p");

    description.textContent =
      "This module is not yet available. " +
      "Its implementation and runtime registration " +
      "must be completed and verified first.";

    placeholder.append(
      heading,
      description
    );

    moduleContainer.appendChild(placeholder);
  }

  function updateNavigationUI(moduleId) {
    shell.querySelectorAll(
      "[data-module-link]"
    ).forEach((link) => {
      const isActive =
        link.dataset.moduleLink === moduleId;

      link.classList.toggle(
        "active",
        isActive
      );

      if (isActive) {
        link.setAttribute(
          "aria-current",
          "page"
        );
      } else {
        link.removeAttribute(
          "aria-current"
        );
      }
    });
  }

  function focusModuleContainer() {
    if (
      typeof moduleContainer.focus === "function"
    ) {
      moduleContainer.focus({
        preventScroll: true
      });
    }
  }

  /**
   * Hides preserved Frontier views without
   * removing or cloning their DOM elements.
   */
  function hideFrontierViews() {
    if (!frontierAdapter) {
      return;
    }

    const routes = [
      "overview",
      "architect",
      "workspace",
      "nexus",
      "engines",
      "monitoring",
      "architecture"
    ];

    for (const route of routes) {
      const section =
        frontierAdapter.getSection(route);

      if (section) {
        section.hidden = true;
      }
    }

    frontierCoordinator?.reset();
  }

  /**
   * Renders the selected module.
   */
  async function renderModule(navigationState) {
    if (
      destroyed ||
      !navigationState
    ) {
      return;
    }

    const moduleId = navigationState.id;
    const definition =
      getModuleDefinition(moduleId);

    if (!definition) {
      console.error(
        `[Hyper Nexus Shell] Unknown module: ${moduleId}`
      );

      return;
    }

    const sequence = ++renderSequence;

    currentModule = moduleId;

    pageTitle.textContent =
      definition.title ||
      definition.name ||
      moduleId;

    updateNavigationUI(moduleId);
    removeUnavailablePlaceholder();
    closeSidebar();

    /**
     * Frontier takes precedence only when
     * the navigation state explicitly carries
     * a preserved Frontier identity.
     */
    if (
      frontierCoordinator &&
      navigationState.frontierRoute
    ) {
      const activated =
        frontierCoordinator.synchronize(
          navigationState
        );

      if (activated) {
        moduleLoader.unloadModule();

        overviewSection.hidden =
          navigationState.frontierRoute !== "overview";

        focusModuleContainer();
        return;
      }
    }

    hideFrontierViews();

    if (
      moduleId === DEFAULT_NAVIGATION_MODULE
    ) {
      moduleLoader.unloadModule();

      overviewSection.hidden = false;

      focusModuleContainer();
      return;
    }

    overviewSection.hidden = true;

    if (
      !isModuleAvailable(moduleId) ||
      !moduleLoader.isRegistered(moduleId)
    ) {
      moduleLoader.unloadModule();

      renderUnavailableModule(
        pageTitle.textContent
      );

      focusModuleContainer();
      return;
    }

    const result =
      await moduleLoader.loadModule(moduleId);

    if (
      destroyed ||
      currentModule !== moduleId ||
      sequence !== renderSequence
    ) {
      return;
    }

    if (!result.success) {
      console.error(
        `[Hyper Nexus Shell] Module "${moduleId}" was not loaded.`,
        result.reason
      );
    }

    focusModuleContainer();
  }

  const navigationController =
    createNavigationController({
      windowRef,

      onNavigate(navigationState) {
        void renderModule(navigationState);
      }
    });

  function handleNavigation(event) {
    const target = event.target;

    if (
      !target ||
      typeof target.closest !== "function"
    ) {
      return;
    }

    const link =
      target.closest("[data-module-link]");

    if (
      !link ||
      !shell.contains(link)
    ) {
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

    frontierCoordinator?.destroy();

    frontierAdapter?.destroy({
      restore: true
    });

    console.error(
      "[Hyper Nexus Shell] Initialization failed.",
      error
    );

    return null;
  }

  console.info(
    "[Hyper Nexus Shell] Initialized successfully."
  );

  function destroy() {
    if (destroyed) {
      return;
    }

    destroyed = true;
    renderSequence += 1;

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

    removeUnavailablePlaceholder();

    frontierCoordinator?.destroy();

    frontierAdapter?.destroy({
      restore: true
    });

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
