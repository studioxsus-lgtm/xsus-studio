/*
 * XSUS APP — HYPER NEXUS
 * Module Loader
 * Version: 1.1.0
 *
 * Responsibilities:
 * - Register approved module factories
 * - Validate modules through the central Module Registry
 * - Load registered module views
 * - Replace previously loaded module views
 * - Handle loading and error states
 *
 * Security:
 * - No arbitrary HTML injection
 * - No execution of downloaded scripts
 * - Only centrally approved module factories are accepted
 *
 * Does not connect to XSUS AI Core or Hyper XSUS Core.
 */

import {
  getModuleDefinition,
  isModuleRegistered,
  isModuleAvailable
} from "../modules/module-registry.js";

/**
 * Creates an independent module loader.
 *
 * @param {object} options
 * @param {HTMLElement} options.container
 * @param {HTMLElement|null} options.loadingElement
 * @param {HTMLElement|null} options.errorElement
 * @returns {object}
 */
export function createModuleLoader({
  container,
  loadingElement = null,
  errorElement = null
} = {}) {
  if (!container || container.nodeType !== 1) {
    throw new TypeError(
      "A valid module container element is required."
    );
  }

  const documentRef = container.ownerDocument;
  const registry = new Map();

  let activeModuleId = null;
  let activeModuleElement = null;
  let loadSequence = 0;

  /**
   * Validates an identifier against the central registry.
   */
  function isValidModuleId(moduleId) {
    return (
      typeof moduleId === "string" &&
      isModuleRegistered(moduleId)
    );
  }

  /**
   * Checks whether a module is approved for loading.
   */
  function isModuleApproved(moduleId) {
    return (
      isValidModuleId(moduleId) &&
      isModuleAvailable(moduleId)
    );
  }

  /**
   * Registers an approved module factory.
   *
   * A factory must return an HTML Element.
   */
  function registerModule(moduleId, factory) {
    if (!isValidModuleId(moduleId)) {
      throw new TypeError(
        "Module is not defined in the central registry."
      );
    }

    if (!isModuleApproved(moduleId)) {
      throw new Error(
        "Module is not marked as available."
      );
    }

    if (typeof factory !== "function") {
      throw new TypeError(
        "Module factory must be a function."
      );
    }

    if (registry.has(moduleId)) {
      throw new Error(
        `Module "${moduleId}" is already registered.`
      );
    }

    registry.set(moduleId, factory);

    return true;
  }

  /**
   * Checks whether an approved factory is registered.
   */
  function isRegistered(moduleId) {
    return (
      isModuleApproved(moduleId) &&
      registry.has(moduleId)
    );
  }

  /**
   * Displays the loading state.
   */
  function showLoading() {
    if (loadingElement) {
      loadingElement.hidden = false;
    }

    if (errorElement) {
      errorElement.hidden = true;
    }
  }

  /**
   * Hides the loading state.
   */
  function hideLoading() {
    if (loadingElement) {
      loadingElement.hidden = true;
    }
  }

  /**
   * Displays a safe error message.
   */
  function showError(message) {
    if (!errorElement) {
      return;
    }

    errorElement.textContent = message;
    errorElement.hidden = false;
  }

  /**
   * Loads a centrally approved module.
   *
   * The latest load request wins.
   * Older asynchronous requests cannot replace newer views.
   */
  async function loadModule(moduleId, context = {}) {
    const currentSequence = ++loadSequence;

    if (!isValidModuleId(moduleId)) {
      hideLoading();

      showError(
        "This module is not defined in the central registry."
      );

      throw new TypeError(
        "Invalid or unregistered module identifier."
      );
    }

    if (!isModuleApproved(moduleId)) {
      hideLoading();

      showError(
        "This module is not currently available."
      );

      return {
        success: false,
        moduleId,
        reason: "MODULE_NOT_AVAILABLE"
      };
    }

    const factory = registry.get(moduleId);

    if (!factory) {
      hideLoading();

      showError(
        "This module has no registered runtime factory."
      );

      return {
        success: false,
        moduleId,
        reason: "MODULE_NOT_REGISTERED"
      };
    }

    showLoading();

    try {
      const moduleElement = await factory({
        document: documentRef,
        context
      });

      if (currentSequence !== loadSequence) {
        return {
          success: false,
          moduleId,
          reason: "LOAD_SUPERSEDED"
        };
      }

      const ElementConstructor =
        documentRef.defaultView?.Element;

      if (
        !ElementConstructor ||
        !(moduleElement instanceof ElementConstructor)
      ) {
        throw new TypeError(
          "Module factory must return an HTML Element."
        );
      }

      if (moduleElement.ownerDocument !== documentRef) {
        throw new TypeError(
          "Module element belongs to another document."
        );
      }

      if (
        moduleElement === container ||
        moduleElement.contains(container)
      ) {
        throw new TypeError(
          "Module element cannot contain its own module container."
        );
      }

      const moduleDefinition = getModuleDefinition(moduleId);

      if (!moduleDefinition || !isModuleAvailable(moduleId)) {
        return {
          success: false,
          moduleId,
          reason: "MODULE_NOT_AVAILABLE"
        };
      }

      if (activeModuleElement) {
        activeModuleElement.remove();
      }

      moduleElement.dataset.loadedModule = moduleId;

      container.appendChild(moduleElement);

      activeModuleId = moduleId;
      activeModuleElement = moduleElement;

      hideLoading();

      if (errorElement) {
        errorElement.hidden = true;
      }

      return {
        success: true,
        moduleId
      };

    } catch (error) {
      if (currentSequence !== loadSequence) {
        return {
          success: false,
          moduleId,
          reason: "LOAD_SUPERSEDED"
        };
      }

      hideLoading();

      showError(
        "The requested module could not be loaded."
      );

      console.error(
        `[Hyper Nexus Module Loader] Failed to load "${moduleId}".`,
        error
      );

      return {
        success: false,
        moduleId,
        reason: "MODULE_LOAD_FAILED"
      };
    }
  }

  /**
   * Unloads the currently active dynamic module.
   */
  function unloadModule() {
    loadSequence += 1;

    if (activeModuleElement) {
      activeModuleElement.remove();
    }

    activeModuleElement = null;
    activeModuleId = null;

    hideLoading();

    if (errorElement) {
      errorElement.hidden = true;
    }

    return true;
  }

  /**
   * Returns the current module identifier.
   */
  function getActiveModule() {
    return activeModuleId;
  }

  /**
   * Returns registered and currently approved factories.
   */
  function listRegisteredModules() {
    return Array.from(registry.keys())
      .filter((moduleId) => isModuleApproved(moduleId));
  }

  return Object.freeze({
    registerModule,
    isRegistered,
    loadModule,
    unloadModule,
    getActiveModule,
    listRegisteredModules
  });
}
