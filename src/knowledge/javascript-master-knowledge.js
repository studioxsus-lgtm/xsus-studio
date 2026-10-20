
/**
 * XSUS AI — JavaScript Master Knowledge Base
 * Version: 1.1.0
 * Language: Albanian (sq)
 * Domain: programming
 */

import { normalizeForSearch } from "../language/normalization.js";

export const JAVASCRIPT_KNOWLEDGE_VERSION = "1.1.0";

const JAVASCRIPT_KNOWLEDGE = [
  {
    id: "js-variables",
    title: "Variablat në JavaScript",
    domain: "programming",
    language: "sq",
    keywords: [
      "variable", "variables", "let", "const", "var",
      "variabla", "deklarim", "vlera"
    ],
    content:
      "JavaScript përdor let, const dhe var për deklarimin e variablave. " +
      "Prefero let për vlera që ndryshojnë dhe const për lidhje që nuk ricaktohen. " +
      "const nuk e bën automatikisht të pandryshueshme përmbajtjen e një objekti ose vargu. " +
      "var ka rregulla më të vjetra të scope dhe zakonisht shmanget në kodin modern."
  },
  {
    id: "js-functions",
    title: "Funksionet në JavaScript",
    domain: "programming",
    language: "sq",
    keywords: [
      "function", "functions", "funksion", "funksione",
      "arrow function", "parametra", "return"
    ],
    content:
      "Funksionet në JavaScript grupojnë logjikën që mund të ekzekutohet përsëri. " +
      "Mund të deklarohen me function, me sintaksën arrow ose si metoda objektesh. " +
      "Funksionet mund të marrin parametra dhe të kthejnë rezultate me return. " +
      "Funksionet arrow nuk krijojnë lidhje të pavarur të this."
  },
  {
    id: "js-arrays",
    title: "Vargjet në JavaScript",
    domain: "programming",
    language: "sq",
    keywords: [
      "array", "arrays", "varg", "vargje",
      "map", "filter", "reduce", "elemente"
    ],
    content:
      "Array ruan një koleksion elementesh sipas rendit dhe indekson elementet duke filluar nga zero. " +
      "Metoda map krijon një varg të ri nga rezultatet e transformimit të elementeve. " +
      "filter krijon një varg me elementet që plotësojnë një kusht. " +
      "reduce përmbledh elementet në një rezultat të vetëm. " +
      "Këto metoda përdoren për përpunimin e të dhënave në mënyrë të lexueshme."
  },
  {
    id: "js-objects",
    title: "Objektet në JavaScript",
    domain: "programming",
    language: "sq",
    keywords: [
      "object", "objects", "objekt", "objekte",
      "property", "properties", "key", "value"
    ],
    content:
      "Objektet në JavaScript ruajnë të dhëna si çifte çelës-vlerë. " +
      "Pronat mund të lexohen me pikë, si user.name, ose me kllapa katrore, si user['name']. " +
      "Vlerat mund të jenë numra, tekst, vargje, funksione ose objekte të tjera. " +
      "Object.keys, Object.values dhe Object.entries ndihmojnë në shqyrtimin e pronave."
  },
  {
    id: "js-async",
    title: "Programimi asinkron në JavaScript",
    domain: "programming",
    language: "sq",
    keywords: [
      "async", "await", "promise", "promises",
      "asynchronous", "asinkron", "fetch", "try", "catch"
    ],
    content:
      "Promise përfaqëson rezultatin e ardhshëm të një operacioni asinkron. " +
      "Një Promise mund të jetë pending, fulfilled ose rejected. " +
      "async dhe await ndihmojnë në shkrimin e kodit asinkron me sintaksë të lexueshme. " +
      "Gabimet e operacioneve që priten me await zakonisht trajtohen me try/catch. " +
      "Për kërkesat HTTP mund të përdoret fetch, duke kontrolluar edhe response.ok."
  },
  {
    id: "js-modules",
    title: "Modulet JavaScript",
    domain: "programming",
    language: "sq",
    keywords: [
      "module", "modules", "import", "export",
      "modul", "module system", "esm", "named export", "default export"
    ],
    content:
      "Modulet JavaScript ndajnë kodin në skedarë të pavarur. " +
      "export ekspozon funksione ose vlera, ndërsa import i përdor ato në module të tjera. " +
      "Modulet mbështesin named exports dhe default exports. " +
      "Ndarja në module përmirëson organizimin, ripërdorimin dhe mirëmbajtjen e projektit. " +
      "Rrugët relative duhet të tregojnë te skedari i saktë."
  },
  {
    id: "js-errors",
    title: "Trajtimi i gabimeve në JavaScript",
    domain: "programming",
    language: "sq",
    keywords: [
      "error", "errors", "exception", "try", "catch",
      "throw", "gabim", "gabime", "finally"
    ],
    content:
      "try/catch përdoret për të trajtuar gabime gjatë ekzekutimit. " +
      "throw mund të përdoret për të ngritur një gabim kur një kusht nuk plotësohet. " +
      "finally ekzekutohet pas përfundimit të try/catch, pavarësisht nëse ndodh gabim. " +
      "Gabimet duhet të trajtohen me mesazhe të qarta dhe pa fshehur problemet e rëndësishme."
  }
];

function scoreEntry(entry, query) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) return 0;

  const terms = [...new Set(normalizedQuery.split(/\s+/u).filter(Boolean))];
  const title = normalizeForSearch(entry.title);
  const content = normalizeForSearch(entry.content);
  const keywords = entry.keywords.map(normalizeForSearch);

  let score = 0;

  if (title === normalizedQuery) score += 12;
  else if (title.includes(normalizedQuery)) score += 8;

  if (content.includes(normalizedQuery)) score += 5;

  for (const term of terms) {
    if (title.split(/\s+/u).includes(term)) score += 4;
    if (keywords.some(keyword => keyword.includes(term))) score += 3;
    if (content.split(/\s+/u).includes(term)) score += 1;
  }

  if (
    terms.length > 1 &&
    terms.every(term => title.split(/\s+/u).includes(term))
  ) {
    score += 5;
  }

  return score;
}

function normalizeLimit(value, fallback = 5) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(1, Math.min(Math.floor(parsed), 20));
}

/**
 * Kërkon njohuri për JavaScript.
 * Përputhet me ndërfaqen e knowledge-service.js.
 */
export function searchJavaScriptKnowledge(query, options = {}) {
  if (typeof query !== "string" || !query.trim()) {
    return [];
  }

  const limit = normalizeLimit(options.limit);
  const normalizedQuery = normalizeForSearch(query);

  return JAVASCRIPT_KNOWLEDGE
    .map(entry => ({
      ...entry,
      keywords: [...entry.keywords],
      score: scoreEntry(entry, normalizedQuery)
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...entry }) => ({
      ...entry,
      source: "javascript-master-knowledge"
    }));
}

/**
 * Kthen temat e disponueshme.
 */
export function listJavaScriptKnowledgeTopics() {
  return JAVASCRIPT_KNOWLEDGE.map(({ id, title, domain, language }) => ({
    id,
    title,
    domain,
    language
  }));
}

/**
 * Kthen një rekord sipas ID-së.
 */
export function getJavaScriptKnowledgeById(id) {
  if (typeof id !== "string" || !id.trim()) return null;

  const entry = JAVASCRIPT_KNOWLEDGE.find(
    item => item.id === id.trim()
  );

  return entry
    ? { ...entry, keywords: [...entry.keywords] }
    : null;
}

/**
 * Jep statistika bazë për këtë bazë njohurish.
 */
export function getJavaScriptKnowledgeStats() {
  return {
    version: JAVASCRIPT_KNOWLEDGE_VERSION,
    count: JAVASCRIPT_KNOWLEDGE.length,
    domain: "programming",
    language: "sq",
    ids: JAVASCRIPT_KNOWLEDGE.map(entry => entry.id)
  };
}
