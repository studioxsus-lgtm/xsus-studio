
/*
 * XSUS APP — HYPER NEXUS
 * Module Loader
 * Version: 1.0.0
 *
 * Responsibilities:
 * - Register approved modules
 * - Load registered module views
 * - Replace previously loaded module views
 * - Handle loading and error states
 *
 * Security:
 * - No arbitrary HTML injection
 * - No execution of downloaded scripts
 * - Only registered module factories are accepted
 */

const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;

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
   * Validates module identifiers.
   */
  function isValidModuleId(moduleId) {
    return (
      typeof moduleId === "string" &&
      MODULE_ID_PATTERN.test(moduleId)
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
        "Invalid module identifier."
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
   * Checks whether a module is registered.
   */
  function isRegistered(moduleId) {
    return registry.has(moduleId);
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
   * Loads a registered module.
   *
   * The latest load request wins. Earlier asynchronous
   * requests cannot replace a newer module.
   */
  async function loadModule(moduleId, context = {}) {
    if (!isValidModuleId(moduleId)) {
      throw new TypeError(
        "Invalid module identifier."
      );
    }

    const factory = registry.get(moduleId);

    if (!factory) {
      showError(
        "This module is not registered."
      );

      return {
        success: false,
        moduleId,
        reason: "MODULE_NOT_REGISTERED"
      };
    }

    const currentSequence = ++loadSequence;

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
   * Returns registered module identifiers.
   */
  function listRegisteredModules() {
    return Array.from(registry.keys());
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
