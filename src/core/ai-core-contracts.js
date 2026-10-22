
/**
 * XSUS AI Core — Contracts
 * Version: 1.1.0
 *
 * Kontrata standarde për kërkesat, përgjigjet dhe gabimet.
 *
 * Përgjegjësitë:
 * - Validimi i kërkesave dhe përgjigjeve.
 * - Normalizimi i gjuhëve dhe kodeve rajonale.
 * - Standardizimi i gabimeve.
 * - Izolimi i të dhënave të hyrjes.
 * - Ruajtja e përputhshmërisë me modulet ekzistuese.
 */

import { normalizeLanguageCode } from "../language/normalization.js";

export const XSUS_CORE_VERSION = "1.1.0";

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

const DEFAULT_SOURCE = "xsus-ai-core";

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
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

/**
 * Krijon një kopje të izoluar të një objekti të thjeshtë.
 * Nuk lejon që gabimet e kopjimit të përhapen te motori.
 */
function normalizeObject(value, errorMessage) {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isPlainObject(value)) {
    throw new TypeError(errorMessage);
  }

  try {
    return { ...value };
  } catch {
    throw new TypeError(errorMessage);
  }
}

function normalizeLanguageOrThrow(language, errorMessage) {
  if (typeof language !== "string" || !language.trim()) {
    throw new TypeError(errorMessage);
  }

  const input = language.trim();

  if (input.toLowerCase() === "auto") {
    return "auto";
  }

  // Pranojmë vetëm vizën, jo nënvizën.
  if (input.includes("_")) {
    throw new TypeError(errorMessage);
  }

  const parts = input.split("-");
  const baseLanguage = parts[0].toLowerCase();

  if (!SUPPORTED_LANGUAGES.includes(baseLanguage)) {
    throw new TypeError(errorMessage);
  }

  // Verifikojmë përputhshmërinë me normalizuesin ekzistues.
  let normalizedBase;

  try {
    normalizedBase = normalizeLanguageCode(baseLanguage);
  } catch {
    throw new TypeError(errorMessage);
  }

  if (
    typeof normalizedBase !== "string" ||
    normalizedBase.trim().toLowerCase() !== baseLanguage
  ) {
    throw new TypeError(errorMessage);
  }

  if (parts.length === 1) {
    return baseLanguage;
  }

  // Formati rajonal: sq-AL, en-US, fr-FR.
  if (
    parts.length !== 2 ||
    !/^[a-zA-Z]{2}$/.test(parts[1])
  ) {
    throw new TypeError(errorMessage);
  }

  return `${baseLanguage}-${parts[1].toUpperCase()}`;
}

function createRequestId() {
  try {
    if (
      typeof globalThis.crypto?.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Përdorim alternativën nëse randomUUID nuk është i disponueshëm.
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

function validateInputObject(input, errorMessage) {
  if (!isPlainObject(input)) {
    throw new TypeError(errorMessage);
  }
}

/**
 * Krijon një kërkesë të standardizuar.
 */
export function createAIRequest(input = {}) {
  validateInputObject(
    input,
    "Kërkesa duhet të jetë një objekt i vlefshëm."
  );

  const {
    id = null,
    query,
    language = "auto",
    type = REQUEST_TYPES.CHAT,
    context = {},
    metadata = {},
  } = input;

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

  const normalizedContext = normalizeObject(
    context,
    "Konteksti i kërkesës nuk është i vlefshëm."
  );

  const normalizedMetadata = normalizeObject(
    metadata,
    "Metadata e kërkesës nuk është e vlefshme."
  );

  const normalizedId = normalizeRequestId(id);

  return {
    id: normalizedId || createRequestId(),
    query: query.trim(),
    language: normalizedLanguage,
    type,
    context: normalizedContext,
    metadata: normalizedMetadata,
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION,
  };
}

/**
 * Krijon një përgjigje normale të standardizuar.
 */
export function createAIResponse(input = {}) {
  validateInputObject(
    input,
    "Përgjigjja duhet të jetë një objekt i vlefshëm."
  );

  const {
    requestId = null,
    answer,
    language = "auto",
    source = "xsus-core",
    confidence = null,
    metadata = {},
  } = input;

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

  const normalizedMetadata = normalizeObject(
    metadata,
    "Metadata e përgjigjes nuk është e vlefshme."
  );

  return {
    requestId: normalizedId,
    answer: answer.trim(),
    language: normalizedLanguage,
    source: normalizeSource(source, "xsus-core"),
    confidence: normalizedConfidence,
    metadata: normalizedMetadata,
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION,
  };
}

/**
 * Krijon një përgjigje gabimi të standardizuar.
 */
export function createAIErrorResponse(input = {}) {
  validateInputObject(
    input,
    "Përgjigjja e gabimit duhet të jetë një objekt i vlefshëm."
  );

  const {
    requestId = null,
    error = DEFAULT_ERROR_MESSAGE,
    code = AI_ERROR_CODES.INTERNAL_ERROR,
    language = "auto",
    source = DEFAULT_SOURCE,
    metadata = {},
  } = input;

  const normalizedId = normalizeRequestId(requestId);

  const normalizedLanguage = normalizeLanguageOrThrow(
    language,
    "Gjuha e përgjigjes nuk është e vlefshme."
  );

  const normalizedMetadata = normalizeObject(
    metadata,
    "Metadata e gabimit nuk është e vlefshme."
  );

  const safeError =
    typeof error === "string" && error.trim()
      ? error.trim()
      : DEFAULT_ERROR_MESSAGE;

  return {
    requestId: normalizedId,
    answer: "",
    language: normalizedLanguage,
    source: normalizeSource(source, DEFAULT_SOURCE),
    confidence: null,
    metadata: {
      ...normalizedMetadata,
      errorCode: normalizeErrorCode(code),
      version: XSUS_CORE_VERSION,
    },
    error: safeError,
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION,
  };
}
