/**

* XSUS AI Core — Response Engine
* Version: 1.3.0
* 
* Përgjegjësitë:
* - Standardizimi i përgjigjeve.
* - Pastrimi dhe deduplikimi i rezultateve.
* - Mbështetja për sq, en dhe fr.
* - Vlerësimi bazë i mbështetjes nga burimet.
* - Krijimi i metadata-s së përgjigjes.
    */

export const RESPONSE_ENGINE_VERSION = "1.3.0";

export const RESPONSE_LANGUAGES = Object.freeze([
"sq",
"en",
"fr"
]);

const FALLBACK_MESSAGES = Object.freeze({
sq: "Nuk u gjetën informacione të mjaftueshme për t'iu përgjigjur pyetjes. Provo ta riformulosh ose të shtosh më shumë kontekst.",
en: "Not enough information was found to answer the question. Please rephrase it or provide more context.",
fr: "Les informations trouvées ne suffisent pas pour répondre à la question. Veuillez reformuler votre demande ou fournir davantage de contexte."
});

function normalizeLanguage(language) {
if (typeof language !== "string") {
return "sq";
}

const normalized = language.trim().toLowerCase();

return RESPONSE_LANGUAGES.includes(normalized)
? normalized
: "sq";
}

function normalizeContent(value) {
if (typeof value !== "string") {
return "";
}

return value
.replace(/\r\n?/g, "\n")
.replace(/[ \t]+\n/g, "\n")
.replace(/\n{3,}/g, "\n\n")
.trim();
}

function extractContent(item) {
if (typeof item === "string") {
return normalizeContent(item);
}

if (!item || typeof item !== "object") {
return "";
}

return normalizeContent(
typeof item.content === "string"
? item.content
: typeof item.answer === "string"
? item.answer
: typeof item.text === "string"
? item.text
: ""
);
}

function extractSource(item) {
if (!item || typeof item !== "object") {
return null;
}

const source =
item.source ||
item.metadata?.source ||
item.id ||
null;

return typeof source === "string" && source.trim()
? source.trim()
: null;
}

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

const key = content.toLocaleLowerCase();

if (seen.has(key)) {
  continue;
}

seen.add(key);

normalizedResults.push({
  content,
  source: extractSource(item)
});

}

return normalizedResults;
}

export function calculateResponseConfidence(results = []) {
const normalized = normalizeResponseResults(results);

if (normalized.length === 0) {
return 0;
}

const sourcedCount = normalized.filter(
(item) => Boolean(item.source)
).length;

const resultScore = Math.min(normalized.length / 3, 1);
const sourceScore = sourcedCount / normalized.length;

const confidence = (resultScore * 0.6) + (sourceScore * 0.4);

return Math.round(confidence * 100) / 100;
}

export function createResponseMetadata({
language = "sq",
results = [],
requestId = null,
conversationId = null
} = {}) {
const normalizedLanguage = normalizeLanguage(language);
const normalizedResults = normalizeResponseResults(results);

return {
engine: "xsus-response-engine",
version: RESPONSE_ENGINE_VERSION,
language: normalizedLanguage,
requestId,
conversationId,
resultCount: normalizedResults.length,
sources: [
...new Set(
normalizedResults
.map((item) => item.source)
.filter(Boolean)
)
]
};
}

export function createResponse({
results = [],
language = "sq",
requestId = null,
conversationId = null
} = {}) {
const normalizedLanguage = normalizeLanguage(language);
const normalizedResults = normalizeResponseResults(results);

const answer = normalizedResults.length > 0
? normalizedResults.map((item) => item.content).join("\n\n")
: FALLBACK_MESSAGES[normalizedLanguage];

const confidence = calculateResponseConfidence(normalizedResults);

const metadata = createResponseMetadata({
language: normalizedLanguage,
results: normalizedResults,
requestId,
conversationId
});

return {
answer,
language: normalizedLanguage,
confidence,
source: "xsus-response-engine",
version: RESPONSE_ENGINE_VERSION,
metadata,
success: normalizedResults.length > 0
};
}

export function getFallbackResponse(language = "sq") {
const normalizedLanguage = normalizeLanguage(language);

return {
answer: FALLBACK_MESSAGES[normalizedLanguage],
language: normalizedLanguage,
confidence: 0,
source: "xsus-response-engine",
version: RESPONSE_ENGINE_VERSION,
metadata: createResponseMetadata({
language: normalizedLanguage
}),
success: false
};
}

export default createResponse;
