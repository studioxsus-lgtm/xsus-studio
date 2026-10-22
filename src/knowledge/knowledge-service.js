
/**
 * XSUS AI — Knowledge Service
 * Version: 1.1.1
 *
 * Përgjegjësitë:
 * - Kërkimi në bazat e integruara të njohurive.
 * - Regjistrimi dhe izolimi i burimeve shtesë.
 * - Normalizimi dhe validimi i rezultateve.
 * - Deduplikimi sipas përmbajtjes.
 * - Renditja sipas relevancës dhe cilësisë.
 * - Filtrimi sipas gjuhës dhe fushës.
 * - Metadata të qëndrueshme për XSUS AI Core.
 */

import {
  normalizeForSearch,
  normalizeLanguageCode
} from "../language/normalization.js";

import { validateKnowledgeEntry } from "./knowledge-entry.js";
import { hasKnowledgeDomain } from "./knowledge-domain-registry.js";

import { searchAlbanianKnowledge } from "./sq-knowledge.js";
import { searchEnglishKnowledge } from "./en-knowledge.js";
import { searchFrenchKnowledge } from "./fr-knowledge.js";
import { searchJavaScriptKnowledge } from "./javascript-master-knowledge.js";

const knowledgeSources = new Map();

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 8000;
const MAX_SOURCE_NAME_LENGTH = 100;
const MAX_PROVIDER_ERROR_LENGTH = 1000;

const ENGINE_NAME = "xsus-knowledge-service";
const ENGINE_VERSION = "1.1.1";
const SCHEMA_VERSION = "1.0.0";

const BUILT_IN_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr"
]);

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

function getBaseLanguage(language) {
  if (
    typeof language !== "string" ||
    !language.trim()
  ) {
    return "auto";
  }

  const normalized = language.trim().toLowerCase();

  if (normalized === "auto") {
    return "auto";
  }

  return normalized.split(/[-_]/u)[0] || "auto";
}

function normalizeLimit(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(
    1,
    Math.min(Math.floor(parsed), MAX_LIMIT)
  );
}

function normalizeMetadata(metadata) {
  return isPlainObject(metadata)
    ? { ...metadata }
    : {};
}

function normalizeResult(item, fallbackSource) {
  if (typeof item === "string" && item.trim()) {
    return {
      content: item.trim(),
      title: "",
      source: fallbackSource
    };
  }

  if (
    !isPlainObject(item) ||
    typeof item.content !== "string" ||
    !item.content.trim()
  ) {
    return null;
  }

  const result = {
    ...item,
    title:
      typeof item.title === "string"
        ? item.title.trim()
        : "",
    content: item.content.trim(),
    source:
      typeof item.source === "string" &&
      item.source.trim()
        ? item.source.trim()
        : fallbackSource
  };

  if (typeof result.id === "string") {
    result.id = result.id.trim();
  }

  if (typeof result.language === "string") {
    result.language = result.language
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
  }

  if (typeof result.domain === "string") {
    result.domain = result.domain.trim().toLowerCase();
  }

  if (typeof result.status === "string") {
    result.status = result.status.trim().toLowerCase();
  }

  return result;
}

/**
 * Kontroll minimal i strukturës së rezultatit.
 *
 * Validimi i plotë i hyrjeve mbetet përgjegjësi
 * e modulit knowledge-entry.js.
 */
function isValidKnowledgeResult(item) {
  return (
    isPlainObject(item) &&
    typeof item.content === "string" &&
    item.content.trim().length > 0
  );
}

function matchesKnowledgeDomain(item, requestedDomain) {
  if (!requestedDomain) {
    return true;
  }

  return (
    typeof item.domain === "string" &&
    item.domain.trim().toLowerCase() === requestedDomain
  );
}

/**
 * Rezultatet pa gjuhë të deklaruar pranohen për
 * përputhshmëri me burimet e vjetra.
 */
function matchesKnowledgeLanguage(item, requestedLanguage) {
  const targetLanguage = getBaseLanguage(requestedLanguage);

  if (
    !targetLanguage ||
    targetLanguage === "auto" ||
    typeof item.language !== "string" ||
    !item.language.trim()
  ) {
    return true;
  }

  return getBaseLanguage(item.language) === targetLanguage;
}

function getResultKey(item) {
  const content = normalizeForSearch(
    typeof item.content === "string"
      ? item.content
      : ""
  );

  if (content) {
    return `content:${content}`;
  }

  const title = normalizeForSearch(
    typeof item.title === "string"
      ? item.title
      : ""
  );

  if (title) {
    return `title:${title}`;
  }

  const id =
    typeof item.id === "string"
      ? item.id.trim().toLowerCase()
      : "";

  const source =
    typeof item.source === "string"
      ? item.source.trim().toLowerCase()
      : "";

  return id ? `id:${source}:${id}` : "";
}

/**
 * Vlerëson përputhjen e një rezultati me pyetjen.
 *
 * Pikët më të larta jepen për:
 * - titullin që përputhet saktësisht;
 * - frazën e plotë në titull ose përmbajtje;
 * - fjalët e pyetjes në titull;
 * - mbulimin e plotë të fjalëve të pyetjes;
 * - statusin verified ose reviewed.
 */
function scoreResult(item, query) {
  const title = normalizeForSearch(item.title || "");
  const content = normalizeForSearch(item.content || "");
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return 0;
  }

  const queryTokens = [
    ...new Set(
      normalizedQuery.split(/\s+/u).filter(Boolean)
    )
  ];

  if (queryTokens.length === 0) {
    return 0;
  }

  const titleTokens = new Set(
    title.split(/\s+/u).filter(Boolean)
  );

  const contentTokens = new Set(
    content.split(/\s+/u).filter(Boolean)
  );

  let score = 0;
  let matchedTitleTokens = 0;
  let matchedContentTokens = 0;

  // Përputhja e plotë e titullit.
  if (title === normalizedQuery) {
    score += 20;
  } else if (title.includes(normalizedQuery)) {
    score += 12;
  }

  // Përputhja e frazës së plotë në përmbajtje.
  if (content === normalizedQuery) {
    score += 15;
  } else if (content.includes(normalizedQuery)) {
    score += 8;
  }

  for (const token of queryTokens) {
    if (titleTokens.has(token)) {
      matchedTitleTokens += 1;
    }

    if (contentTokens.has(token)) {
      matchedContentTokens += 1;
    }
  }

  // Titulli është sinjal më i fortë se teksti i përgjithshëm.
  score += matchedTitleTokens * 4;
  score += matchedContentTokens;

  const titleCoverage =
    matchedTitleTokens / queryTokens.length;

  const contentCoverage =
    matchedContentTokens / queryTokens.length;

  // Shpërblen titujt që mbulojnë pjesën më të madhe
  // të fjalëve të pyetjes.
  score += Math.round(titleCoverage * 4);
  score += Math.round(contentCoverage * 2);

  if (
    queryTokens.length > 1 &&
    matchedTitleTokens === queryTokens.length
  ) {
    score += 8;
  }

  if (
    queryTokens.length > 1 &&
    matchedContentTokens === queryTokens.length
  ) {
    score += 4;
  }

  // Cilësia e verifikuar është sinjal shtesë,
  // jo zëvendësim për relevancën.
  if (item.status === "verified") {
    score += 2;
  } else if (item.status === "reviewed") {
    score += 1;
  }

  return score;
}

/**
 * Përdoret kur disa burime japin të njëjtën përmbajtje.
 * Relevanca është kriteri kryesor; statusi dhe plotësia
 * e titullit shërbejnë si kritere dytësore.
 */
function compareDuplicateQuality(a, b, query) {
  const scoreDifference =
    scoreResult(b, query) - scoreResult(a, query);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const statusRank = {
    verified: 3,
    reviewed: 2
  };

  const aStatus = statusRank[a.status] || 0;
  const bStatus = statusRank[b.status] || 0;

  if (aStatus !== bStatus) {
    return bStatus - aStatus;
  }

  const aTitleLength =
    typeof a.title === "string" ? a.title.length : 0;

  const bTitleLength =
    typeof b.title === "string" ? b.title.length : 0;

  if (aTitleLength !== bTitleLength) {
    return bTitleLength - aTitleLength;
  }

  return 0;
}

/**
 * Deduplikon rezultatet duke ruajtur kopjen më cilësore.
 * Kur cilësia është e barabartë, kopja e parë fiton.
 */
function deduplicateResults(results, query = "") {
  const uniqueResults = [];
  const positions = new Map();

  for (const item of results) {
    const key = getResultKey(item);

    if (!key) {
      continue;
    }

    if (!positions.has(key)) {
      positions.set(key, uniqueResults.length);
      uniqueResults.push(item);
      continue;
    }

    const existingIndex = positions.get(key);
    const existingItem = uniqueResults[existingIndex];

    if (
      compareDuplicateQuality(item, existingItem, query) < 0
    ) {
      uniqueResults[existingIndex] = item;
    }
  }

  return uniqueResults;
}

function safelySearchBuiltIn(
  searchFunction,
  query,
  limit,
  source
) {
  try {
    const results = searchFunction(query, { limit });

    if (!Array.isArray(results)) {
      return [];
    }

    return results
      .map(item => normalizeResult(item, source))
      .filter(isValidKnowledgeResult);
  } catch {
    // Një burim i integruar që dështon nuk duhet
    // të ndalojë kërkimin në burimet e tjera.
    return [];
  }
}

function getBuiltInResults(query, language, limit) {
  const baseLanguage = getBaseLanguage(language);
  const results = [];

  if (baseLanguage === "auto" || baseLanguage === "sq") {
    results.push(
      ...safelySearchBuiltIn(
        searchAlbanianKnowledge,
        query,
        limit,
        "built-in-sq-knowledge"
      )
    );
  }

  if (baseLanguage === "auto" || baseLanguage === "en") {
    results.push(
      ...safelySearchBuiltIn(
        searchEnglishKnowledge,
        query,
        limit,
        "built-in-en-knowledge"
      )
    );
  }

  if (baseLanguage === "auto" || baseLanguage === "fr") {
    results.push(
      ...safelySearchBuiltIn(
        searchFrenchKnowledge,
        query,
        limit,
        "built-in-fr-knowledge"
      )
    );
  }

  // Njohuritë për JavaScript kërkohen në çdo gjuhë.
  results.push(
    ...safelySearchBuiltIn(
      searchJavaScriptKnowledge,
      query,
      limit,
      "built-in-javascript-knowledge"
    )
  );

  return results;
}

function createFailureResult(query, language, error) {
  return {
    success: false,
    query,
    language,
    results: [],
    sources: [],
    errors: [],
    error,
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      resultCount: 0,
      totalUniqueResults: 0,
      rankingEnabled: true,
      deduplicationEnabled: true
    }
  };
}

function normalizeProviderError(error) {
  if (
    error instanceof Error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message
      .trim()
      .slice(0, MAX_PROVIDER_ERROR_LENGTH);
  }

  return "Gabim gjatë kërkimit në burimin shtesë.";
}

function normalizeProviderFailure(response) {
  if (typeof response?.error === "string" && response.error.trim()) {
    return response.error
      .trim()
      .slice(0, MAX_PROVIDER_ERROR_LENGTH);
  }

  return "Burimi raportoi dështim gjatë kërkimit.";
}

export function registerKnowledgeSource(name, provider) {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > MAX_SOURCE_NAME_LENGTH
  ) {
    throw new TypeError(
      `Emri i burimit duhet të jetë tekst me maksimum ${MAX_SOURCE_NAME_LENGTH} karaktere.`
    );
  }

  if (typeof provider !== "function") {
    throw new TypeError("Burimi duhet të jetë funksion.");
  }

  const key = name.trim();

  if (knowledgeSources.has(key)) {
    throw new Error(
      `Burimi "${key}" është regjistruar tashmë.`
    );
  }

  knowledgeSources.set(key, provider);

  return () => {
    if (knowledgeSources.get(key) === provider) {
      knowledgeSources.delete(key);
    }
  };
}

export function listKnowledgeSources() {
  return [...knowledgeSources.keys()];
}

export function hasKnowledgeSource(name) {
  return (
    typeof name === "string" &&
    knowledgeSources.has(name.trim())
  );
}

export function unregisterKnowledgeSource(name) {
  return (
    typeof name === "string" &&
    knowledgeSources.delete(name.trim())
  );
}

export async function searchKnowledge(query, options = {}) {
  const safeOptions = isPlainObject(options)
    ? options
    : {};

  const rawQuery =
    typeof query === "string"
      ? query.trim().slice(0, MAX_QUERY_LENGTH)
      : "";

  const normalizedQuery = normalizeForSearch(rawQuery);

  const language = normalizeLanguageCode(
    typeof safeOptions.language === "string" &&
    safeOptions.language.trim()
      ? safeOptions.language
      : "auto"
  );

  if (!normalizedQuery) {
    return createFailureResult(
      "",
      language,
      "Shkruaj një pyetje për të kërkuar njohuri."
    );
  }

  const limit = normalizeLimit(safeOptions.limit);

  const requestedDomain =
    typeof safeOptions.domain === "string"
      ? safeOptions.domain.trim().toLowerCase()
      : "";

  if (
    requestedDomain &&
    !hasKnowledgeDomain(requestedDomain)
  ) {
    return createFailureResult(
      normalizedQuery,
      language,
      `Fusha "${requestedDomain}" nuk njihet nga XSUS AI.`
    );
  }

  const results = getBuiltInResults(
    normalizedQuery,
    language,
    limit
  );

  const errors = [];
  const providerMetadata = normalizeMetadata(
    safeOptions.metadata
  );

  for (const [sourceName, provider] of knowledgeSources) {
    try {
      const response = await provider(normalizedQuery, {
        language,
        limit,
        domain: requestedDomain || undefined,
        metadata: { ...providerMetadata }
      });

      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.results)
          ? response.results
          : [];

      for (const item of items) {
        const normalizedItem = normalizeResult(
          item,
          sourceName
        );

        if (isValidKnowledgeResult(normalizedItem)) {
          results.push(normalizedItem);
        }
      }

      if (response?.success === false) {
        errors.push({
          source: sourceName,
          error: normalizeProviderFailure(response)
        });
      }
    } catch (error) {
      errors.push({
        source: sourceName,
        error: normalizeProviderError(error)
      });
    }
  }

  // Filtrimi kryhet përpara deduplikimit.
  // Kjo shmang që një rezultat jashtë gjuhës ose fushës
  // të fshehë një rezultat të vlefshëm nga një burim tjetër.
  const languageMatchedResults = results.filter(item =>
    matchesKnowledgeLanguage(item, language)
  );

  const domainMatchedResults = languageMatchedResults.filter(item =>
    matchesKnowledgeDomain(item, requestedDomain)
  );

  // Metadata ruan numrin e rezultateve unike të mbledhura
  // nga të gjitha burimet, para filtrimit të gjuhës dhe fushës.
  const uniqueResults = deduplicateResults(
    results,
    normalizedQuery
  );

  const domainResults = deduplicateResults(
    domainMatchedResults,
    normalizedQuery
  );

  const rankedResults = domainResults
    .map((item, index) => ({
      item,
      index,
      score: scoreResult(item, normalizedQuery)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Renditje e qëndrueshme kur pikët janë të barabarta.
      return a.index - b.index;
    })
    .map(entry => entry.item);

  const finalResults = rankedResults.slice(0, limit);

  return {
    success: true,
    query: normalizedQuery,
    language,
    results: finalResults,
    sources: [
      ...new Set(
        finalResults
          .map(item => item.source)
          .filter(Boolean)
      )
    ],
    errors,
    metadata: {
      engine: ENGINE_NAME,
      version: ENGINE_VERSION,
      schemaVersion: SCHEMA_VERSION,
      requestedDomain: requestedDomain || null,
      builtInLanguages: [...BUILT_IN_LANGUAGES],
      registeredSources: knowledgeSources.size,
      totalUniqueResults: uniqueResults.length,
      domainResultCount: domainResults.length,
      resultCount: finalResults.length,
      rankingEnabled: true,
      deduplicationEnabled: true,
      standardValidationAvailable:
        typeof validateKnowledgeEntry === "function"
    }
  };
}

export default searchKnowledge;
