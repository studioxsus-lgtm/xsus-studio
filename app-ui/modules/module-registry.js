
/*
 * XSUS APP — HYPER NEXUS
 * Central Module Registry
 * Version: 1.0.0
 *
 * Purpose:
 * - Define the official Hyper Nexus modules
 * - Track implementation status
 * - Provide validated module metadata
 *
 * This registry does not implement module functionality.
 * It does not connect to XSUS AI Core or Hyper XSUS Core.
 */

const MODULE_DEFINITIONS = [
  {
    id: "overview",
    name: "Overview",
    title: "Hyper Nexus",
    description: "Central Hyper Nexus overview and entry point.",
    category: "control-center",
    status: "available",
    route: "#overview",
    order: 1
  },
  {
    id: "command-center",
    name: "Command Center",
    title: "Command Center",
    description: "Central command interface for application operations.",
    category: "control-center",
    status: "planned",
    route: "#command-center",
    order: 2
  },
  {
    id: "living-workspace",
    name: "Living Workspace",
    title: "Living Workspace",
    description: "Workspace for managing projects, files and activities.",
    category: "control-center",
    status: "planned",
    route: "#living-workspace",
    order: 3
  },
  {
    id: "multi-agent",
    name: "Multi-Agent Center",
    title: "Multi-Agent Center",
    description: "Environment for future multi-agent orchestration.",
    category: "intelligence",
    status: "planned",
    route: "#multi-agent",
    order: 4
  },
  {
    id: "workflow-studio",
    name: "Workflow Studio",
    title: "Workflow Studio",
    description: "Visual environment for designing and managing workflows.",
    category: "intelligence",
    status: "planned",
    route: "#workflow-studio",
    order: 5
  },
  {
    id: "knowledge-graph",
    name: "Knowledge Graph Explorer",
    title: "Knowledge Graph Explorer",
    description: "Interface for exploring connected knowledge structures.",
    category: "intelligence",
    status: "planned",
    route: "#knowledge-graph",
    order: 6
  },
  {
    id: "system-control",
    name: "System Control & Monitoring",
    title: "System Control",
    description: "Future system configuration and verified monitoring.",
    category: "systems",
    status: "planned",
    route: "#system-control",
    order: 7
  },
  {
    id: "integration-layer",
    name: "Integration Layer",
    title: "Integration Layer",
    description: "Controlled integration management and adapter visibility.",
    category: "systems",
    status: "planned",
    route: "#integration-layer",
    order: 8
  },
  {
    id: "architecture",
    name: "Architecture",
    title: "Architecture",
    description: "Documentation and visualization of system boundaries.",
    category: "systems",
    status: "planned",
    route: "#architecture",
    order: 9
  }
];

const VALID_STATUSES = new Set([
  "available",
  "planned",
  "development",
  "testing",
  "disabled"
]);

const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]{1,63}$/;

/**
 * Validates a module definition.
 */
function validateModuleDefinition(module) {
  if (!module || typeof module !== "object") {
    throw new TypeError("Module definition must be an object.");
  }

  if (
    typeof module.id !== "string" ||
    !MODULE_ID_PATTERN.test(module.id)
  ) {
    throw new TypeError("Invalid module identifier.");
  }

  if (
    typeof module.name !== "string" ||
    module.name.trim() === ""
  ) {
    throw new TypeError("Module name is required.");
  }

  if (
    typeof module.title !== "string" ||
    module.title.trim() === ""
  ) {
    throw new TypeError("Module title is required.");
  }

  if (
    typeof module.description !== "string" ||
    module.description.trim() === ""
  ) {
    throw new TypeError("Module description is required.");
  }

  if (!VALID_STATUSES.has(module.status)) {
    throw new TypeError("Invalid module status.");
  }

  if (
    typeof module.order !== "number" ||
    !Number.isInteger(module.order) ||
    module.order < 1
  ) {
    throw new TypeError("Invalid module order.");
  }

  if (
    typeof module.route !== "string" ||
    module.route !== `#${module.id}`
  ) {
    throw new TypeError("Invalid module route.");
  }

  return true;
}

/**
 * Creates an immutable copy of a module definition.
 */
function createImmutableModule(module) {
  validateModuleDefinition(module);

  return Object.freeze({
    id: module.id,
    name: module.name,
    title: module.title,
    description: module.description,
    category: module.category,
    status: module.status,
    route: module.route,
    order: module.order
  });
}

/**
 * Build the internal registry.
 */
const registry = new Map();

for (const definition of MODULE_DEFINITIONS) {
  const module = createImmutableModule(definition);

  if (registry.has(module.id)) {
    throw new Error(
      `Duplicate module identifier: ${module.id}`
    );
  }

  registry.set(module.id, module);
}

/**
 * Returns a module definition by identifier.
 *
 * @param {string} moduleId
 * @returns {object|null}
 */
export function getModuleDefinition(moduleId) {
  if (typeof moduleId !== "string") {
    return null;
  }

  return registry.get(moduleId) || null;
}

/**
 * Returns all module definitions in display order.
 *
 * @returns {Array<object>}
 */
export function getAllModuleDefinitions() {
  return Array.from(registry.values())
    .sort((a, b) => a.order - b.order);
}

/**
 * Returns modules filtered by status.
 *
 * @param {string} status
 * @returns {Array<object>}
 */
export function getModulesByStatus(status) {
  if (!VALID_STATUSES.has(status)) {
    return [];
  }

  return getAllModuleDefinitions()
    .filter((module) => module.status === status);
}

/**
 * Checks whether a module is registered.
 *
 * @param {string} moduleId
 * @returns {boolean}
 */
export function isModuleRegistered(moduleId) {
  return (
    typeof moduleId === "string" &&
    registry.has(moduleId)
  );
}

/**
 * Returns whether a module is marked as available.
 *
 * This is registry metadata, not proof of runtime functionality.
 *
 * @param {string} moduleId
 * @returns {boolean}
 */
export function isModuleAvailable(moduleId) {
  const module = getModuleDefinition(moduleId);

  return module?.status === "available";
}

/**
 * Returns registry statistics.
 */
export function getModuleRegistryStatus() {
  const modules = getAllModuleDefinitions();

  return Object.freeze({
    total: modules.length,
    available: modules.filter(
      (module) => module.status === "available"
    ).length,
    planned: modules.filter(
      (module) => module.status === "planned"
    ).length,
    development: modules.filter(
      (module) => module.status === "development"
    ).length,
    testing: modules.filter(
      (module) => module.status === "testing"
    ).length,
    disabled: modules.filter(
      (module) => module.status === "disabled"
    ).length
  });
}
