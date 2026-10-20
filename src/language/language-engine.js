
import {
  normalizeText,
  normalizeLanguageCode,
  getBaseLanguage
} from "./normalization.js";

import { analyzeGrammar } from "./grammar-engine.js";

const ENGINE_VERSION = "1.2.0";

const SUPPORTED_LANGUAGES = Object.freeze([
  "sq", "en", "fr", "de", "es", "it", "pt", "nl",
  "ar", "zh", "ja", "ko", "ru"
]);

const LANGUAGE_SIGNATURES = Object.freeze({
  sq: [
    "dhe", "eshte", "jane", "per", "nje", "që", "cfare",
    "si quhet", "faleminderit", "pershendetje", "shume",
    "mire", "une", "ju lutem", "nuk e di", "si jeni"
  ],
  en: [
    "the", "is", "are", "and", "what", "how", "why",
    "you", "this", "with", "hello", "thanks", "please",
    "because", "which", "would", "have", "your"
  ],
  fr: [
    "le", "la", "les", "est", "et", "une", "des", "quoi",
    "comment", "pourquoi", "bonjour", "merci", "avec",
    "vous", "je suis", "nous", "pas", "pour"
  ],
  de: [
    "der", "die", "das", "und", "ist", "was", "wie",
    "nicht", "hallo", "danke", "ich", "bin", "mit",
    "ein", "eine", "auf", "für"
  ],
  es: [
    "el", "los", "las", "que", "es", "una", "como",
    "por que", "hola", "gracias", "porque", "usted",
    "para", "con", "estoy", "buenos"
  ],
  it: [
    "il", "gli", "che", "una", "sono", "come", "perche",
    "ciao", "grazie", "buongiorno", "con", "non",
    "questo", "questa", "per", "buona"
  ],
  pt: [
    "nao", "uma", "sao", "que", "para", "como", "voce",
    "ola", "obrigado", "obrigada", "com", "estou",
    "muito", "porque", "bom", "boa"
  ],
  nl: [
    "het", "een", "van", "zijn", "niet", "hoe", "wat",
    "hallo", "bedankt", "dank je", "met", "voor",
    "ik", "jij", "wij", "goed"
  ]
});

const DISTINCTIVE_MARKERS = Object.freeze({
  sq: [
    "shqip", "faleminderit", "pershendetje", "cfare",
    "quhesh", "quhet", "jane", "eshte", "pershendetje"
  ],
  en: [
    "hello", "thanks", "please", "because", "would",
    "which", "they", "their", "there", "about"
  ],
  fr: [
    "bonjour", "merci", "pourquoi", "aujourd hui",
    "francais", "avec", "beaucoup", "je suis"
  ],
  de: [
    "danke", "hallo", "deutsch", "nicht", "ich",
    "auch", "bitte", "tschuss"
  ],
  es: [
    "hola", "gracias", "espanol", "buenos dias",
    "por favor", "tambien", "estoy"
  ],
  it: [
    "ciao", "grazie", "italiano", "buongiorno",
    "arrivederci", "perche", "sono"
  ],
  pt: [
    "obrigado", "obrigada", "portugues", "voce",
    "bom dia", "tudo bem", "nao"
  ],
  nl: [
    "bedankt", "nederlands", "dank je", "alsjeblieft",
    "goedemorgen", "tot ziens"
  ]
});

function normalizeForDetection(value) {
  return normalizeText(String(value ?? ""))
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("und")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  if (!text || !phrase) return false;

  const normalizedText = ` ${text} `;
  const normalizedPhrase = ` ${normalizeForDetection(phrase)} `;

  return normalizedText.includes(normalizedPhrase);
}

function detectScript(text) {
  if (/[\u0600-\u06FF]/u.test(text)) return "ar";
  if (/[\u4E00-\u9FFF]/u.test(text)) return "zh";
  if (/[\u3040-\u30FF]/u.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/u.test(text)) return "ko";
  if (/[\u0400-\u04FF]/u.test(text)) return "ru";

  return null;
}

function scoreLanguage(normalizedText, language) {
  const signatures = LANGUAGE_SIGNATURES[language] || [];
  const distinctive = DISTINCTIVE_MARKERS[language] || [];

  let score = 0;

  for (const phrase of signatures) {
    if (containsPhrase(normalizedText, phrase)) {
      score += phrase.includes(" ") ? 3 : 1;
    }
  }

  for (const phrase of distinctive) {
    if (containsPhrase(normalizedText, phrase)) {
      score += 4;
    }
  }

  return score;
}

function detectAlbanian(normalizedText) {
  const strongMarkers = [
    "eshte",
    "jane",
    "cfare",
    "pershendetje",
    "faleminderit",
    "shqip",
    "quhesh",
    "quhet",
    "ju lutem",
    "si jeni",
    "nuk e di",
    "per shembull"
  ];

  return strongMarkers.some(marker =>
    containsPhrase(normalizedText, marker)
  );
}

export function detectLanguage(input) {
  if (typeof input !== "string" || !input.trim()) {
    return "und";
  }

  const text = normalizeText(input);
  const scriptLanguage = detectScript(text);

  if (scriptLanguage) {
    return scriptLanguage;
  }

  const normalized = normalizeForDetection(text);

  if (!normalized) {
    return "und";
  }

  if (detectAlbanian(normalized)) {
    return "sq";
  }

  const words = normalized.split(/\s+/u);

  // Tekstet tepër të shkurtra zakonisht nuk japin prova të mjaftueshme.
  if (words.length === 1) {
    const singleWordScores = Object.keys(LANGUAGE_SIGNATURES)
      .map(language => ({
        language,
        score: scoreLanguage(normalized, language)
      }))
      .sort((a, b) => b.score - a.score);

    if (
      singleWordScores[0]?.score >= 4 &&
      singleWordScores[0].score > (singleWordScores[1]?.score || 0)
    ) {
      return singleWordScores[0].language;
    }

    return "und";
  }

  const scores = Object.keys(LANGUAGE_SIGNATURES)
    .map(language => ({
      language,
      score: scoreLanguage(normalized, language)
    }))
    .sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  if (!best || best.score === 0) {
    return "und";
  }

  // Shmang vendime të pasigurta kur gjuhët kanë pikëzim të ngjashëm.
  if (second && best.score === second.score) {
    return "und";
  }

  // Për tekst të shkurtër kërkojmë më shumë prova.
  if (words.length <= 3 && best.score < 4) {
    return "und";
  }

  return best.language;
}

export function analyzeLanguage(input, options = {}) {
  const text = normalizeText(
    typeof input === "string" ? input : ""
  );

  const requestedLanguage = normalizeLanguageCode(
    options?.language || "auto"
  );

  const detectedLanguage = requestedLanguage === "auto"
    ? detectLanguage(text)
    : getBaseLanguage(requestedLanguage);

  const language = detectedLanguage === "und"
    ? "sq"
    : detectedLanguage;

  return {
    text,
    language,
    baseLanguage: getBaseLanguage(language),
    isEmpty: text.length === 0,
    grammar: analyzeGrammar(text, language),
    metadata: {
      engine: "xsus-international-language-engine",
      version: ENGINE_VERSION,
      detectionMethod: requestedLanguage === "auto"
        ? "heuristic"
        : "provided",
      confidence: text.length === 0
        ? 0
        : detectedLanguage === "und"
          ? 0
          : 1,
      supportedLanguages: [...SUPPORTED_LANGUAGES]
    }
  };
}

export function getLanguageInfo(language) {
  const code = normalizeLanguageCode(language);

  if (code === "auto") {
    return {
      code,
      baseLanguage: "auto",
      name: "Automatic detection"
    };
  }

  let name = code;

  try {
    name = new Intl.DisplayNames(["en"], {
      type: "language"
    }).of(code) || code;
  } catch {
    // Kthe kodin nëse mjedisi nuk e mbështet emërtimin.
  }

  return {
    code,
    baseLanguage: getBaseLanguage(code),
    name
  };
}

export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}
