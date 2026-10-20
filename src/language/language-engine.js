
import {
  normalizeText,
  normalizeLanguageCode,
  getBaseLanguage
} from "./normalization.js";

import { analyzeGrammar } from "./grammar-engine.js";

export const ENGINE_VERSION = "1.4.1";

export const SUPPORTED_LANGUAGES = Object.freeze([
  "sq", "en", "fr", "de", "es", "it", "pt", "nl",
  "ar", "zh", "ja", "ko", "ru"
]);

const LANGUAGE_INFO = Object.freeze({
  sq: { name: "Albanian", nativeName: "Shqip" },
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
    "pershendetje", "përshëndetje", "faleminderit",
    "ju lutem", "si je", "si jeni", "cfare", "çfarë",
    "është", "shqip", "mirë", "mirupafshim",
    "dua", "kam", "jemi", "jeni", "kanë",
    "tungjatjeta", "mirëmëngjes", "natën e mirë"
  ],
  en: [
    "hello", "please", "thank you", "how are you",
    "what is", "what are", "how do", "how does",
    "where is", "where are", "who is", "who are",
    "why is", "why are", "when is", "when are",
    "can you", "could you", "would you", "will you",
    "tell me", "explain", "good morning", "good evening",
    "the", "this", "that", "with", "from", "have"
  ],
  fr: [
    "bonjour", "bonsoir", "salut", "merci",
    "s'il vous plaît", "s'il vous plait",
    "comment allez vous", "comment vas tu",
    "qu'est ce que", "je suis", "vous êtes",
    "pourquoi", "avec", "une", "est", "les",
    "bonne journée", "bonne nuit", "au revoir"
  ],
  de: [
    "guten tag", "guten morgen", "guten abend",
    "danke", "bitte", "wie geht es", "ich bin",
    "und", "nicht", "der", "die", "das",
    "auf wiedersehen"
  ],
  es: [
    "hola", "gracias", "por favor", "cómo estás",
    "qué es", "buenos días", "buenas noches",
    "porque", "con", "para", "está", "adiós"
  ],
  it: [
    "ciao", "grazie", "per favore", "come stai",
    "che cosa", "buongiorno", "buonasera",
    "sono", "perché", "questa", "arrivederci"
  ],
  pt: [
    "olá", "obrigado", "obrigada", "por favor",
    "como está", "o que é", "bom dia", "boa noite",
    "você", "não", "com", "adeus"
  ],
  nl: [
    "hallo", "bedankt", "alsjeblieft",
    "hoe gaat het", "wat is", "goedemorgen",
    "goedemiddag", "niet", "de", "het", "een",
    "tot ziens"
  ]
});

const DISTINCTIVE_MARKERS = Object.freeze({
  sq: ["ë", "ç"],
  fr: ["à", "â", "ê", "è", "é", "ù", "œ"],
  de: ["ä", "ö", "ü", "ß"],
  es: ["ñ", "¿", "¡"],
  pt: ["ã", "õ"],
  en: [],
  it: [],
  nl: [],
  ar: [],
  zh: [],
  ja: [],
  ko: [],
  ru: []
});

function safeNormalize(text) {
  if (typeof text !== "string") return "";

  try {
    return String(normalizeText(text) ?? "")
      .toLowerCase()
      .trim();
  } catch {
    return text.toLowerCase().trim();
  }
}

export function normalizeForDetection(text) {
  return safeNormalize(text)
    .normalize("NFKC")
    .replace(/[’‘]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[-‐‑‒–—]/gu, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(?=$|\\s)`, "u")
    .test(text);
}

function detectScript(text) {
  if (/\p{Script=Arabic}/u.test(text)) return "ar";

  if (
    /\p{Script=Hiragana}|\p{Script=Katakana}/u.test(text)
  ) {
    return "ja";
  }

  if (/\p{Script=Hangul}/u.test(text)) return "ko";
  if (/\p{Script=Cyrillic}/u.test(text)) return "ru";
  if (/\p{Script=Han}/u.test(text)) return "zh";

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

  for (const marker of DISTINCTIVE_MARKERS[language] || []) {
    if (text.includes(marker)) score += 2;
  }

  return score;
}

function detectAlbanian(text) {
  const patterns = [
    /\b(si je|si jeni|çfarë|cfare|faleminderit)\b/u,
    /\b(ju lutem|mirëdita|mirupafshim)\b/u,
    /\b(është|jam|jemi|jeni|kanë|kam)\b/u,
    /\b(tungjatjeta|mirëmëngjes|natën e mirë)\b/u
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function detectShortEnglish(text) {
  return /^(what is|what are|how do|how does|where is|where are|who is|who are|why is|why are|when is|when are|can you|could you|would you|will you|tell me|explain|please explain|how can|how to|what does|what did)\b/u
    .test(text);
}

function detectShortFrench(text) {
  return /^(bonjour|bonsoir|salut|merci|comment allez vous|comment vas tu|qu'est ce que|bonne journée|bonne nuit|au revoir)\b/u
    .test(text);
}

function detectShortGerman(text) {
  return /^(guten tag|guten morgen|guten abend|danke|bitte|auf wiedersehen)\b/u
    .test(text);
}

function detectShortSpanish(text) {
  return /^(hola|gracias|buenos días|buenas noches|por favor|adiós)\b/u
    .test(text);
}

function detectShortItalian(text) {
  return /^(ciao|grazie|buongiorno|buonasera|per favore|arrivederci)\b/u
    .test(text);
}

function detectShortPortuguese(text) {
  return /^(olá|obrigado|obrigada|bom dia|boa noite|por favor|adeus)\b/u
    .test(text);
}

function detectShortDutch(text) {
  return /^(hallo|bedankt|goedemorgen|goedemiddag|tot ziens|alsjeblieft)\b/u
    .test(text);
}

export function detectLanguage(input) {
  const text = normalizeForDetection(input);

  if (!text) return "und";

  const scriptLanguage = detectScript(text);
  if (scriptLanguage) return scriptLanguage;

  if (detectAlbanian(text)) return "sq";
  if (detectShortFrench(text)) return "fr";
  if (detectShortEnglish(text)) return "en";
  if (detectShortGerman(text)) return "de";
  if (detectShortSpanish(text)) return "es";
  if (detectShortItalian(text)) return "it";
  if (detectShortPortuguese(text)) return "pt";
  if (detectShortDutch(text)) return "nl";

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

  if (
    scores.length > 1 &&
    scores[0].score === scores[1].score
  ) {
    return "und";
  }

  return scores[0].language;
}

function resolveLanguageCode(languageCode) {
  if (typeof languageCode !== "string" || !languageCode.trim()) {
    return null;
  }

  try {
    const normalized = normalizeLanguageCode(languageCode);
    const base = getBaseLanguage(normalized);

    return SUPPORTED_LANGUAGES.includes(base) ? base : null;
  } catch {
    return null;
  }
}

export function analyzeLanguage(input, options = {}) {
  const text = typeof input === "string" ? input : "";
  const detectedLanguage = detectLanguage(text);
  const requestedLanguage = resolveLanguageCode(options?.language);

  const language = requestedLanguage || detectedLanguage;
  const isEmpty = text.trim().length === 0;

  let grammar = null;

  if (!isEmpty && language !== "und") {
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
    isEmpty,
    isSupported: SUPPORTED_LANGUAGES.includes(language),
    grammar
  };
}

export function getLanguageInfo(languageCode) {
  const code = resolveLanguageCode(languageCode);

  if (!code) {
    return {
      code: null,
      baseLanguage: null,
      language: null,
      name: null,
      nativeName: null,
      supported: false
    };
  }

  return {
    code,
    baseLanguage: code,
    language: code,
    ...LANGUAGE_INFO[code],
    supported: true
  };
}

export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}
