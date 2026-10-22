
/**
 * XSUS AI Core — Request Context
 * Version: 1.4.0
 *
 * Përgjegjësitë:
 * - Normalizimi i kontekstit të kërkesës.
 * - Validimi i identifikuesit, pyetjes dhe gjuhës.
 * - Kontrolli dhe kufizimi i metadata-s.
 * - Krijimi i një konteksti të pandryshueshëm.
 * - Ruajtja e përputhshmërisë me AI Core.
 */

import { SUPPORTED_LANGUAGES } from "./ai-core-contracts.js";

export const REQUEST_CONTEXT_VERSION = "1.4.0";

export const MAX_REQUEST_ID_LENGTH = 128;
export const MAX_REQUEST_QUERY_LENGTH = 8000;
export const MAX_MODULE_NAME_LENGTH = 100;
export const MAX_METADATA_ENTRIES = 50;
export const MAX_METADATA_KEY_LENGTH = 100;
export const MAX_METADATA_STRING_LENGTH = 2000;
export const MAX_METADATA_TOTAL_STRING_LENGTH = 8000;

const ALLOWED_METADATA_VALUE_TYPES = new Set([
  "string",
  "number",
  "boolean",
]);

const RESERVED_METADATA_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  try {
    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  } catch {
    return false;
  }
}

function normalizeString(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
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
  if (!isPlainObject(metadata)) {
    return Object.freeze({});
  }

  let entries;

  try {
    entries = Object.entries(metadata).slice(
      0,
      MAX_METADATA_ENTRIES
    );
  } catch {
    return Object.freeze({});
  }

  const normalized = Object.create(null);
  let totalStringLength = 0;
  let acceptedEntries = 0;

  for (const [key, value] of entries) {
    const normalizedKey = normalizeString(key);

    if (
      !normalizedKey ||
      normalizedKey.length > MAX_METADATA_KEY_LENGTH ||
      RESERVED_METADATA_KEYS.has(normalizedKey)
    ) {
      continue;
    }

    if (
      value !== null &&
      !ALLOWED_METADATA_VALUE_TYPES.has(typeof value)
    ) {
      continue;
    }

    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      continue;
    }

    if (
      typeof value === "string" &&
      value.length > MAX_METADATA_STRING_LENGTH
    ) {
      continue;
    }

    const stringLength =
      typeof value === "string" ? value.length : 0;

    if (
      totalStringLength + stringLength >
      MAX_METADATA_TOTAL_STRING_LENGTH
    ) {
      continue;
    }

    normalized[normalizedKey] = value;
    totalStringLength += stringLength;
    acceptedEntries += 1;

    if (acceptedEntries >= MAX_METADATA_ENTRIES) {
      break;
    }
  }

  return Object.freeze(normalized);
}

/**
 * Krijon një kontekst të normalizuar.
 *
 * Vlerat e pavlefshme normalizohen në vlera bosh
 * dhe refuzohen nga isValidRequestContext().
 */
export function createRequestContext(input = {}) {
  const source = isPlainObject(input) ? input : {};

  const id = normalizeString(source.id).slice(
    0,
    MAX_REQUEST_ID_LENGTH
  );

  const query = normalizeString(source.query).slice(
    0,
    MAX_REQUEST_QUERY_LENGTH
  );

  const language = normalizeLanguageCode(
    source.language
  );

  const moduleInput =
    source.moduleName === undefined ||
    source.moduleName === null ||
    source.moduleName === ""
      ? "xsus-ai"
      : source.moduleName;

  const moduleName = normalizeString(
    moduleInput
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
 * Kontrollon nëse konteksti plotëson kontratën.
 */
export function isValidRequestContext(context) {
  if (!isPlainObject(context)) {
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

  if (!isPlainObject(context.metadata)) {
    return false;
  }

  let entries;

  try {
    entries = Object.entries(context.metadata);
  } catch {
    return false;
  }

  if (entries.length > MAX_METADATA_ENTRIES) {
    return false;
  }

  let totalStringLength = 0;

  for (const [key, value] of entries) {
    if (
      !key.trim() ||
      key.length > MAX_METADATA_KEY_LENGTH ||
      RESERVED_METADATA_KEYS.has(key)
    ) {
      return false;
    }

    if (
      value !== null &&
      !ALLOWED_METADATA_VALUE_TYPES.has(typeof value)
    ) {
      return false;
    }

    if (
      typeof value === "number" &&
      !Number.isFinite(value)
    ) {
      return false;
    }

    if (
      typeof value === "string" &&
      value.length > MAX_METADATA_STRING_LENGTH
    ) {
      return false;
    }

    if (typeof value === "string") {
      totalStringLength += value.length;
    }

    if (
      totalStringLength >
      MAX_METADATA_TOTAL_STRING_LENGTH
    ) {
      return false;
    }
  }

  return true;
}
