
/**
 * XSUS AI Core — Contracts
 * Version: 1.0.0
 *
 * Kontrata standarde për kërkesat, përgjigjet dhe gabimet.
 *
 * Përgjegjësitë:
 * - Validimi i kërkesave.
 * - Standardizimi i përgjigjeve.
 * - Normalizimi i gjuhëve dhe kodeve rajonale.
 * - Standardizimi i gabimeve.
 * - Përputhshmëria me modulet ekzistuese.
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

const DEFAULT_ERROR_MESSAGE =
  "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.";

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

/**
 * Normalizon gjuhën dhe ruan kodin rajonal.
 *
 * Shembuj:
 * sq       -> sq
 * sq-AL    -> sq-AL
 * en-us    -> en-US
 * fr_fr    -> fr-FR
 * auto     -> auto
 *
 * Pranon vetëm gjuhët bazë të mbështetura.
 */
function normalizeLanguageOrThrow(language, errorMessage) {
  if (typeof language !== "string" || !language.trim()) {
    throw new TypeError(errorMessage);
  }

  const input = language.trim();

  if (input.toLowerCase() === "auto") {
    return "auto";
  }

  // Normalizuesi ekzistues mund t'i kthejë kodet rajonale
  // në kode bazë. Prandaj ruajmë edhe formën origjinale.
  const normalized = normalizeLanguageCode(input);

  if (typeof normalized !== "string" || !normalized.trim()) {
    throw new TypeError(errorMessage);
  }

  const normalizedInput = input.replace(/_/g, "-");
  const parts = normalizedInput.split("-");

  const baseLanguage = parts[0].toLowerCase();

  if (!SUPPORTED_LANGUAGES.includes(baseLanguage)) {
    throw new TypeError(errorMessage);
  }

  // Lejohet kodi bazë, p.sh. "en".
  if (parts.length === 1) {
    return baseLanguage;
  }

  // Për këtë kontratë mbështesim kodin bazë plus rajonin,
  // p.sh. en-US, fr-FR dhe sq-AL.
  if (
    parts.length !== 2 ||
    !/^[a-zA-Z]{2}$/.test(parts[1])
  ) {
    throw new TypeError(errorMessage);
  }

  return `${baseLanguage}-${parts[1].toUpperCase()}`;
}

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
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

function normalizeSource(source, fallback) {
  return typeof source === "string" && source.trim()
    ? source.trim()
    : fallback;
}

function normalizeConfidence(confidence) {
  if (confidence === null || confidence === undefined) {
    return null;
  }

  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new TypeError(
      "Confidence duhet të jetë numër nga 0 deri në 1."
    );
  }

  return confidence;
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

  if (
    context !== undefined &&
    context !== null &&
    !isPlainObject(context)
  ) {
    throw new TypeError(
      "Konteksti i kërkesës nuk është i vlefshëm."
    );
  }

  if (
    metadata !== undefined &&
    metadata !== null &&
    !isPlainObject(metadata)
  ) {
    throw new TypeError(
      "Metadata e kërkesës nuk është e vlefshme."
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

  const normalizedId = normalizeRequestId(requestId);
  const normalizedConfidence = normalizeConfidence(confidence);

  if (
    metadata !== undefined &&
    metadata !== null &&
    !isPlainObject(metadata)
  ) {
    throw new TypeError(
      "Metadata e përgjigjes nuk është e vlefshme."
    );
  }

  return {
    requestId: normalizedId,
    answer: answer.trim(),
    language: normalizedLanguage,
    source: normalizeSource(source, "xsus-core"),
    confidence: normalizedConfidence,
    metadata: normalizeObject(metadata),
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION,
  };
}

/**
 * Krijon një përgjigje gabimi të standardizuar.
 */
export function createAIErrorResponse({
  requestId = null,
  error = DEFAULT_ERROR_MESSAGE,
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
      : DEFAULT_ERROR_MESSAGE;

  return {
    requestId: normalizedId,
    answer: "",
    language: normalizedLanguage,
    source: normalizeSource(source, "xsus-ai-core"),
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
