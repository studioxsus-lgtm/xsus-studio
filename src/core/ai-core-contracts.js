import { normalizeLanguageCode } from "../language/normalization.js";

export const XSUS_CORE_VERSION = "1.0.0";

export const SUPPORTED_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr"
]);

export const REQUEST_TYPES = Object.freeze({
  CHAT: "chat",
  KNOWLEDGE: "knowledge",
  TOOL: "tool",
  SYSTEM: "system"
});

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function normalizeObject(value) {
  return isPlainObject(value) ? { ...value } : {};
}

function normalizeLanguageOrThrow(language, errorMessage) {
  if (typeof language !== "string") {
    throw new TypeError(errorMessage);
  }

  const normalizedInput = language.trim();

  if (!normalizedInput) {
    throw new TypeError(errorMessage);
  }

  const normalizedLanguage = normalizeLanguageCode(normalizedInput);

  if (
    normalizedLanguage === "auto" &&
    normalizedInput.toLowerCase() !== "auto"
  ) {
    throw new TypeError(errorMessage);
  }

  return normalizedLanguage;
}

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `xsus-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createAIRequest({
  id = null,
  query,
  language = "auto",
  type = REQUEST_TYPES.CHAT,
  context = {},
  metadata = {}
} = {}) {
  if (typeof query !== "string" || !query.trim()) {
    throw new TypeError("Query duhet të jetë tekst jo bosh.");
  }

  const normalizedLanguage = normalizeLanguageOrThrow(
    language,
    "Gjuha nuk është e vlefshme."
  );

  if (!Object.values(REQUEST_TYPES).includes(type)) {
    throw new TypeError("Lloji i kërkesës nuk njihet.");
  }

  if (
    id !== null &&
    (typeof id !== "string" || !id.trim())
  ) {
    throw new TypeError(
      "ID-ja e kërkesës nuk është e vlefshme."
    );
  }

  return {
    id: id?.trim() || createRequestId(),
    query: query.trim(),
    language: normalizedLanguage,
    type,
    context: normalizeObject(context),
    metadata: normalizeObject(metadata),
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION
  };
}

export function createAIResponse({
  requestId = null,
  answer,
  language = "auto",
  source = "xsus-core",
  confidence = null,
  metadata = {}
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

  if (
    requestId !== null &&
    (typeof requestId !== "string" || !requestId.trim())
  ) {
    throw new TypeError(
      "ID-ja e përgjigjes nuk është e vlefshme."
    );
  }

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
    requestId: requestId?.trim() || null,
    answer: answer.trim(),
    language: normalizedLanguage,
    source: source.trim(),
    confidence,
    metadata: normalizeObject(metadata),
    timestamp: new Date().toISOString(),
    version: XSUS_CORE_VERSION
  };
}
