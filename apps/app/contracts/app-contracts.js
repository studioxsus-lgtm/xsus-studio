/**
 * XSUS Studio — XSUS App Contracts
 * Version: 1.0.0
 *
 * Kontratat zyrtare të komunikimit për XSUS App Engine.
 */

export const XSUS_APP_CONTRACT_VERSION = "1.0.0";

export const APP_REQUEST_TYPES = Object.freeze([
  "architecture",
  "code-generation",
  "frontend",
  "backend",
  "database",
  "api",
  "debugging",
  "testing",
  "export"
]);

export const APP_PLATFORMS = Object.freeze([
  "web",
  "android",
  "ios",
  "desktop"
]);

export const APP_ERROR_CODES = Object.freeze([
  "INVALID_REQUEST",
  "PROMPT_TOO_LONG",
  "UNSUPPORTED_PLATFORM",
  "ARCHITECT_NOT_CONFIGURED",
  "ARCHITECTURE_FAILED",
  "APP_ENGINE_FAILURE",
  "GENERATION_FAILED",
  "VALIDATION_FAILED",
  "EXPORT_FAILED"
]);

export function createAppRequest({
  type,
  prompt,
  platform = "web",
  language = "auto",
  projectId = null,
  requirements = []
} = {}) {
  if (!APP_REQUEST_TYPES.includes(type)) {
    throw new TypeError("Lloji i kërkesës nuk mbështetet.");
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new TypeError("Përshkrimi i kërkesës është i pavlefshëm.");
  }

  if (!APP_PLATFORMS.includes(platform)) {
    throw new TypeError("Platforma e kërkuar nuk mbështetet.");
  }

  if (!Array.isArray(requirements)) {
    throw new TypeError("Kërkesat duhet të jenë listë.");
  }

  return Object.freeze({
    contractVersion: XSUS_APP_CONTRACT_VERSION,
    type,
    prompt: prompt.trim(),
    platform,
    language,
    projectId,
    requirements: Object.freeze([...requirements])
  });
}

export function createAppResponse({
  success,
  requestId = null,
  projectId = null,
  data = null,
  error = null
} = {}) {
  if (typeof success !== "boolean") {
    throw new TypeError("Statusi success duhet të jetë boolean.");
  }

  if (success && error !== null) {
    throw new TypeError("Përgjigjja e suksesshme nuk mund të ketë gabim.");
  }

  if (!success && !error) {
    throw new TypeError("Përgjigjja e dështuar duhet të ketë gabim.");
  }

  return Object.freeze({
    contractVersion: XSUS_APP_CONTRACT_VERSION,
    success,
    requestId,
    projectId,
    data,
    error
  });
}

export function isAppRequest(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    value.contractVersion === XSUS_APP_CONTRACT_VERSION &&
    APP_REQUEST_TYPES.includes(value.type) &&
    typeof value.prompt === "string" &&
    APP_PLATFORMS.includes(value.platform) &&
    Array.isArray(value.requirements)
  );
}

export function isAppResponse(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    value.contractVersion === XSUS_APP_CONTRACT_VERSION &&
    typeof value.success === "boolean" &&
    (value.success ? value.error === null : Boolean(value.error))
  );
}
