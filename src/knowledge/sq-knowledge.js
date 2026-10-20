
/**
 * XSUS AI — Baza e Njohurive në Gjuhën Shqipe
 * Version: 1.1.0
 * Language: sq
 */

import { normalizeForSearch } from "../language/normalization.js";

export const SQ_KNOWLEDGE_VERSION = "1.1.0";

export const SQ_KNOWLEDGE = [
  {
    id: "sq-language",
    title: "Gjuha shqipe",
    domain: "language",
    language: "sq",
    keywords: ["shqip", "gjuha shqipe", "alfabeti", "fjalor", "gegërishtja", "toskërishtja"],
    content:
      "Shqipja është një gjuhë indo-evropiane. " +
      "Alfabeti standard shqip ka 36 shkronja. " +
      "Gjuha shqipe ka dy dialekte kryesore: gegërishten dhe toskërishten."
  },
  {
    id: "sq-ai",
    title: "Inteligjenca artificiale",
    domain: "technology",
    language: "sq",
    keywords: ["inteligjenca artificiale", "ai", "ia", "machine learning", "model", "rrjete nervore"],
    content:
      "Inteligjenca artificiale është fusha e informatikës që zhvillon sisteme " +
      "të afta të kryejnë detyra si përpunimi i gjuhës, njohja e modeleve, " +
      parashikimi dhe gjenerimi i përmbajtjes. " +
      "Mësimi automatik u mundëson sistemeve të mësojnë modele nga të dhënat. " +
      "Rezultatet duhet të vlerësohen për saktësi, besueshmëri dhe siguri."
  },
  {
    id: "sq-programming",
    title: "Programimi",
    domain: "programming",
    language: "sq",
    keywords: ["programim", "kodim", "kod", "program", "algoritëm", "testim", "debugging"],
    content:
      "Programimi është procesi i shkrimit të udhëzimeve që kompjuteri mund " +
      "të ekzekutojë. Një program i mirë është i kuptueshëm, i testueshëm, " +
      "i sigurt dhe i mirëmbajtshëm. " +
      "Zhvillimi i softuerit përfshin analizën, projektimin, implementimin, " +
      "testimin, publikimin dhe mirëmbajtjen."
  },
  {
    id: "sq-javascript",
    title: "JavaScript",
    domain: "programming",
    language: "sq",
    keywords: ["javascript", "js", "web", "funksion", "variabël", "promise", "async", "await"],
    content:
      "JavaScript është gjuhë programimi që përdoret në shfletues dhe në " +
      "mjedise serveri. Mbështet funksione, objekte, vargje, module dhe programim asinkron. " +
      "Kodi modern përdor zakonisht const dhe let për deklarimin e variablave, " +
      "ndërsa Promise dhe async/await për operacionet asinkrone."
  },
  {
    id: "sq-web-development",
    title: "Zhvillimi i faqeve web",
    domain: "programming",
    language: "sq",
    keywords: ["web", "faqe interneti", "html", "css", "react", "next.js", "frontend", "backend"],
    content:
      "Zhvillimi web përfshin ndërfaqen e përdoruesit, logjikën e aplikacionit " +
      "dhe shërbimet e serverit. HTML përshkruan strukturën, CSS pamjen dhe " +
      "JavaScript sjell ndërveprimin. " +
      "React ndihmon në krijimin e ndërfaqeve me komponentë, ndërsa Next.js " +
      "ofron funksione shtesë për ndërtimin e aplikacioneve React. " +
      "Një projekt profesional duhet të marrë parasysh sigurinë, aksesueshmërinë, " +
      "performancën dhe testimin."
  },
  {
    id: "sq-security",
    title: "Siguria digjitale",
    domain: "technology",
    language: "sq",
    keywords: ["siguri", "fjalëkalim", "privatësi", "sulm", "mbrojtje", "autentikim", "kriptim"],
    content:
      "Siguria digjitale përfshin mbrojtjen e llogarive, të dhënave dhe sistemeve. " +
      "Përdor fjalëkalime unike, autentikim me shumë faktorë, përditësime të rregullta " +
      "dhe leje minimale për shërbimet. " +
      "Aplikacionet duhet të kontrollojnë hyrjet, të mbrojnë sekretet dhe " +
      "të mos ekspozojnë të dhëna sensitive në mesazhe gabimesh ose regjistra."
  },
  {
    id: "sq-learning",
    title: "Mësimi dhe studimi",
    domain: "education",
    language: "sq",
    keywords: ["mësim", "studim", "edukim", "shpjegim", "praktikë", "njohuri", "përsëritje"],
    content:
      "Mësimi bëhet më efektiv përmes shpjegimeve të qarta, ushtrimeve, " +
      "përsëritjes së planifikuar dhe kontrollit të njohurive. " +
      "Përgjigjet duhen përshtatur me nivelin dhe qëllimin e nxënësit. " +
      "Ushtrimet praktike dhe komentet për përparimin ndihmojnë në përforcimin e njohurive."
  },
  {
    id: "sq-xsus",
    title: "Platforma XSUS AI",
    domain: "technology",
    language: "sq",
    keywords: ["xsus", "xsus ai", "xsus studio", "platformë", "motor gjuhësor", "baza e njohurive"],
    content:
      "XSUS AI po ndërtohet me module të ndara për bërthamën e AI-së, " +
      "përpunimin gjuhësor, kërkimin e njohurive dhe regjistrimin e shërbimeve. " +
      "Modulet e reja duhet të integrohen gradualisht pa dëmtuar shërbimet ekzistuese. " +
      "Arkitektura synon të mbështesë njohuri shumëgjuhëshe, testim të automatizuar " +
      "dhe integrim të ardhshëm me motorë ekzekutimi të modeleve."
  }
];

function normalizeLimit(value, fallback = 5) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(1, Math.min(Math.floor(parsed), 20));
}

function scoreEntry(entry, query) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) return 0;

  const terms = [
    ...new Set(normalizedQuery.split(/\s+/u).filter(Boolean))
  ];

  const title = normalizeForSearch(entry.title);
  const content = normalizeForSearch(entry.content);
  const keywords = entry.keywords.map(normalizeForSearch);
  const titleTokens = new Set(title.split(/\s+/u));
  const contentTokens = new Set(content.split(/\s+/u));

  let score = 0;

  if (title === normalizedQuery) score += 12;
  else if (title.includes(normalizedQuery)) score += 8;

  if (content.includes(normalizedQuery)) score += 5;

  for (const term of terms) {
    if (titleTokens.has(term)) score += 4;

    if (
      keywords.some(keyword =>
        keyword.split(/\s+/u).includes(term)
      )
    ) {
      score += 3;
    }

    if (contentTokens.has(term)) score += 1;
  }

  if (
    terms.length > 1 &&
    terms.every(term => titleTokens.has(term))
  ) {
    score += 5;
  }

  return score;
}

/**
 * Kërkon në bazën e njohurive shqipe.
 */
export function searchAlbanianKnowledge(query, options = {}) {
  if (typeof query !== "string" || !query.trim()) {
    return [];
  }

  const normalizedQuery = normalizeForSearch(query);
  const limit = normalizeLimit(options.limit);

  return SQ_KNOWLEDGE
    .map((entry, index) => ({
      entry,
      index,
      score: scoreEntry(entry, normalizedQuery)
    }))
    .filter(result => result.score > 0)
    .sort((a, b) =>
      b.score - a.score || a.index - b.index
    )
    .slice(0, limit)
    .map(({ entry, score }) => ({
      ...entry,
      keywords: [...entry.keywords],
      source: "sq-knowledge",
      score
    }));
}

/**
 * Kthen një rekord sipas ID-së.
 */
export function getAlbanianKnowledgeById(id) {
  if (typeof id !== "string" || !id.trim()) {
    return null;
  }

  const entry = SQ_KNOWLEDGE.find(
    item => item.id === id.trim()
  );

  return entry
    ? { ...entry, keywords: [...entry.keywords] }
    : null;
}

/**
 * Kthen temat e disponueshme.
 */
export function listAlbanianKnowledgeTopics() {
  return SQ_KNOWLEDGE.map(({ id, title, domain, language }) => ({
    id,
    title,
    domain,
    language
  }));
}

/**
 * Kthen statistikat e bazës shqipe.
 */
export function getAlbanianKnowledgeStats() {
  return {
    version: SQ_KNOWLEDGE_VERSION,
    count: SQ_KNOWLEDGE.length,
    language: "sq",
    domains: [...new Set(SQ_KNOWLEDGE.map(entry => entry.domain))],
    ids: SQ_KNOWLEDGE.map(entry => entry.id)
  };
}
