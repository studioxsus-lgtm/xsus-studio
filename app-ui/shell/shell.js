
/*
 * XSUS APP — HYPER NEXUS SHELL
 * Version: 1.0.0
 * Module: Shell Controller
 *
 * Responsibilities:
 * - Navigation state
 * - Mobile sidebar
 * - Page title management
 * - Hash-based navigation
 *
 * Does not connect to XSUS AI Core or Hyper XSUS Core.
 */

const HYPER_NEXUS_MODULES = Object.freeze({
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

const DEFAULT_MODULE = "overview";

/**
 * Initializes the Hyper Nexus Shell.
 *
 * @param {HTMLElement} root
 * @returns {{ destroy: Function } | null}
 */
export function initializeHyperNexusShell(root = document) {
  const shell = root.querySelector("#xsus-app");

  if (!shell) {
    return null;
  }

  const sidebar = shell.querySelector("#hyper-nexus-sidebar");
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

  let currentModule = DEFAULT_MODULE;

  /**
   * Resolves a valid module identifier.
   */
  function resolveModule(identifier) {
    if (
      typeof identifier !== "string" ||
      !Object.prototype.hasOwnProperty.call(
        HYPER_NEXUS_MODULES,
        identifier
      )
    ) {
      return DEFAULT_MODULE;
    }

    return identifier;
  }

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
   * Displays the selected module state.
   *
   * Future modules will be loaded through the
   * controlled module loader.
   */
  function renderModule(identifier) {
    const moduleId = resolveModule(identifier);
    const module = HYPER_NEXUS_MODULES[moduleId];

    currentModule = moduleId;

    pageTitle.textContent = module.title;

    loadingState.hidden = true;
    errorState.hidden = true;

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

    overviewSection.hidden = moduleId !== DEFAULT_MODULE;

    const existingPlaceholder = moduleContainer.querySelector(
      "#hyper-nexus-unavailable-module"
    );

    if (existingPlaceholder) {
      existingPlaceholder.remove();
    }

    if (!module.available) {
      const placeholder = document.createElement("section");

      placeholder.id = "hyper-nexus-unavailable-module";
      placeholder.className = "xsus-panel";
      placeholder.setAttribute("role", "status");

      const heading = document.createElement("h2");
      heading.textContent = module.title;

      const description = document.createElement("p");
      description.textContent =
        "This module has not been implemented and registered yet. " +
        "It will become available after its development and verification.";

      placeholder.append(heading, description);
      moduleContainer.appendChild(placeholder);
    }

    closeSidebar();

    moduleContainer.focus({
      preventScroll: true
    });
  }

  /**
   * Handles navigation clicks.
   */
  function handleNavigation(event) {
    const link = event.target.closest(
      "[data-module-link]"
    );

    if (!link || !shell.contains(link)) {
      return;
    }

    event.preventDefault();

    const requestedModule = resolveModule(
      link.dataset.moduleLink
    );

    const nextHash = `#${requestedModule}`;

    if (window.location.hash !== nextHash) {
      window.history.pushState(
        { module: requestedModule },
        "",
        nextHash
      );
    }

    renderModule(requestedModule);
  }

  /**
   * Handles browser back and forward navigation.
   */
  function handleHistoryChange() {
    const requestedModule = resolveModule(
      window.location.hash.replace(/^#/, "")
    );

    renderModule(requestedModule);
  }

  /**
   * Handles Escape key for mobile navigation.
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
    if (window.innerWidth > 760) {
      closeSidebar();
    }
  }

  /**
   * Event registration.
   */
  function handleMenuClick() {
    toggleSidebar();
  }

  shell.addEventListener(
    "click",
    handleNavigation
  );

  menuToggle.addEventListener(
    "click",
    handleMenuClick
  );

  window.addEventListener(
    "popstate",
    handleHistoryChange
  );

  window.addEventListener(
    "hashchange",
    handleHistoryChange
  );

  window.addEventListener(
    "keydown",
    handleKeydown
  );

  window.addEventListener(
    "resize",
    handleResize
  );

  /**
   * Initial module.
   */
  const initialModule = resolveModule(
    window.location.hash.replace(/^#/, "") ||
    DEFAULT_MODULE
  );

  renderModule(initialModule);

  console.info(
    "[Hyper Nexus Shell] Initialized successfully."
  );

  /**
   * Cleanup.
   */
  function destroy() {
    shell.removeEventListener(
      "click",
      handleNavigation
    );

    menuToggle.removeEventListener(
      "click",
      handleMenuClick
    );

    window.removeEventListener(
      "popstate",
      handleHistoryChange
    );

    window.removeEventListener(
      "hashchange",
      handleHistoryChange
    );

    window.removeEventListener(
      "keydown",
      handleKeydown
    );

    window.removeEventListener(
      "resize",
      handleResize
    );

    closeSidebar();

    console.info(
      "[Hyper Nexus Shell] Destroyed."
    );
  }

  return {
    destroy,
    getCurrentModule: () => currentModule
  };
}
