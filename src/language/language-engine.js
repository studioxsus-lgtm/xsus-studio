// src/language/language-engine.js

import {
  normalizeText,
  normalizeLanguageCode,
  getBaseLanguage
} from "./normalization.js";

import { analyzeGrammar } from "./grammar-engine.js";

export const ENGINE_VERSION = "1.4.2";

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

const SIGNATURES = Object.freeze({
  sq: [
    "përshëndetje", "pershendetje", "faleminderit",
    "ju lutem", "si je", "si jeni", "çfarë", "cfare",
    "është", "shqip", "mirë", "mirupafshim",
    "tungjatjeta", "mirëmëngjes", "natën e mirë",
    "dua", "kam", "jemi", "jeni", "kanë", "unë"
  ],
  en: [
    "hello", "please", "thank you", "how are you",
    "what is", "what are", "how do", "how does",
    "where is", "where are", "who is", "who are",
    "why is", "why are", "when is", "when are",
    "can you", "could you", "would you", "will you",
    "tell me", "explain", "good morning", "good evening",
    "the", "this", "that", "with", "from", "have",
    "what", "which", "because", "your", "JavaScript"
  ],
  fr: [
    "bonjour", "bonsoir", "salut", "merci",
    "s'il vous plaît", "s'il vous plait",
    "comment allez vous", "comment vas tu",
    "qu'est ce que", "je suis", "vous êtes",
    "pourquoi", "avec", "une", "est", "les",
    "bonne journée", "bonne nuit", "au revoir",
    "comment", "vous", "nous", "mais"
  ],
  de: [
    "guten tag", "guten morgen", "guten abend",
    "danke", "bitte", "wie geht es", "ich bin",
    "und", "nicht", "der", "die", "das",
    "auf wiedersehen"
  ],
  es: [
    "hola", "gracias", "por favor", "cómo estás",
    "que es", "qué es", "buenos días", "buenas noches",
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

const DISTINCTIVE_PATTERNS = Object.freeze({
  sq: /\b(çfarë|cfare|përshëndetje|pershendetje|faleminderit|shqip|mirupafshim|tungjatjeta)\b/u,
  en: /\b(hello|thanks|please|because|would|which|their|they|your|what|where|when|who|why)\b/u,
  fr: /\b(bonjour|bonsoir|merci|pourquoi|beaucoup|français|francais|aujourd'hui)\b/u,
  de: /\b(danke|hallo|deutsch|nicht|ich|bitte|tschüss)\b/u,
  es: /\b(hola|gracias|español|espanol|buenos días|buenas noches)\b/u,
  it: /\b(ciao|grazie|italiano|buongiorno|arrivederci)\b/u,
  pt: /\b(obrigado|obrigada|português|portugues|bom dia|tudo bem)\b/u,
  nl: /\b(bedankt|nederlands|goedemorgen|tot ziens|alsjeblieft)\b/u
});

function safeNormalize(value) {
  if (typeof value !== "string") return "";

  try {
    return String(normalizeText(value) ?? "");
  } catch {
    return value;
  }
}

export function normalizeForDetection(value) {
  return safeNormalize(value)
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/[’‘]/gu, "'")
    .replace(/[“”]/gu, '"')
    .replace(/[-‐‑‒–—]/gu, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  const normalizedPhrase = normalizeForDetection(phrase);
  if (!normalizedPhrase) return false;

  const escaped = normalizedPhrase.replace(
    /[.*+?^${}()|[\]\\]/gu,
    "\\$&"
  );

  return new RegExp(`(^|\\s)${escaped}(?=$|\\s)`, "u")
    .test(text);
}

function detectScript(text) {
  if (/\p{Script=Arabic}/u.test(text)) return "ar";

  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(text)) {
    return "ja";
  }

  if (/\p{Script=Hangul}/u.test(text)) return "ko";
  if (/\p{Script=Cyrillic}/u.test(text)) return "ru";

  if (/\p{Script=Han}/u.test(text)) {
    // Shkrimi Han përdoret si në kinezisht, ashtu edhe në japonisht.
    return "zh";
  }

  return null;
}

function scoreLanguage(text, language) {
  let score = 0;

  for (const phrase of SIGNATURES[language] ?? []) {
    if (containsPhrase(text, phrase)) {
      score += phrase.includes(" ") ? 3 : 1;
    }
  }

  if (DISTINCTIVE_PATTERNS[language]?.test(text)) {
    score += 4;
  }

  return score;
}

function resolveLanguageCode(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const normalized = normalizeLanguageCode(value.trim());
    const base = getBaseLanguage(normalized);

    return SUPPORTED_LANGUAGES.includes(base) ? base : null;
  } catch {
    return null;
  }
}

function detectStrongPhrase(text) {
  const checks = [
    ["sq", /\b(si je|si jeni|çfarë|cfare|faleminderit|ju lutem|mirupafshim)\b/u],
    ["en", /^(what is|what are|how do|how does|where is|where are|who is|who are|why is|why are|when is|when are|can you|could you|would you|will you|tell me|explain|please explain|how can|how to|what does|what did)\b/u],
    ["fr", /^(bonjour|bonsoir|salut|merci|comment allez vous|comment vas tu|qu'est ce que|bonne journée|bonne nuit|au revoir)\b/u],
    ["de", /^(guten tag|guten morgen|guten abend|danke|bitte|auf wiedersehen)\b/u],
    ["es", /^(hola|gracias|buenos días|buenas noches|por favor|adiós)\b/u],
    ["it", /^(ciao|grazie|buongiorno|buonasera|per favore|arrivederci)\b/u],
    ["pt", /^(olá|obrigado|obrigada|bom dia|boa noite|por favor|adeus)\b/u],
    ["nl", /^(hallo|bedankt|goedemorgen|goedemiddag|tot ziens|alsjeblieft)\b/u]
  ];

  for (const [language, pattern] of checks) {
    if (pattern.test(text)) return language;
  }

  return null;
}

export function detectLanguage(input) {
  const text = normalizeForDetection(input);

  if (!text) return "und";

  const scriptLanguage = detectScript(text);
  if (scriptLanguage) return scriptLanguage;

  // Kontrollohet fillimisht shqipja për të shmangur
  // ngatërrimin me fjalët e përbashkëta ndërkombëtare.
  if (DISTINCTIVE_PATTERNS.sq.test(text)) return "sq";

  const strongMatch = detectStrongPhrase(text);
  if (strongMatch) return strongMatch;

  const scores = Object.keys(SIGNATURES)
    .map((language) => ({
      language,
      score: scoreLanguage(text, language)
    }))
    .sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  if (!best || best.score === 0) return "und";

  if (second && best.score === second.score) {
    return "und";
  }

  const wordCount = text.split(/\s+/u).length;

  if (wordCount <= 3 && best.score < 3) {
    return "und";
  }

  return best.language;
}

export function analyzeLanguage(input, options = {}) {
  const text = safeNormalize(input);
  const isEmpty = text.trim().length === 0;

  const detectedLanguage = isEmpty
    ? "und"
    : detectLanguage(text);

  const requestedLanguage = resolveLanguageCode(
    options?.language
  );

  const language = requestedLanguage ?? detectedLanguage;

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
    baseLanguage: language === "und"
      ? "und"
      : getBaseLanguage(language),
    detectedLanguage,
    requestedLanguage,
    isEmpty,
    isSupported: SUPPORTED_LANGUAGES.includes(language),
    grammar,
    metadata: {
      engine: "xsus-international-language-engine",
      version: ENGINE_VERSION,
      detectionMethod: requestedLanguage ? "provided" : "heuristic",
      supportedLanguages: [...SUPPORTED_LANGUAGES]
    }
  };
}

export function getLanguageInfo(languageCode) {
  const code = resolveLanguageCode(languageCode);

  if (!code) return null;

  return {
    code,
    baseLanguage: code,
    language: code,
    ...LANGUAGE_INFO[code],
    supported: true
  };
}

// Kthen kode të thjeshta, për pajtueshmëri me API-n publike:
// ["sq", "en", "fr", ...]
export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

// API shtesë për ndërfaqet që kanë nevojë për emra të plotë.
export function getSupportedLanguageDetails() {
  return SUPPORTED_LANGUAGES.map((code) => ({
    code,
    ...LANGUAGE_INFO[code],
    supported: true
  }));
}
