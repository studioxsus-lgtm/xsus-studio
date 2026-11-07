
/**
 * XSUS APP — HYPER NEXUS
 * Legacy Route Resolver
 * Version: 1.0.0
 *
 * Compatibility layer for Frontier routes.
 *
 * Does not initialize navigation.
 * Does not load modules.
 * Does not modify browser history.
 */

import {
  isModuleRegistered
} from "../modules/module-registry.js";

export const LEGACY_ROUTE_RESOLVER_VERSION = "1.0.0";

export const LEGACY_ROUTE_MAP = Object.freeze({
  overview: "overview",
  architect: "command-center",
  workspace: "living-workspace",
  nexus: "integration-layer",
  engines: "system-control",
  monitoring: "system-control",
  architecture: "architecture"
});

/**
 * Normalize a hash or route identifier.
 */
export function normalizeLegacyRoute(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/^#+/, "")
    .trim()
    .toLowerCase();
}

/**
 * Resolve a legacy route into a registered
 * Hyper Nexus module identifier.
 *
 * Registration does not imply availability.
 */
export function resolveLegacyRoute(value) {
  const route = normalizeLegacyRoute(value);

  if (!route) {
    return null;
  }

  const target = LEGACY_ROUTE_MAP[route] || route;

  return isModuleRegistered(target)
    ? target
    : null;
}

/**
 * Identify whether a route belongs to the
 * historical Frontier navigation.
 */
export function isLegacyRoute(value) {
  const route = normalizeLegacyRoute(value);

  return Object.prototype.hasOwnProperty.call(
    LEGACY_ROUTE_MAP,
    route
  );
}

/**
 * Return compatibility metadata without
 * claiming that a module is operational.
 */
export function getLegacyRouteInfo(value) {
  const route = normalizeLegacyRoute(value);
  const moduleId = resolveLegacyRoute(route);

  if (!moduleId) {
    return null;
  }

  return Object.freeze({
    originalRoute: route,
    moduleId,
    isLegacy: isLegacyRoute(route),
    requiresMigration: route !== moduleId
  });
}
