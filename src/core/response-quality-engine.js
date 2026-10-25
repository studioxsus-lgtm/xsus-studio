/**
 * XSUS AI Core — Response Quality Engine
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Vlerësimi bazë i strukturës së përgjigjeve.
 * - Kontrolli i pyetjes dhe përgjigjes.
 * - Verifikimi heuristik i gjuhës së përgjigjes.
 * - Vlerësimi i burimeve të përgjigjes.
 * - Gjenerimi i rezultateve të matshme.
 *
 * Ky modul nuk pretendon të verifikojë të vërtetën
 * faktike të një përgjigjeje.
 */

import {
  verifyResponseLanguage,
} from "./response-language-verifier.js";

export const RESPONSE_QUALITY_VERSION = "1.0.0";

export const RESPONSE_QUALITY_DIMENSIONS = Object.freeze([
  "completeness",
  "clarity",
  "language",
  "sources",
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
  "ko",
]);

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
      source.content,
    ].some(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0,
    );
  });
}

function calculateCompleteness(query, answer) {
  if (!query || !answer) {
    return 0;
  }

  if (answer.length < 20) {
    return 25;
  }

  if (answer.length < 80) {
    return 60;
  }

  return 100;
}

function calculateClarity(answer) {
  if (!answer) {
    return 0;
  }

  const words = answer.split(/\s+/).filter(Boolean);

  if (words.length < 4) {
    return 35;
  }

  if (answer.length > 12000) {
    return 50;
  }

  return 100;
}

function calculateLanguage(
  requestedLanguage,
  responseLanguage,
  verification,
) {
  if (!requestedLanguage || !responseLanguage) {
    return null;
  }

  // Kodet e gjuhëve duhet të përputhen fillimisht.
  if (requestedLanguage !== responseLanguage) {
    return 0;
  }

  // Nëse nuk ka tekst të mjaftueshëm ose verifikimi
  // nuk mund të japë përfundim, ruajmë rezultatin bazë.
  if (
    !verification ||
    verification.status === "unknown" ||
    verification.status === "insufficient_text" ||
    verification.status === "unsupported_language"
  ) {
    return 100;
  }

  if (verification.matches === true) {
    return 100;
  }

  if (verification.matches === false) {
    return 0;
  }

  // Nëse verifikuesi përdor statusin "match".
  if (verification.status === "match") {
    return 100;
  }

  // Nëse përdor statusin "mismatch".
  if (verification.status === "mismatch") {
    return 0;
  }

  return 100;
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
    return verifyResponseLanguage({
      text: answer,
      requestedLanguage,
    });
  } catch {
    // Gabimi i verifikuesit nuk duhet ta ndërpresë
    // vlerësimin e përgjithshëm të përgjigjes.
    return null;
  }
}

/**
 * Vlerëson cilësinë bazë të një përgjigjeje.
 *
 * @param {object} input
 * @param {string} input.query
 * @param {string} input.answer
 * @param {string} [input.requestedLanguage]
 * @param {string} [input.responseLanguage]
 * @param {Array} [input.sources]
 * @returns {object}
 */
export function evaluateResponseQuality(input = {}) {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw new TypeError(
      "Të dhënat e vlerësimit duhet të jenë objekt.",
    );
  }

  const query = normalizeString(input.query);
  const answer = normalizeString(input.answer);

  const requestedLanguage = normalizeLanguage(
    input.requestedLanguage,
  );

  const responseLanguage = normalizeLanguage(
    input.responseLanguage,
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
    requestedLanguage,
  );

  const languageScore = calculateLanguage(
    requestedLanguage,
    responseLanguage,
    languageVerification,
  );

  const dimensions = {
    completeness: calculateCompleteness(query, answer),
    clarity: calculateClarity(answer),
    language: languageScore,
    sources: calculateSourceScore(sources),
  };

  const applicableScores = Object.values(dimensions)
    .filter((value) => value !== null);

  const score = applicableScores.length > 0
    ? roundScore(
        applicableScores.reduce(
          (total, value) => total + value,
          0,
        ) / applicableScores.length,
      )
    : 0;

  const valid = errors.length === 0;

  return Object.freeze({
    version: RESPONSE_QUALITY_VERSION,
    valid,
    score,
    dimensions: Object.freeze(dimensions),
    sourceCount: sources.length,
    languageVerification,
    errors: Object.freeze(errors),
  });
}
