/**
 * XSUS Studio — XSUS App Architect
 * Version: 1.0.0
 *
 * Moduli i projektimit të arkitekturës së aplikacioneve.
 * I pavarur nga XSUS AI Core.
 */

export const APP_ARCHITECT_VERSION = "1.0.0";

export const APP_ARCHITECT_TYPES = Object.freeze([
  "web",
  "mobile",
  "desktop",
  "fullstack"
]);

export const APP_ARCHITECT_LAYERS = Object.freeze([
  "frontend",
  "backend",
  "database",
  "api",
  "authentication",
  "security",
  "testing",
  "deployment"
]);

const DEFAULT_STACKS = Object.freeze({
  web: {
    frontend: ["HTML", "CSS", "JavaScript", "TypeScript"],
    backend: ["Node.js"],
    database: ["PostgreSQL"],
    api: ["REST"]
  },
  mobile: {
    frontend: ["React Native", "TypeScript"],
    backend: ["Node.js"],
    database: ["PostgreSQL"],
    api: ["REST"]
  },
  desktop: {
    frontend: ["Electron", "TypeScript"],
    backend: ["Node.js"],
    database: ["SQLite"],
    api: ["REST"]
  },
  fullstack: {
    frontend: ["React", "TypeScript"],
    backend: ["Node.js"],
    database: ["PostgreSQL"],
    api: ["REST"]
  }
});

function normalizeRequirements(requirements) {
  return requirements
    .filter(item => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean);
}

export function createAppArchitecture(request = {}) {
  const {
    prompt = "",
    platform = "web",
    language = "auto",
    requirements = []
  } = request;

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new TypeError("Përshkrimi i aplikacionit është i pavlefshëm.");
  }

  if (!APP_ARCHITECT_TYPES.includes(platform)) {
    throw new TypeError("Lloji i aplikacionit nuk mbështetet.");
  }

  if (!Array.isArray(requirements)) {
    throw new TypeError("Kërkesat duhet të jenë listë.");
  }

  const normalizedRequirements =
    normalizeRequirements(requirements);

  const stack = DEFAULT_STACKS[platform];

  const layers = APP_ARCHITECT_LAYERS.map(layer => ({
    name: layer,
    technologies: stack[layer] || [],
    status: "planned"
  }));

  return Object.freeze({
    architectVersion: APP_ARCHITECT_VERSION,
    project: {
      name: "XSUS Generated Application",
      description: prompt.trim(),
      platform,
      language
    },
    architecture: {
      type: platform,
      layers,
      stack
    },
    requirements: normalizedRequirements,
    metadata: {
      generatedBy: "XSUS App Architect",
      status: "architecture-draft",
      requiresValidation: true
    }
  });
}

export function getAppArchitectCapabilities() {
  return Object.freeze({
    version: APP_ARCHITECT_VERSION,
    types: APP_ARCHITECT_TYPES,
    layers: APP_ARCHITECT_LAYERS
  });
}
