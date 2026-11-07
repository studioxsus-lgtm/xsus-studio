
/**
 * XSUS APP — HYPER NEXUS
 * Frontier Module Preservation Layer
 * Version: 1.0.0
 *
 * Responsibilities:
 * - Discover existing Frontier sections
 * - Preserve original DOM node references
 * - Preserve form state and event listeners
 * - Provide reversible DOM relocation
 * - Restore sections to original positions
 *
 * Does NOT:
 * - Clone or rebuild Frontier sections
 * - Execute App Bridge
 * - Initialize Hyper Nexus Shell
 * - Change Module Registry
 * - Import either Core system
 */

import {
  resolveLegacyRoute
} from "./legacy-route-resolver.js";

export const FRONTIER_MODULE_PRESERVATION_VERSION =
  "1.0.0";

export const FRONTIER_SECTION_IDS = Object.freeze([
  "overview",
  "architect",
  "workspace",
  "nexus",
  "engines",
  "monitoring",
  "architecture"
]);

function isDOMRoot(root) {
  return Boolean(
    root &&
    typeof root.querySelector === "function" &&
    typeof root.querySelectorAll === "function"
  );
}

function findApp(root) {
  if (!isDOMRoot(root)) return null;

  if (root.id === "xsus-app") {
    return root;
  }

  return root.querySelector("#xsus-app");
}

function createRecord(element, route) {
  return {
    route,
    moduleId: resolveLegacyRoute(route),
    element,
    originalParent: element.parentNode,
    originalNextSibling: element.nextSibling
  };
}

/**
 * Creates an independent preservation controller.
 *
 * @param {Document|HTMLElement} root
 * @returns {object|null}
 */
export function createFrontierModulePreservation(
  root = typeof document !== "undefined"
    ? document
    : null
) {
  const app = findApp(root);

  if (!app) return null;

  const records = new Map();
  let captured = false;
  let destroyed = false;

  /**
   * Discovers Frontier sections without moving them.
   */
  function capture() {
    if (destroyed) {
      throw new Error(
        "Frontier preservation controller is destroyed."
      );
    }

    if (captured) {
      return getStatus();
    }

    const discovered = new Map();

    for (const route of FRONTIER_SECTION_IDS) {
      const element = app.querySelector(
        `[id="${route}"]`
      );

      if (!element) {
        throw new Error(
          `Missing Frontier section: ${route}`
        );
      }

      discovered.set(
        route,
        createRecord(element, route)
      );
    }

    for (const [route, record] of discovered) {
      records.set(route, record);
    }

    captured = true;

    return getStatus();
  }

  /**
   * Returns an original Frontier section.
   */
  function getSection(route) {
    if (!captured || destroyed) return null;

    const normalized =
      typeof route === "string"
        ? route.trim().replace(/^#/, "").toLowerCase()
        : "";

    return records.get(normalized)?.element || null;
  }

  /**
   * Moves an existing section without cloning it.
   *
   * Existing event listeners and form values
   * remain attached to the same DOM nodes.
   */
  function moveSection(route, target) {
    if (!captured || destroyed) {
      return false;
    }

    const element = getSection(route);

    if (
      !element ||
      !target ||
      typeof target.appendChild !== "function"
    ) {
      return false;
    }

    if (
      target === element ||
      element.contains(target)
    ) {
      return false;
    }

    const ownerDocument = element.ownerDocument;

    if (target.ownerDocument !== ownerDocument) {
      return false;
    }

    target.appendChild(element);

    return true;
  }

  /**
   * Restores a section to its original parent.
   */
  function restoreSection(route) {
    if (!captured || destroyed) {
      return false;
    }

    const normalized =
      typeof route === "string"
        ? route.trim().replace(/^#/, "").toLowerCase()
        : "";

    const record = records.get(normalized);

    if (!record || !record.originalParent) {
      return false;
    }

    const {
      element,
      originalParent,
      originalNextSibling
    } = record;

    if (
      originalNextSibling &&
      originalNextSibling.parentNode === originalParent
    ) {
      originalParent.insertBefore(
        element,
        originalNextSibling
      );
    } else {
      originalParent.appendChild(element);
    }

    return true;
  }

  /**
   * Restores all captured sections.
   */
  function restoreAll() {
    if (!captured || destroyed) {
      return false;
    }

    // Restore in reverse order so original
    // sibling relationships are reconstructed.
    const routes = [
      ...FRONTIER_SECTION_IDS
    ].reverse();

    for (const route of routes) {
      restoreSection(route);
    }

    return true;
  }

  /**
   * Reports preservation state.
   */
  function getStatus() {
    return Object.freeze({
      version: FRONTIER_MODULE_PRESERVATION_VERSION,
      captured,
      destroyed,
      sectionCount: records.size,
      routes: Object.freeze(
        Array.from(records.keys())
      )
    });
  }

  /**
   * Releases controller references.
   *
   * By default, sections are restored before
   * the controller is destroyed.
   */
  function destroy({ restore = true } = {}) {
    if (destroyed) return;

    if (restore && captured) {
      restoreAll();
    }

    records.clear();
    captured = false;
    destroyed = true;
  }

  return Object.freeze({
    capture,
    getSection,
    moveSection,
    restoreSection,
    restoreAll,
    getStatus,
    destroy
  });
}
