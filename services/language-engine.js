// services/language-engine.js

// 1. Profilizimi i Gjuhës Shqipe & Fjalët Bosh (Stop Words)
export const ALBANIAN_PROFILE = {
    code: 'sq',
    name: 'Albanian',
    nativeName: 'Shqip'
};

export const ALBANIAN_STOP_WORDS = new Set([
    'a', 'as', 'dhe', 'e', 'edhe', 'i', 'ia',
    'jam', 'je', 'ishte', 'jane', 'janë',
    'ka', 'me', 'në', 'ne', 'nga', 'një', 'nje', 'pa',
    'për', 'per', 'që', 'qe', 'sa', 'se', 'si', 'të', 'te', 
    'atë', 'ate', 'kjo', 'këtë', 'kete', 'ata', 'ato', 
    'mund', 'nëse', 'duhet'
]);

// 2. Normalizimi i avancuar i tekstit Shqip
export function normalizeAlbanian(text = "") {
    if (!text) return "";
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizeQueryText(text = "") {
    return normalizeAlbanian(text);
}

export function getAlbanianKeywords(text = "") {
    const cleanText = normalizeAlbanian(text);
    const words = cleanText.split(" ");
    return words.filter(word => word.length > 2 && !ALBANIAN_STOP_WORDS.has(word));
}

// 3. Markuesit dhe Zbulimi i Avancuar i 6 Gjuhëve
const LANGUAGE_MARKERS = {
  en: ["the", "what", "how", "please", "hello", "thanks", "help", "explain"],
  fr: ["bonjour", "merci", "comment", "pourquoi", "avec", "je", "vous", "aidez"],
  de: ["hallo", "danke", "bitte", "warum", "und", "ich", "nicht", "hilfe"],
  it: ["ciao", "grazie", "come", "perché", "sono", "aiuto"],
  es: ["hola", "gracias", "cómo", "porque", "quiero", "ayuda"]
};

const ALBANIAN_MARKERS = [
  "shqip", "shqipja", "përshëndetje", "faleminderit", "çfarë", 
  "si je", "dua", "mund të", "më ndihmo", "është", "gjuhë", "futboll", "moti", "sot", "neser", "nesër"
];

export function detectLanguage(input = "", preferred = "auto") {
  const normalizedText = normalizeQueryText(input);
  const text = normalizedText.toLowerCase();

  if (preferred !== "auto") {
    return {
      language: preferred,
      confidence: 1,
      normalizedText,
    };
  }

  if (!text.trim()) {
    return {
      language: "sq",
      confidence: 0,
      normalizedText,
    };
  }

  const scores = { sq: 0, en: 0, fr: 0, de: 0, it: 0, es: 0 };

  if (/[ëç]/i.test(text)) scores.sq += 2;

  for (const marker of ALBANIAN_MARKERS) {
    if (text.includes(marker)) scores.sq += 2;
  }

  const words = new Set(text.match(/[\p{L}\p{M}]+/gu) || []);

  for (const [language, markers] of Object.entries(LANGUAGE_MARKERS)) {
    for (const marker of markers) {
      if (words.has(marker)) scores[language] += 1;
    }
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [language, score] = ranked[0];
  const secondScore = ranked[1][1];

  if (score === 0) {
    return {
      language: "sq",
      confidence: 0.25,
      normalizedText,
    };
  }

  const confidence = Math.min(0.98, 0.5 + (score - secondScore) * 0.1);

  return { language, confidence, normalizedText };
}

export function detectQueryLanguage(userQuery = "") {
  return detectLanguage(userQuery, "auto").language;
}

// 4. Përkthimet e Sistemit
export const systemTranslations = {
    sq: {
        greeting: "Përshëndetje! Si mund t'ju ndihmoj sot?",
        error: "Ndodhi një gabim gjatë përpunimit të kërkesës suaj.",
        notFound: "Nuk u gjet asnjë informacion për kërkesën tuaj.",
        loading: "Duke kërkuar në internet dhe duke analizuar..."
    },
    en: {
        greeting: "Hello! How can I help you today?",
        error: "An error occurred while processing your request.",
        notFound: "No information could be found for your request.",
        loading: "Searching live web & analyzing..."
    },
    fr: {
        greeting: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
        error: "Une erreur s'est produite lors du traitement de votre demande.",
        notFound: "Aucune information trouvée pour votre demande.",
        loading: "Recherche sur le web en direct et analyse..."
    }
};
