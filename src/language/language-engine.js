import {
  normalizeText,
  normalizeLanguageCode,
  getBaseLanguage
} from "./normalization.js";

import { analyzeGrammar } from "./grammar-engine.js";

const SUPPORTED_LANGUAGES = Object.freeze([
  "sq", "en", "fr", "de", "es", "it", "pt", "nl",
  "ar", "zh", "ja", "ko", "ru"
]);

const LANGUAGE_SIGNATURES = [
  {
    language: "sq",
    words: [" dhe ", " është ", " jane ", " janë ", " për ", " nje ", " një ", " që ", " çfarë ", " si quhet "]
  },
  {
    language: "en",
    words: [" the ", " is ", " are ", " and ", " what ", " how ", " why ", " you ", " this ", " with "]
  },
  {
    language: "fr",
    words: [" le ", " la ", " les ", " est ", " et ", " une ", " des ", " quoi ", " comment ", " pourquoi ", " je suis "]
  },
  {
    language: "de",
    words: [" der ", " die ", " das ", " und ", " ist ", " was ", " wie ", " nicht "]
  },
  {
    language: "es",
    words: [" el ", " los ", " las ", " que ", " es ", " una ", " como ", " por qué "]
  },
  {
    language: "it",
    words: [" il ", " gli ", " che ", " una ", " sono ", " come ", " perché "]
  },
  {
    language: "pt",
    words: [" não ", " uma ", " são ", " que ", " para ", " como ", " você "]
  },
  {
    language: "nl",
    words: [" het ", " een ", " van ", " zijn ", " niet ", " hoe ", " wat "]
  }
];

function normalizeForDetection(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectScript(text) {
  if (/[\u0600-\u06FF]/u.test(text)) return "ar";
  if (/[\u4E00-\u9FFF]/u.test(text)) return "zh";
  if (/[\u3040-\u30FF]/u.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/u.test(text)) return "ko";
  if (/[\u0400-\u04FF]/u.test(text)) return "ru";
  return null;
}

function scoreLanguage(text, words, language) {
  let score = 0;

  for (const signature of LANGUAGE_SIGNATURES) {
    if (signature.language !== language) continue;

    for (const phrase of signature.words) {
      const normalizedPhrase = normalizeForDetection(phrase);
      if (!normalizedPhrase) continue;

      const paddedText = ` ${text} `;
      const paddedPhrase = ` ${normalizedPhrase} `;

      if (paddedText.includes(paddedPhrase)) {
        score += normalizedPhrase.includes(" ") ? 3 : 2;
      }
    }
  }

  const distinctiveWords = {
    sq: ["shqip", "mirë", "faleminderit", "përshëndetje", "është", "çfarë"],
    en: ["hello", "thanks", "please", "because", "which", "would"],
    fr: ["bonjour", "merci", "pourquoi", "avec", "vous", "suis"]
  };

  for (const word of distinctiveWords[language] || []) {
    if (words.includes(normalizeForDetection(word))) {
      score += 3;
    }
  }

  return score;
}

export function analyzeLanguage(input, options = {}) {
  const text = normalizeText(input);
  const requestedLanguage = normalizeLanguageCode(
    options.language || "auto"
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
      version: "1.1.0",
      detectionMethod: requestedLanguage === "auto"
        ? "heuristic"
        : "provided",
      supportedLanguages: [...SUPPORTED_LANGUAGES]
    }
  };
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

  const words = normalized.split(/\s+/u);
  const paddedText = ` ${normalized} `;

  // Fjalë dhe shprehje karakteristike shqipe.
  const albanianMarkers = [
    " është ", " janë ", " çfarë ", " përshëndetje ",
    " faleminderit ", " mirë ", " shumë ", " unë ",
    " ju lutem ", " si quhesh ", " si jeni "
  ];

  if (
    albanianMarkers.some(marker =>
      paddedText.includes(normalizeForDetection(marker))
    )
  ) {
    return "sq";
  }

  let bestLanguage = "und";
  let bestScore = 0;
  let secondBestScore = 0;

  for (const signature of LANGUAGE_SIGNATURES) {
    const score = scoreLanguage(
      normalized,
      words,
      signature.language
    );

    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestLanguage = signature.language;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  }

  // Tekstet shumë të shkurtra janë të vështira për t'u klasifikuar.
  if (words.length < 2 && bestScore < 3) {
    return "und";
  }

  // Kur rezultatet janë tepër të afërta, mos pretendo siguri.
  if (bestScore === 0 || bestScore === secondBestScore) {
    return "und";
  }

  return bestLanguage;
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
    // Përdor kodin nëse emri nuk mund të përcaktohet.
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
