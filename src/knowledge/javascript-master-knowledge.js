
import { normalizeForSearch } from '../language/normalization.js';

const JAVASCRIPT_KNOWLEDGE = [
  {
    id: 'js-variables',
    title: 'Variablat në JavaScript',
    keywords: ['variable', 'variables', 'let', 'const', 'var', 'variabla'],
    content:
      'JavaScript përdor let, const dhe var për deklarimin e variablave. ' +
      'Prefero let për vlera që ndryshojnë dhe const për lidhje që nuk ricaktohen. ' +
      'var ka rregulla më të vjetra të scope.'
  },
  {
    id: 'js-functions',
    title: 'Funksionet në JavaScript',
    keywords: ['function', 'functions', 'funksion', 'funksione', 'arrow function'],
    content:
      'Funksionet në JavaScript grupojnë logjikën që mund të ekzekutohet përsëri. ' +
      'Mund të deklarohen me function, me sintaksën arrow ose si metoda objektesh.'
  },
  {
    id: 'js-arrays',
    title: 'Vargjet në JavaScript',
    keywords: ['array', 'arrays', 'varg', 'vargje', 'map', 'filter', 'reduce'],
    content:
      'Array ruan një koleksion elementesh sipas rendit. ' +
      'Metodat map, filter dhe reduce përdoren për transformim, filtrimin dhe ' +
      'përmbledhjen e elementeve.'
  },
  {
    id: 'js-objects',
    title: 'Objektet në JavaScript',
    keywords: ['object', 'objects', 'objekt', 'objekte', 'property', 'properties'],
    content:
      'Objektet në JavaScript ruajnë të dhëna si çifte çelës-vlerë. ' +
      'Pronat mund të lexohen me pikë ose me kllapa katrore.'
  },
  {
    id: 'js-async',
    title: 'Programimi asinkron',
    keywords: ['async', 'await', 'promise', 'promises', 'asynchronous', 'asinkron'],
    content:
      'Promise përfaqëson rezultatin e ardhshëm të një operacioni asinkron. ' +
      'async dhe await ndihmojnë në shkrimin e kodit asinkron me sintaksë të lexueshme. ' +
      'Gabimet zakonisht trajtohen me try/catch.'
  },
  {
    id: 'js-modules',
    title: 'Modulet JavaScript',
    keywords: ['module', 'modules', 'import', 'export', 'modul', 'module system'],
    content:
      'Modulet JavaScript ndajnë kodin në skedarë të pavarur. ' +
      'export ekspozon funksione ose vlera, ndërsa import i përdor ato në module të tjera.'
  },
  {
    id: 'js-errors',
    title: 'Trajtimi i gabimeve',
    keywords: ['error', 'errors', 'exception', 'try', 'catch', 'gabim', 'gabime'],
    content:
      'try/catch përdoret për të trajtuar gabime gjatë ekzekutimit. ' +
      'throw mund të përdoret për të ngritur një gabim kur një kusht nuk plotësohet.'
  }
];

function scoreEntry(entry, query) {
  const normalizedQuery = normalizeForSearch(query);
  const terms = normalizedQuery.split(/\s+/u).filter(Boolean);

  const title = normalizeForSearch(entry.title);
  const content = normalizeForSearch(entry.content);
  const keywords = entry.keywords.map(normalizeForSearch);

  let score = 0;

  if (title.includes(normalizedQuery)) score += 8;

  for (const term of terms) {
    if (title.includes(term)) score += 4;
    if (keywords.some(keyword => keyword.includes(term))) score += 3;
    if (content.includes(term)) score += 1;
  }

  return score;
}

export function searchJavaScriptKnowledge(query, options = {}) {
  if (typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const limit = Number.isInteger(options.limit)
    ? Math.max(1, Math.min(options.limit, 20))
    : 5;

  return JAVASCRIPT_KNOWLEDGE
    .map(entry => ({
      ...entry,
      score: scoreEntry(entry, query)
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...entry }) => ({
      ...entry,
      source: 'javascript-master-knowledge'
    }));
}

export function listJavaScriptKnowledgeTopics() {
  return JAVASCRIPT_KNOWLEDGE.map(({ id, title }) => ({
    id,
    title
  }));
}

export function getJavaScriptKnowledgeById(id) {
  const entry = JAVASCRIPT_KNOWLEDGE.find(item => item.id === id);
  return entry ? { ...entry } : null;
}
