
/**
 * XSUS AI Core — Request Context
 * Version: 1.3.0
 *
 * Përgjegjësitë:
 * - Normalizimi i kontekstit të kërkesës.
 * - Validimi i identifikuesit, pyetjes dhe gjuhës.
 * - Kontrolli i metadata-s.
 * - Krijimi i një konteksti të pandryshueshëm.
 * - Ruajtja e përputhshmërisë me AI Core.
 */

import { SUPPORTED_LANGUAGES } from "./ai-core-contracts.js";

export const REQUEST_CONTEXT_VERSION = "1.3.0";

export const MAX_REQUEST_ID_LENGTH = 128;
export const MAX_REQUEST_QUERY_LENGTH = 8000;
export const MAX_MODULE_NAME_LENGTH = 100;
export const MAX_METADATA_ENTRIES = 50;

const ALLOWED_METADATA_VALUE_TYPES = new Set([
  "string",
  "number",
  "boolean",
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLanguageCode(value) {
  const language = normalizeString(value)
    .toLowerCase()
    .replace(/_/g, "-")
    .split("-")[0];

  return SUPPORTED_LANGUAGES.includes(language)
    ? language
    : "";
}

function normalizeMetadata(metadata) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return Object.freeze({});
  }

  const entries = Object.entries(metadata).slice(
    0,
    MAX_METADATA_ENTRIES
  );

  const normalized = {};

  for (const [key, value] of entries) {
    const normalizedKey = normalizeString(key);

    if (!normalizedKey || normalizedKey.length > 100) {
      continue;
    }

    if (
      value === null ||
      ALLOWED_METADATA_VALUE_TYPES.has(typeof value)
    ) {
      if (
        typeof value !== "number" ||
        Number.isFinite(value)
      ) {
        normalized[normalizedKey] = value;
      }
    }
  }

  return Object.freeze(normalized);
}

/**
 * Krijon një kontekst të normalizuar.
 * Vlerat e pavlefshme mbeten bosh dhe refuzohen nga validimi.
 */
export function createRequestContext(input = {}) {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? input
      : {};

  const id = normalizeString(source.id).slice(
    0,
    MAX_REQUEST_ID_LENGTH
  );

  const query = normalizeString(source.query).slice(
    0,
    MAX_REQUEST_QUERY_LENGTH
  );

  const language = normalizeLanguageCode(source.language);

  const moduleName = normalizeString(
    source.moduleName || "xsus-ai"
  ).slice(0, MAX_MODULE_NAME_LENGTH);

  const metadata = normalizeMetadata(source.metadata);

  return Object.freeze({
    requestId: id,
    query,
    language,
    moduleName,
    metadata,
    version: REQUEST_CONTEXT_VERSION,
  });
}

/**
 * Kontrollon nëse konteksti plotëson kontratën bazë.
 */
export function isValidRequestContext(context) {
  if (
    !context ||
    typeof context !== "object" ||
    Array.isArray(context)
  ) {
    return false;
  }

  if (
    typeof context.requestId !== "string" ||
    !context.requestId.trim() ||
    context.requestId.length > MAX_REQUEST_ID_LENGTH
  ) {
    return false;
  }

  if (
    typeof context.query !== "string" ||
    !context.query.trim() ||
    context.query.length > MAX_REQUEST_QUERY_LENGTH
  ) {
    return false;
  }

  if (
    typeof context.language !== "string" ||
    !SUPPORTED_LANGUAGES.includes(context.language)
  ) {
    return false;
  }

  if (
    typeof context.moduleName !== "string" ||
    !context.moduleName.trim() ||
    context.moduleName.length > MAX_MODULE_NAME_LENGTH
  ) {
    return false;
  }

  if (
    !context.metadata ||
    typeof context.metadata !== "object" ||
    Array.isArray(context.metadata)
  ) {
    return false;
  }

  return true;
}
