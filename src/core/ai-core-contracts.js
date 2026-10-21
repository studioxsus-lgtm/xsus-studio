
/**
 * XSUS AI Core — Contracts
 * Version: 1.0.0
 *
 * Kontrata standarde për kërkesat, përgjigjet dhe gabimet.
 */

import { normalizeLanguageCode } from "../language/normalization.js";

export const XSUS_CORE_VERSION = "1.0.0";

export const SUPPORTED_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr",
]);

export const REQUEST_TYPES = Object.freeze({
  CHAT: "chat",
  KNOWLEDGE: "knowledge",
  TOOL: "tool",
  SYSTEM: "system",
});

export const AI_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_QUERY: "INVALID_QUERY",
  INVALID_LANGUAGE: "INVALID_LANGUAGE",
  INVALID_REQUEST_TYPE: "INVALID_REQUEST_TYPE",
  INVALID_CONTEXT: "INVALID_CONTEXT",
  KNOWLEDGE_SERVICE_ERROR: "KNOWLEDGE_SERVICE_ERROR",
  EMPTY_RESPONSE: "EMPTY_RESPONSE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function normalizeObject(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function normalizeLanguageOrThrow(
  language,
  errorMessage
) {
  if (typeof language !== "string") {
    throw new TypeError(errorMessage);
  }

  const normalizedInput = language.trim();

  if (!normalizedInput) {
    throw new TypeError(errorMessage);
  }

  const normalizedLanguage =
    normalizeLanguageCode(normalizedInput);

  if (
    normalizedLanguage === "auto" &&
    normalizedInput.toLowerCase() !== "auto"
  ) {
    throw new TypeError(errorMessage);
  }

  return normalizedLanguage;
}

function createRequestId() {
  if (
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `xsus-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeRequestId(id) {
  if (id === null || id === undefined) {
    return null;
  }

  if (typeof id !== "string" || !id.trim()) {
    throw new TypeError(
      "ID-ja e kërkesës nuk është e vlefshme."
    );
  }

  return id.trim();
}

function normalizeErrorCode(code) {
  return (
    typeof code === "string" &&
    Object.values(AI_ERROR_CODES).includes(code)
  )
    ? code
    : AI_ERROR_CODES.INTERNAL_ERROR;
}

/**
 * Krijon një kërkesë të standardizuar.
 */
export function createAIRequest({
  id = null,
  query,
  language = "auto",
  type = REQUEST_TYPES.CHAT,
  context = {},
  metadata = {},
} = {}) {
  if (typeof query !== "string" || !query.trim()) {
    throw new TypeError(
      "Query duhet të jetë tekst jo bosh."
    );
  }

  const normalizedLanguage = normalizeLanguageOrThrow(
    language,
    "Gjuha nuk është e vlefshme."
  );

  if (!Object.values(REQUEST_TYPES).includes(type)) {
    throw new TypeError(
      "Lloji i kërkesës nuk njihet."
    );
  }

  const normalizedId = normalizeRequestId(id);

  return {
    id: normalizedId || createRequestId(),
    query: query.trim(),
    language: normalizedLanguage,
    type,
    context: normalizeObject(context),
    metadata: normalizeObject(metadata),
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION,
  };
}

/**
 * Krijon një përgjigje normale të standardizuar.
 */
export function createAIResponse({
  requestId = null,
  answer,
  language = "auto",
  source = "xsus-core",
  confidence = null,
  metadata = {},
} = {}) {
  if (typeof answer !== "string" || !answer.trim()) {
    throw new TypeError(
      "Answer duhet të jetë tekst jo bosh."
    );
  }

  const normalizedLanguage = normalizeLanguageOrThrow(
    language,
    "Gjuha e përgjigjes nuk është e vlefshme."
  );

  if (typeof source !== "string" || !source.trim()) {
    throw new TypeError(
      "Burimi i përgjigjes nuk është i vlefshëm."
    );
  }

  const normalizedId = normalizeRequestId(requestId);

  if (
    confidence !== null &&
    (
      typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    )
  ) {
    throw new TypeError(
      "Confidence duhet të jetë numër nga 0 deri në 1."
    );
  }

  return {
    requestId: normalizedId,
    answer: answer.trim(),
    language: normalizedLanguage,
    source: source.trim(),
    confidence,
    metadata: normalizeObject(metadata),
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION,
  };
}

/**
 * Krijon një përgjigje gabimi të standardizuar.
 * Mesazhet publike nuk duhet të ekspozojnë detaje të brendshme.
 */
export function createAIErrorResponse({
  requestId = null,
  error = "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.",
  code = AI_ERROR_CODES.INTERNAL_ERROR,
  language = "auto",
  source = "xsus-ai-core",
  metadata = {},
} = {}) {
  const normalizedId = normalizeRequestId(requestId);

  const normalizedLanguage = normalizeLanguageOrThrow(
    language,
    "Gjuha e përgjigjes nuk është e vlefshme."
  );

  const safeError =
    typeof error === "string" && error.trim()
      ? error.trim()
      : "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.";

  const safeSource =
    typeof source === "string" && source.trim()
      ? source.trim()
      : "xsus-ai-core";

  return {
    requestId: normalizedId,
    answer: "",
    language: normalizedLanguage,
    source: safeSource,
    confidence: null,
    metadata: {
      ...normalizeObject(metadata),
      errorCode: normalizeErrorCode(code),
      version: XSUS_CORE_VERSION,
    },
    error: safeError,
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION,
  };
}
