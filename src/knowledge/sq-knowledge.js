// src/knowledge/sq-knowledge.js
// XSUS AI — Albanian Knowledge Base
// Version: 1.1.1

export const SQ_KNOWLEDGE_VERSION = "1.1.1";

export const SQ_KNOWLEDGE = [
  {
    id: "sq-language",
    title: "Gjuha shqipe",
    domain: "language",
    language: "sq",
    keywords: [
      "shqip", "gjuha shqipe", "gramatika", "drejtshkrimi",
      "fjalori", "dialektet", "alfabeti"
    ],
    content:
      "Gjuha shqipe është një gjuhë indo-evropiane dhe përbën një degë më vete të familjes indo-evropiane. " +
      "Alfabeti i shqipes përdor 36 shkronja. Shqipja ka dy dialekte kryesore, gegërishten dhe toskërishten. " +
      "Gjuha standarde shqipe bazohet kryesisht në variantin letrar të njësuar në Kongresin e Drejtshkrimit të vitit 1972."
  },
  {
    id: "sq-ai",
    title: "Inteligjenca artificiale",
    domain: "technology",
    language: "sq",
    keywords: [
      "inteligjenca artificiale", "AI", "IA", "mësimi automatik",
      "machine learning", "modelet", "rrjetet nervore"
    ],
    content: [
      "Inteligjenca artificiale është fusha e informatikës që zhvillon sisteme të afta të kryejnë detyra që zakonisht kërkojnë inteligjencë njerëzore.",
      "Këto detyra mund të përfshijnë përpunimin e gjuhës, njohjen e modeleve, analizën dhe gjenerimin e përmbajtjes.",
      "Mësimi automatik u mundëson sistemeve të mësojnë modele nga të dhënat.",
      "Rrjetet nervore artificiale janë modele llogaritëse të frymëzuara në mënyrë të përgjithshme nga funksionimi i neuroneve biologjike.",
      "Përgjigjet e një sistemi AI duhet të vlerësohen për saktësi, besueshmëri, siguri dhe dobishmëri."
    ].join(" ")
  },
  {
    id: "sq-programming",
    title: "Programimi",
    domain: "programming",
    language: "sq",
    keywords: [
      "programim", "programimi", "kod", "kodim",
      "gjuhë programimi", "algoritëm", "software"
    ],
    content:
      "Programimi është procesi i krijimit të udhëzimeve që një kompjuter mund t'i ekzekutojë. " +
      "Ai përfshin analizimin e problemit, projektimin e algoritmit, shkrimin e kodit, testimin dhe mirëmbajtjen. " +
      "Gjuhët e programimit kanë sintaksë dhe rregulla të ndryshme. " +
      "Kodi i mirë duhet të jetë i lexueshëm, i testueshëm, i sigurt dhe i mirëmbajtshëm."
  },
  {
    id: "sq-javascript",
    title: "JavaScript",
    domain: "programming",
    language: "sq",
    keywords: [
      "javascript", "js", "let", "const", "funksion",
      "array", "objekt", "promise", "async", "await"
    ],
    content:
      "JavaScript është një gjuhë programimi e përdorur gjerësisht për zhvillimin e aplikacioneve web. " +
      "Ajo mbështet funksionet, objektet, vargjet, modulet dhe programimin asinkron. " +
      "Për deklarimin e variablave përdoren let dhe const në shumicën e rasteve moderne. " +
      "Promise, async dhe await ndihmojnë në trajtimin e operacioneve asinkrone. " +
      "Për kod më të sigurt duhen trajtuar gabimet dhe duhen validuar të dhënat hyrëse."
  },
  {
    id: "sq-web-development",
    title: "Zhvillimi web",
    domain: "programming",
    language: "sq",
    keywords: [
      "web", "faqe interneti", "website", "html", "css",
      "frontend", "backend", "api", "aplikacion web"
    ],
    content:
      "Zhvillimi web përfshin krijimin dhe mirëmbajtjen e faqeve dhe aplikacioneve që përdoren përmes internetit. " +
      "HTML përcakton strukturën e përmbajtjes, CSS pamjen vizuale dhe JavaScript sjell sjellje interaktive. " +
      "Frontend-i është pjesa me të cilën ndërvepron përdoruesi, ndërsa backend-i trajton logjikën e serverit dhe shpesh komunikimin me bazën e të dhënave. " +
      "API-të mundësojnë komunikimin ndërmjet sistemeve."
  },
  {
    id: "sq-security",
    title: "Siguria kibernetike",
    domain: "technology",
    language: "sq",
    keywords: [
      "siguri", "siguria kibernetike", "fjalëkalim",
      "autentikim", "autorizim", "enkriptim", "mbrojtje"
    ],
    content:
      "Siguria kibernetike synon të mbrojë sistemet, rrjetet dhe të dhënat nga qasja e paautorizuar dhe sulmet. " +
      "Praktikat bazë përfshijnë përdorimin e fjalëkalimeve unike, autentikimin me shumë faktorë, përditësimet e rregullta dhe kopjet rezervë. " +
      "Të dhënat e ndjeshme duhet të mbrohen gjatë ruajtjes dhe transmetimit. " +
      "Input-et duhet të validohen dhe lejet e përdoruesve duhet të kufizohen sipas nevojës."
  },
  {
    id: "sq-learning",
    title: "Mësimi dhe edukimi",
    domain: "education",
    language: "sq",
    keywords: [
      "mësim", "edukim", "studim", "kurs",
      "njohuri", "ushtrim", "shpjegim"
    ],
    content:
      "Mësimi është procesi i përvetësimit të njohurive dhe aftësive përmes studimit, praktikës dhe përvojës. " +
      "Një mënyrë e dobishme për të mësuar është ndarja e temës në pjesë të vogla, ushtrimi praktik dhe përsëritja. " +
      "Testet ndihmojnë në identifikimin e boshllëqeve në njohuri. " +
      "Një shpjegim i mirë përshtatet me nivelin dhe qëllimin e nxënësit."
  },
  {
    id: "sq-xsus",
    title: "XSUS Studio",
    domain: "technology",
    language: "sq",
    keywords: [
      "xsus", "xsus studio", "xsus ai",
      "platforma xsus", "projekt xsus"
    ],
    content:
      "XSUS Studio është projekti i një platforme teknologjike që synon të bashkojë mjete dhe shërbime digjitale. " +
      "XSUS AI është drejtimi i projektit që synon të zhvillojë një bërthamë inteligjence artificiale me mbështetje shumëgjuhëshe, njohuri të strukturuara dhe shërbime të ndara në module. " +
      "Arkitektura duhet të jetë modulare, e testueshme, e sigurt dhe e zgjerueshme. " +
      "Përshkrimi i veçorive duhet të pasqyrojë funksionalitetet që janë implementuar realisht."
  }
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("sq")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchableText(entry) {
  return normalizeText([
    entry.title,
    entry.content,
    ...(Array.isArray(entry.keywords) ? entry.keywords : [])
  ].join(" "));
}

export function searchAlbanianKnowledge(query, options = {}) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const limitValue = Number(options.limit ?? 10);
  const limit = Number.isFinite(limitValue)
    ? Math.max(1, Math.min(50, Math.floor(limitValue)))
    : 10;

  const queryTokens = [...new Set(normalizedQuery.split(" "))];

  return SQ_KNOWLEDGE
    .map((entry) => {
      const title = normalizeText(entry.title);
      const content = normalizeText(entry.content);
      const keywords = (entry.keywords ?? []).map(normalizeText);
      const searchableText = getSearchableText(entry);

      let score = 0;

      if (title === normalizedQuery) {
        score += 12;
      } else if (title.includes(normalizedQuery)) {
        score += 8;
      }

      for (const keyword of keywords) {
        if (keyword && normalizedQuery.includes(keyword)) {
          score += 6;
        } else if (keyword && keyword.includes(normalizedQuery)) {
          score += 3;
        }
      }

      for (const token of queryTokens) {
        if (token.length < 2) continue;

        if (title.includes(token)) score += 3;
        if (keywords.some((keyword) => keyword.includes(token))) score += 2;
        if (content.includes(token)) score += 1;
      }

      const matchedTokens = queryTokens.filter(
        (token) => token.length >= 2 && searchableText.includes(token)
      ).length;

      if (matchedTokens === 0) score = 0;

      return {
        ...entry,
        source: "sq-knowledge",
        score
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function getAlbanianKnowledgeById(id) {
  return SQ_KNOWLEDGE.find((entry) => entry.id === id) ?? null;
}

export function listAlbanianKnowledgeTopics() {
  return SQ_KNOWLEDGE.map(({ id, title, domain, language }) => ({
    id,
    title,
    domain,
    language
  }));
}

export function getAlbanianKnowledgeStats() {
  const domains = {};

  for (const entry of SQ_KNOWLEDGE) {
    domains[entry.domain] = (domains[entry.domain] ?? 0) + 1;
  }

  return {
    version: SQ_KNOWLEDGE_VERSION,
    language: "sq",
    totalEntries: SQ_KNOWLEDGE.length,
    domains
  };
}
