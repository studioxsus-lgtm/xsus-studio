
import {
  normalizeText,
  normalizeLanguageCode,
  getBaseLanguage
} from "./normalization.js";

import { analyzeGrammar } from "./grammar-engine.js";

export const ENGINE_VERSION = "1.3.0";

export const SUPPORTED_LANGUAGES = Object.freeze([
  "sq", "en", "fr", "de", "es", "it", "pt", "nl",
  "ar", "zh", "ja", "ko", "ru"
]);

const LANGUAGE_INFO = Object.freeze({
  sq: { name: "Shqip", nativeName: "Shqip" },
  en: { name: "English", nativeName: "English" },
  fr: { name: "French", nativeName: "Français" },
  de: { name: "German", nativeName: "Deutsch" },
  es: { name: "Spanish", nativeName: "Español" },
  it: { name: "Italian", nativeName: "Italiano" },
  pt: { name: "Portuguese", nativeName: "Português" },
  nl: { name: "Dutch", nativeName: "Nederlands" },
  ar: { name: "Arabic", nativeName: "العربية" },
  zh: { name: "Chinese", nativeName: "中文" },
  ja: { name: "Japanese", nativeName: "日本語" },
  ko: { name: "Korean", nativeName: "한국어" },
  ru: { name: "Russian", nativeName: "Русский" }
});

const LANGUAGE_SIGNATURES = Object.freeze({
  sq: [
    "pershendetje", "faleminderit", "ju lutem",
    "si je", "si jeni", "cfare", "është",
    "shqip", "mirë", "mirupafshim", "përshëndetje",
    "dua", "kam", "jemi", "ësht"
  ],
  en: [
    "hello", "please", "thank you", "how are you",
    "what is", "what are", "how do", "how does",
    "where is", "who is", "why is", "when is",
    "can you", "could you", "tell me", "explain",
    "the", "this", "that", "with", "from", "have"
  ],
  fr: [
    "bonjour", "merci", "s'il vous plaît",
    "comment allez vous", "qu'est ce que",
    "je suis", "vous êtes", "pourquoi",
    "avec", "une", "est", "les"
  ],
  de: [
    "guten tag", "guten morgen", "danke",
    "bitte", "wie geht es", "ich bin",
    "und", "nicht", "der", "die", "das"
  ],
  es: [
    "hola", "gracias", "por favor",
    "cómo estás", "qué es", "buenos días",
    "porque", "con", "para", "está"
  ],
  it: [
    "ciao", "grazie", "per favore",
    "come stai", "che cosa", "buongiorno",
    "sono", "con", "perché", "questa"
  ],
  pt: [
    "olá", "obrigado", "obrigada",
    "por favor", "como está", "o que é",
    "bom dia", "você", "não", "com"
  ],
  nl: [
    "hallo", "bedankt", "alsjeblieft",
    "hoe gaat het", "wat is", "goedemorgen",
    "niet", "de", "het", "een"
  ]
});

const DISTINCTIVE_MARKERS = Object.freeze({
  sq: ["ë", "ç"],
  fr: ["à", "â", "ê", "è", "é", "ù", "œ"],
  de: ["ä", "ö", "ü", "ß"],
  es: ["¿", "¡", "ñ"],
  pt: ["ã", "õ"],
  ru: [],
  en: [],
  it: [],
  nl: [],
  ar: [],
  zh: [],
  ja: [],
  ko: []
});

function safeNormalize(text) {
  if (typeof text !== "string") return "";

  try {
    return normalizeText(text).toLowerCase().trim();
  } catch {
    return text.toLowerCase().trim();
  }
}

export function normalizeForDetection(text) {
  return safeNormalize(text)
    .normalize("NFKC")
    .replace(/[’‘]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(?=$|\\s)`, "u").test(text);
}

function detectScript(text) {
  if (/\p{Script=Arabic}/u.test(text)) return "ar";
  if (/\p{Script=Han}/u.test(text)) return "zh";
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(text)) {
    return "ja";
  }
  if (/\p{Script=Hangul}/u.test(text)) return "ko";
  if (/\p{Script=Cyrillic}/u.test(text)) return "ru";

  return null;
}

function scoreLanguage(text, language) {
  const signatures = LANGUAGE_SIGNATURES[language] || [];
  let score = 0;

  for (const phrase of signatures) {
    if (containsPhrase(text, phrase)) {
      score += phrase.includes(" ") ? 3 : 1;
    }
  }

  const markers = DISTINCTIVE_MARKERS[language] || [];

  for (const marker of markers) {
    if (text.includes(marker)) {
      score += 2;
    }
  }

  return score;
}

function detectAlbanian(text) {
  const albanianPatterns = [
    /\b(si je|si jeni|çfarë|cfare|faleminderit)\b/u,
    /\b(ju lutem|mirëdita|mirupafshim)\b/u,
    /\b(është|jam|jemi|jeni|kanë|kam)\b/u
  ];

  return albanianPatterns.some((pattern) => pattern.test(text));
}

function detectShortEnglish(text) {
  const patterns = [
    /^(what is|what are|how do|how does)\b/u,
    /^(where is|where are|who is|who are)\b/u,
    /^(why is|why are|when is|when are)\b/u,
    /^(can you|could you|would you|will you)\b/u,
    /^(tell me|explain|please explain)\b/u,
    /^(how can|how to|what does|what did)\b/u
  ];

  return patterns.some((pattern) => pattern.test(text));
}

export function detectLanguage(input) {
  const text = normalizeForDetection(input);

  if (!text) return "und";

  // Scriptet jo latine janë sinjale të forta gjuhësore.
  const scriptLanguage = detectScript(text);

  if (scriptLanguage) {
    return scriptLanguage;
  }

  // Shqiptarja kontrollohet para shenjave të përgjithshme.
  if (detectAlbanian(text)) {
    return "sq";
  }

  // Zgjidh problemin e pyetjeve të shkurtra si
  // "What is JavaScript?" pa përdorur JavaScript si sinjal gjuhe.
  if (detectShortEnglish(text)) {
    return "en";
  }

  const scores = SUPPORTED_LANGUAGES
    .filter((language) => LANGUAGE_SIGNATURES[language])
    .map((language) => ({
      language,
      score: scoreLanguage(text, language)
    }))
    .sort((a, b) => b.score - a.score);

  if (!scores.length || scores[0].score < 2) {
    return "und";
  }

  // Mos zgjedh një gjuhë kur rezultatet janë të barabarta.
  if (
    scores.length > 1 &&
    scores[0].score === scores[1].score
  ) {
    return "und";
  }

  return scores[0].language;
}

export function analyzeLanguage(input, options = {}) {
  const text = typeof input === "string" ? input : "";
  const detectedLanguage = detectLanguage(text);

  let requestedLanguage = null;

  if (typeof options.language === "string") {
    const normalizedCode = normalizeLanguageCode(options.language);
    requestedLanguage = getBaseLanguage(normalizedCode);

    if (!SUPPORTED_LANGUAGES.includes(requestedLanguage)) {
      requestedLanguage = null;
    }
  }

  const language = requestedLanguage || detectedLanguage;

  let grammar = null;

  if (text.trim()) {
    try {
      grammar = analyzeGrammar(text, language);
    } catch {
      grammar = null;
    }
  }

  return {
    text,
    language,
    detectedLanguage,
    requestedLanguage,
    isSupported: SUPPORTED_LANGUAGES.includes(language),
    grammar
  };
}

export function getLanguageInfo(languageCode) {
  if (typeof languageCode !== "string") return null;

  let normalizedCode;

  try {
    normalizedCode = getBaseLanguage(
      normalizeLanguageCode(languageCode)
    );
  } catch {
    return null;
  }

  const info = LANGUAGE_INFO[normalizedCode];

  if (!info) return null;

  return {
    code: normalizedCode,
    ...info,
    supported: SUPPORTED_LANGUAGES.includes(normalizedCode)
  };
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.map((code) => ({
    code,
    ...LANGUAGE_INFO[code]
  }));
}
