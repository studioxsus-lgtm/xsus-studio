/**
 * XSUS AI Core — Response Engine
 * Version: 1.3.0
 *
 * Përgjegjësitë:
 * - Standardizimi i përgjigjeve.
 * - Validimi dhe pastrimi i rezultateve.
 * - Deduplikimi i përmbajtjes.
 * - Mbështetja për sq, en dhe fr.
 * - Vlerësimi heuristik i mbështetjes nga burimet.
 * - Krijimi i metadata-s së përgjigjes.
 */

export const RESPONSE_ENGINE_VERSION = "1.3.0";

export const RESPONSE_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr",
]);

const FALLBACK_MESSAGES = Object.freeze({
  sq: "Nuk u gjetën informacione të mjaftueshme për t'iu përgjigjur pyetjes. Provo ta riformulosh ose të shtosh më shumë kontekst.",
  en: "Not enough information was found to answer the question. Please rephrase it or provide more context.",
  fr: "Les informations trouvées ne suffisent pas pour répondre à la question. Veuillez reformuler votre demande ou fournir davantage de contexte.",
});

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function normalizeLanguage(language) {
  if (
    typeof language !== "string" ||
    !language.trim()
  ) {
    return "sq";
  }

  const normalized = language
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .split("-")[0];

  return RESPONSE_LANGUAGES.includes(normalized)
    ? normalized
    : "sq";
}

function normalizeContent(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractContent(item) {
  if (typeof item === "string") {
    return normalizeContent(item);
  }

  if (!isPlainObject(item)) {
    return "";
  }

  const candidates = [
    item.content,
    item.answer,
    item.text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const content = normalizeContent(candidate);

    if (content) {
      return content;
    }
  }

  return "";
}

function extractSource(item) {
  if (!isPlainObject(item)) {
    return null;
  }

  const candidates = [
    item.source,
    isPlainObject(item.metadata)
      ? item.metadata.source
      : null,
    item.id,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return null;
}

function createResultKey(content) {
  return normalizeContent(content)
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeIdentifier(value, maxLength = 200) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

/**
 * Pastron, standardizon dhe deduplikon rezultatet.
 * Rendi origjinal i rezultateve ruhet.
 */
export function normalizeResponseResults(results = []) {
  if (!Array.isArray(results)) {
    return [];
  }

  const seen = new Set();
  const normalizedResults = [];

  for (const item of results) {
    const content = extractContent(item);

    if (!content) {
      continue;
    }

    const key = createResultKey(content);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);

    normalizedResults.push({
      content,
      source: extractSource(item),
    });
  }

  return normalizedResults;
}

/**
 * Llogarit një tregues heuristik të mbështetjes
 * së përgjigjes nga rezultatet e disponueshme.
 *
 * Ky tregues nuk është probabilitet i kalibruar
 * dhe nuk garanton vërtetësinë e përmbajtjes.
 */
export function calculateResponseConfidence(results = []) {
  const normalized = normalizeResponseResults(results);

  if (normalized.length === 0) {
    return 0;
  }

  const sourcedCount = normalized.filter(
    item => Boolean(item.source)
  ).length;

  const resultScore = Math.min(
    normalized.length / 3,
    1
  );

  const sourceScore =
    sourcedCount / normalized.length;

  const confidence =
    (resultScore * 0.6) +
    (sourceScore * 0.4);

  return Math.round(confidence * 100) / 100;
}

/**
 * Krijon metadata standarde për përgjigjen.
 */
export function createResponseMetadata({
  language = "sq",
  results = [],
  requestId = null,
  conversationId = null,
} = {}) {
  const normalizedLanguage = normalizeLanguage(language);

  const normalizedResults =
    normalizeResponseResults(results);

  const sources = [
    ...new Set(
      normalizedResults
        .map(item => item.source)
        .filter(Boolean)
    ),
  ];

  return {
    engine: "xsus-response-engine",
    version: RESPONSE_ENGINE_VERSION,
    language: normalizedLanguage,
    requestId: normalizeIdentifier(requestId),
    conversationId: normalizeIdentifier(conversationId),
    resultCount: normalizedResults.length,
    sources,
  };
}

/**
 * Krijon përgjigjen përfundimtare të standardizuar.
 */
export function createResponse({
  results = [],
  language = "sq",
  requestId = null,
  conversationId = null,
} = {}) {
  const normalizedLanguage = normalizeLanguage(language);

  const normalizedResults =
    normalizeResponseResults(results);

  const success = normalizedResults.length > 0;

  const answer = success
    ? normalizedResults
        .map(item => item.content)
        .join("\n\n")
    : FALLBACK_MESSAGES[normalizedLanguage];

  const confidence =
    calculateResponseConfidence(normalizedResults);

  const metadata = createResponseMetadata({
    language: normalizedLanguage,
    results: normalizedResults,
    requestId,
    conversationId,
  });

  return {
    answer,
    language: normalizedLanguage,
    confidence,
    source: "xsus-response-engine",
    version: RESPONSE_ENGINE_VERSION,
    metadata,
    success,
  };
}

/**
 * Kthen përgjigjen rezervë për gjuhën e kërkuar.
 */
export function getFallbackResponse(language = "sq") {
  const normalizedLanguage = normalizeLanguage(language);

  return {
    answer: FALLBACK_MESSAGES[normalizedLanguage],
    language: normalizedLanguage,
    confidence: 0,
    source: "xsus-response-engine",
    version: RESPONSE_ENGINE_VERSION,
    metadata: createResponseMetadata({
      language: normalizedLanguage,
    }),
    success: false,
  };
}

export default createResponse;
