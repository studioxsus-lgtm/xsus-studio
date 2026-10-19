
import { normalizeForSearch } from '../language/normalization.js';

export const SQ_KNOWLEDGE = [
  {
    id: 'sq-language',
    title: 'Gjuha shqipe',
    keywords: ['shqip', 'gjuha shqipe', 'alfabeti', 'fjalor'],
    content:
      'Shqipja është një gjuhë indo-evropiane. ' +
      'Alfabeti standard shqip ka 36 shkronja. ' +
      'Gjuha shqipe ka dy dialekte kryesore: gegërishten dhe toskërishten.'
  },
  {
    id: 'sq-ai',
    title: 'Inteligjenca artificiale',
    keywords: ['inteligjenca artificiale', 'ai', 'ia', 'machine learning', 'model'],
    content:
      'Inteligjenca artificiale është fusha e informatikës që zhvillon sisteme ' +
      'të afta të kryejnë detyra si përpunimi i gjuhës, njohja e modeleve ' +
      'dhe gjenerimi i përmbajtjes. Rezultatet duhet të vlerësohen për saktësi.'
  },
  {
    id: 'sq-programming',
    title: 'Programimi',
    keywords: ['programim', 'kodim', 'kod', 'program', 'algoritëm'],
    content:
      'Programimi është procesi i shkrimit të udhëzimeve që kompjuteri mund ' +
      'të ekzekutojë. Një program i mirë është i kuptueshëm, i testueshëm, ' +
      'i mirëmbajtshëm dhe trajton gabimet.'
  },
  {
    id: 'sq-javascript',
    title: 'JavaScript',
    keywords: ['javascript', 'js', 'web', 'funksion', 'variabël'],
    content:
      'JavaScript është gjuhë programimi që përdoret në shfletues dhe në ' +
      'mjedise serveri. Mbështet funksione, objekte, module dhe programim asinkron.'
  },
  {
    id: 'sq-web-development',
    title: 'Zhvillimi i faqeve web',
    keywords: ['web', 'faqe interneti', 'html', 'css', 'react', 'next.js'],
    content:
      'Zhvillimi web përfshin ndërfaqen e përdoruesit, logjikën e aplikacionit ' +
      'dhe shërbimet e serverit. HTML përshkruan strukturën, CSS pamjen dhe ' +
      'JavaScript sjell ndërveprimin.'
  },
  {
    id: 'sq-security',
    title: 'Siguria digjitale',
    keywords: ['siguri', 'fjalëkalim', 'privatësi', 'sulm', 'mbrojtje'],
    content:
      'Siguria digjitale përfshin mbrojtjen e llogarive, të dhënave dhe ' +
      'sistemeve. Përdor fjalëkalime unike, autentikim me shumë faktorë, ' +
      'përditësime të rregullta dhe leje minimale për shërbimet.'
  },
  {
    id: 'sq-learning',
    title: 'Mësimi dhe studimi',
    keywords: ['mësim', 'studim', 'edukim', 'shpjegim', 'praktikë'],
    content:
      'Mësimi bëhet më efektiv përmes shpjegimeve të qarta, ushtrimeve, ' +
      'përsëritjes dhe kontrollit të njohurive. Përgjigjet duhen përshtatur ' +
      'me nivelin dhe qëllimin e nxënësit.'
  },
  {
    id: 'sq-xsus',
    title: 'Platforma XSUS AI',
    keywords: ['xsus', 'xsus ai', 'xsus studio', 'platformë', 'motor gjuhësor'],
    content:
      'XSUS AI po ndërtohet me module të ndara për bërthamën e AI-së, ' +
      'normalizimin gjuhësor, njohuritë dhe regjistrimin e shërbimeve. ' +
      'Modulet e reja duhet të integrohen gradualisht pa dëmtuar shërbimet ekzistuese.'
  }
];

export function searchAlbanianKnowledge(query, options = {}) {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) return [];

  const terms = normalizedQuery.split(/\s+/u);
  const limit = Number.isInteger(options.limit)
    ? Math.max(1, Math.min(options.limit, 20))
    : 5;

  return SQ_KNOWLEDGE
    .map(entry => {
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

      return { ...entry, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...entry }) => ({
      ...entry,
      source: 'sq-knowledge'
    }));
}

export function getAlbanianKnowledgeById(id) {
  const entry = SQ_KNOWLEDGE.find(item => item.id === id);
  return entry ? { ...entry } : null;
}

export function listAlbanianKnowledgeTopics() {
  return SQ_KNOWLEDGE.map(({ id, title }) => ({ id, title }));
}
