/**
 * XSUS AI Core — Response Quality Engine
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Vlerësimi i plotësisë së përgjigjes.
 * - Vlerësimi i qartësisë.
 * - Vlerësimi i përputhjes së gjuhës.
 * - Vlerësimi i burimeve.
 * - Kthimi i rezultateve të standardizuara.
 *
 * Parime:
 * - Mos pretendo siguri kur mungojnë prova.
 * - Ruaj strukturën publike të rezultateve.
 * - Mos lejo dështimin e verifikuesit të prishë vlerësimin.
 */

import { verifyResponseLanguage } from "./response-language-verifier.js";

export const RESPONSE_QUALITY_VERSION = "1.1.0";

export const RESPONSE_QUALITY_DIMENSIONS = Object.freeze([
  "completeness",
  "clarity",
  "language",
  "sources"
]);

const SUPPORTED_LANGUAGES = new Set([
  "sq",
  "en",
  "fr",
  "de",
  "es",
  "it",
  "pt",
  "nl",
  "ar",
  "zh",
  "ja",
  "ko"
]);

const COMPLETENESS_THRESHOLDS = Object.freeze({
  short: 20,
  medium: 80,
  long: 240
});

const CLARITY_LIMITS = Object.freeze({
  minimumWords: 4,
  maximumCharacters: 12000,
  maximumAverageWordLength: 30
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLanguage(value) {
  const language = normalizeString(value).toLowerCase();

  if (!language) {
    return null;
  }

  const baseLanguage = language.split(/[-_]/)[0];

  return SUPPORTED_LANGUAGES.has(baseLanguage)
    ? baseLanguage
    : null;
}

function normalizeSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources.filter((source) => {
    if (typeof source === "string") {
      return source.trim().length > 0;
    }

    if (
      source === null ||
      typeof source !== "object" ||
      Array.isArray(source)
    ) {
      return false;
    }

    return [
      source.id,
      source.title,
      source.url,
      source.content
    ].some(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0
    );
  });
}

function calculateCompleteness(query, answer) {
  if (!query || !answer) {
    return 0;
  }

  const answerLength = answer.length;

  if (answerLength < COMPLETENESS_THRESHOLDS.short) {
    return 25;
  }

  if (answerLength < COMPLETENESS_THRESHOLDS.medium) {
    return 60;
  }

  if (answerLength < COMPLETENESS_THRESHOLDS.long) {
    return 80;
  }

  return 100;
}

function calculateClarity(answer) {
  if (!answer) {
    return 0;
  }

  const words = answer.split(/\s+/).filter(Boolean);

  if (words.length < CLARITY_LIMITS.minimumWords) {
    return 35;
  }

  if (answer.length > CLARITY_LIMITS.maximumCharacters) {
    return 50;
  }

  const averageWordLength =
    answer.replace(/\s+/g, "").length / words.length;

  if (
    averageWordLength >
    CLARITY_LIMITS.maximumAverageWordLength
  ) {
    return 50;
  }

  const paragraphs = answer
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  // Një përgjigje e gjatë dhe e ndarë në paragrafë
  // mund të jetë më e lehtë për t'u lexuar.
  if (answer.length >= 600 && paragraphs.length > 1) {
    return 100;
  }

  if (answer.length >= 600 && paragraphs.length === 1) {
    return 80;
  }

  return 100;
}

/**
 * Vlerëson përputhjen e gjuhës.
 *
 * 100  = përputhje e konfirmuar.
 * 0    = mospërputhje e konfirmuar.
 * null = prova të pamjaftueshme.
 */
function calculateLanguage(
  requestedLanguage,
  responseLanguage,
  verification
) {
  if (!requestedLanguage || !responseLanguage) {
    return null;
  }

  if (requestedLanguage !== responseLanguage) {
    return 0;
  }

  if (!verification || typeof verification !== "object") {
    return null;
  }

  if (
    verification.matches === true ||
    verification.status === "match"
  ) {
    return 100;
  }

  if (
    verification.matches === false ||
    verification.status === "mismatch"
  ) {
    return 0;
  }

  return null;
}

function calculateSourceScore(sources) {
  return sources.length > 0 ? 100 : 50;
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

function verifyLanguageSafely(answer, requestedLanguage) {
  if (!answer || !requestedLanguage) {
    return null;
  }

  try {
    const result = verifyResponseLanguage({
      text: answer,
      requestedLanguage
    });

    if (!result || typeof result !== "object") {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}

function calculateOverallScore(dimensions) {
  const applicableScores = Object.values(dimensions).filter(
    (value) =>
      typeof value === "number" &&
      Number.isFinite(value)
  );

  if (applicableScores.length === 0) {
    return 0;
  }

  const total = applicableScores.reduce(
    (sum, value) => sum + value,
    0
  );

  return roundScore(total / applicableScores.length);
}

export function evaluateResponseQuality(input = {}) {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "Të dhënat e vlerësimit duhet të jenë objekt."
    );
  }

  const query = normalizeString(input.query);
  const answer = normalizeString(input.answer);

  const requestedLanguage = normalizeLanguage(
    input.requestedLanguage
  );

  const responseLanguage = normalizeLanguage(
    input.responseLanguage
  );

  const sources = normalizeSources(input.sources);
  const errors = [];

  if (!query) {
    errors.push("EMPTY_QUERY");
  }

  if (!answer) {
    errors.push("EMPTY_ANSWER");
  }

  if (
    input.requestedLanguage !== undefined &&
    !requestedLanguage
  ) {
    errors.push("UNSUPPORTED_REQUESTED_LANGUAGE");
  }

  if (
    input.responseLanguage !== undefined &&
    !responseLanguage
  ) {
    errors.push("UNSUPPORTED_RESPONSE_LANGUAGE");
  }

  const languageVerification = verifyLanguageSafely(
    answer,
    requestedLanguage
  );

  const dimensions = {
    completeness: calculateCompleteness(query, answer),
    clarity: calculateClarity(answer),
    language: calculateLanguage(
      requestedLanguage,
      responseLanguage,
      languageVerification
    ),
    sources: calculateSourceScore(sources)
  };

  const score = calculateOverallScore(dimensions);
  const valid = errors.length === 0;

  return Object.freeze({
    version: RESPONSE_QUALITY_VERSION,
    valid,
    score,
    dimensions: Object.freeze(dimensions),
    sourceCount: sources.length,
    languageVerification,
    errors: Object.freeze(errors)
  });
}
