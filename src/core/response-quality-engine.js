/**

* XSUS AI Core — Response Quality Engine
* Version: 1.0.0
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

export const RESPONSE_QUALITY_VERSION = "1.0.0";

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

/**

* Vlerëson përputhjen e gjuhës.
* 
* 100  = përputhje e konfirmuar.
* 0    = mospërputhje e konfirmuar.
* null = prova të pamjaftueshme për një rezultat të besueshëm.
  */
  function calculateLanguage(
  requestedLanguage,
  responseLanguage,
  verification
  ) {
  if (!requestedLanguage || !responseLanguage) {
  return null;
  }

// Nëse kodet e gjuhës ndryshojnë, mospërputhja është e qartë.
if (requestedLanguage !== responseLanguage) {
return 0;
}

// Pa verifikim nuk duhet të pretendojmë siguri.
if (!verification || typeof verification !== "object") {
return null;
}

// Rezultat pozitiv vetëm kur verifikimi e konfirmon përputhjen.
if (
verification.matches === true ||
verification.status === "match"
) {
return 100;
}

// Rezultat negativ vetëm kur verifikimi konfirmon mospërputhjen.
if (
verification.matches === false ||
verification.status === "mismatch"
) {
return 0;
}

// Për statuset e pasigurta nuk japim pikë të sajuara.
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
return verifyResponseLanguage({
text: answer,
requestedLanguage
});
} catch {
// Një dështim i verifikuesit nuk duhet të ndërpresë
// të gjithë procesin e vlerësimit të përgjigjes.
return null;
}
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

// Dimensionet null përjashtohen nga mesatarja:
// ato tregojnë se mungojnë prova të mjaftueshme,
// jo se rezultati është zero.
const applicableScores = Object.values(dimensions).filter(
(value) => value !== null
);

const score =
applicableScores.length > 0
? roundScore(
applicableScores.reduce(
(total, value) => total + value,
0
) / applicableScores.length
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
errors: Object.freeze(errors)
});
}
