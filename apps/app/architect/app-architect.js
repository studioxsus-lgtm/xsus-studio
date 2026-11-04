/**

* XSUS Studio — XSUS App Architect
* Version: 1.1.0
* 
* Moduli i projektimit të arkitekturës së aplikacioneve.
* I pavarur nga XSUS AI Core.
* 
* Dallon platformën e ekzekutimit nga lloji
* i arkitekturës së aplikacionit.
  */

export const APP_ARCHITECT_VERSION = "1.1.0";

export const APP_ARCHITECT_TYPES = Object.freeze([
"web",
"mobile",
"desktop",
"fullstack"
]);

export const APP_ARCHITECT_PLATFORMS = Object.freeze([
"web",
"android",
"ios",
"desktop"
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

const PLATFORM_ARCHITECTURE_TYPES = Object.freeze({
web: "web",
android: "mobile",
ios: "mobile",
desktop: "desktop"
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
architectureType = null,
language = "auto",
requirements = []
} = request;

if (typeof prompt !== "string" || !prompt.trim()) {
throw new TypeError("Përshkrimi i aplikacionit është i pavlefshëm.");
}

if (!APP_ARCHITECT_PLATFORMS.includes(platform)) {
throw new TypeError("Platforma e aplikacionit nuk mbështetet.");
}

if (
architectureType !== null &&
!APP_ARCHITECT_TYPES.includes(architectureType)
) {
throw new TypeError("Lloji i arkitekturës nuk mbështetet.");
}

if (typeof language !== "string" || !language.trim()) {
throw new TypeError("Gjuha e aplikacionit është e pavlefshme.");
}

if (!Array.isArray(requirements)) {
throw new TypeError("Kërkesat duhet të jenë listë.");
}

const resolvedArchitectureType =
architectureType || PLATFORM_ARCHITECTURE_TYPES[platform];

const normalizedRequirements =
normalizeRequirements(requirements);

const stack = DEFAULT_STACKS[resolvedArchitectureType];

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
language: language.trim()
},
architecture: {
type: resolvedArchitectureType,
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
platforms: APP_ARCHITECT_PLATFORMS,
layers: APP_ARCHITECT_LAYERS
});
}
