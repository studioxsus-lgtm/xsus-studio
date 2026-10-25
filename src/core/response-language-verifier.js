/**
 * XSUS AI Core — Response Language Verifier
 * Version: 1.0.0
 *
 * Përgjegjësitë:
 * - Analizimi heuristik i gjuhës së përgjigjes.
 * - Krahasimi me gjuhën e kërkuar.
 * - Identifikimi i mospërputhjeve gjuhësore.
 * - Trajtimi i teksteve të shkurtra dhe të paqarta.
 * - Kthimi i rezultateve të standardizuara.
 *
 * Shënim:
 * Ky modul përdor fjalë karakteristike dhe rregulla.
 * Nuk është model statistikor i trajnuar për identifikimin
 * e gjuhës dhe nuk garanton saktësi për çdo tekst.
 */

export const RESPONSE_LANGUAGE_VERIFIER_VERSION = "1.0.0";

export const SUPPORTED_VERIFIER_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr",
  "de",
  "it",
  "es",
  "pt",
  "nl"
]);

const MIN_TEXT_LENGTH = 20;
const MIN_WORD_COUNT = 4;
const MIN_CONFIDENCE = 0.35;
const MIN_SCORE_MARGIN = 0.12;

const LANGUAGE_PROFILES = Object.freeze({
  sq: {
    words: [
      "dhe",
      "është",
      "janë",
      "për",
      "një",
      "këtë",
      "kjo",
      "këto",
      "atë",
      "nga",
      "me",
      "në",
      "si",
      "që",
      "mund",
      "duhet",
      "përgjigje",
      "gjuhë",
      "shqip",
      "shqipe",
      "faleminderit",
      "mirë",
      "mirëmëngjes",
      "mirupafshim",
      "ju lutem",
      "përshëndetje"
    ],
    markers: ["ë", "ç"],
    phrases: [
      "si jeni",
      "si je",
      "në rregull",
      "si mund të",
      "ju lutem",
      "faleminderit shumë"
    ]
  },

  en: {
    words: [
      "the",
      "and",
      "is",
      "are",
      "was",
      "were",
      "for",
      "with",
      "this",
      "that",
      "these",
      "those",
      "you",
      "your",
      "can",
      "could",
      "should",
      "would",
      "what",
      "when",
      "where",
      "how",
      "why",
      "which",
      "answer",
      "language",
      "because",
      "please",
      "thanks",
      "hello",
      "welcome"
    ],
    markers: [],
    phrases: [
      "how are you",
      "thank you",
      "you are welcome",
      "in order to",
      "for example",
      "good morning"
    ]
  },

  fr: {
    words: [
      "le",
      "la",
      "les",
      "des",
      "une",
      "un",
      "et",
      "est",
      "sont",
      "pour",
      "avec",
      "dans",
      "vous",
      "votre",
      "nous",
      "cela",
      "cette",
      "ces",
      "qui",
      "quoi",
      "comment",
      "pourquoi",
      "mais",
      "donc",
      "parce",
      "réponse",
      "langue",
      "merci",
      "bonjour",
      "salut",
      "être",
      "avoir"
    ],
    markers: ["é", "è", "ê", "à", "ù", "ç", "œ"],
    phrases: [
      "comment allez-vous",
      "s'il vous plaît",
      "merci beaucoup",
      "je suis",
      "il y a",
      "par exemple"
    ]
  },

  de: {
    words: [
      "der",
      "die",
      "das",
      "den",
      "dem",
      "ein",
      "eine",
      "und",
      "ist",
      "sind",
      "für",
      "mit",
      "nicht",
      "auch",
      "aber",
      "weil",
      "was",
      "wie",
      "warum",
      "dieser",
      "diese",
      "dieses",
      "antwort",
      "sprache",
      "bitte",
      "danke",
      "hallo",
      "guten",
      "haben",
      "sein"
    ],
    markers: ["ä", "ö", "ü", "ß"],
    phrases: [
      "guten morgen",
      "guten tag",
      "wie geht es",
      "vielen dank",
      "ich bin",
      "es gibt"
    ]
  },

  it: {
    words: [
      "il",
      "lo",
      "la",
      "gli",
      "le",
      "un",
      "una",
      "e",
      "è",
      "sono",
      "per",
      "con",
      "questo",
      "questa",
      "che",
      "chi",
      "come",
      "perché",
      "anche",
      "ma",
      "risposta",
      "lingua",
      "grazie",
      "ciao",
      "prego",
      "buongiorno",
      "essere",
      "avere"
    ],
    markers: ["à", "è", "é", "ì", "ò", "ù"],
    phrases: [
      "come stai",
      "come sta",
      "grazie mille",
      "per favore",
      "mi chiamo",
      "per esempio"
    ]
  },

  es: {
    words: [
      "el",
      "la",
      "los",
      "las",
      "un",
      "una",
      "unos",
      "unas",
      "y",
      "es",
      "son",
      "para",
      "con",
      "pero",
      "porque",
      "como",
      "cuando",
      "donde",
      "quien",
      "qué",
      "esta",
      "este",
      "esto",
      "respuesta",
      "idioma",
      "gracias",
      "hola",
      "favor",
      "también",
      "ser",
      "estar"
    ],
    markers: ["ñ", "¿", "¡"],
    phrases: [
      "cómo estás",
      "muchas gracias",
      "por favor",
      "buenos días",
      "buenas tardes",
      "por ejemplo"
    ]
  },

  pt: {
    words: [
      "o",
      "a",
      "os",
      "as",
      "um",
      "uma",
      "e",
      "é",
      "são",
      "para",
      "com",
      "não",
      "mas",
      "porque",
      "como",
      "quando",
      "onde",
      "você",
      "vocês",
      "isso",
      "esta",
      "este",
      "resposta",
      "língua",
      "idioma",
      "obrigado",
      "obrigada",
      "olá",
      "também",
      "favor"
    ],
    markers: ["ã", "õ", "ç"],
    phrases: [
      "como vai",
      "tudo bem",
      "muito obrigado",
      "muito obrigada",
      "por favor",
      "bom dia"
    ]
  },

  nl: {
    words: [
      "de",
      "het",
      "een",
      "en",
      "is",
      "zijn",
      "van",
      "voor",
      "met",
      "niet",
      "maar",
      "ook",
      "dit",
      "dat",
      "deze",
      "die",
      "wat",
      "waar",
      "hoe",
      "waarom",
      "antwoord",
      "taal",
      "bedankt",
      "dank",
      "hallo",
      "goed",
      "als",
      "omdat",
      "kunnen",
      "moeten"
    ],
    markers: [],
    phrases: [
      "hoe gaat het",
      "dank je wel",
      "dank u wel",
      "goedemorgen",
      "goedemiddag",
      "alsjeblieft"
    ]
  }
});

function normalizeLanguage(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (SUPPORTED_VERIFIER_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  const regionalMatch = normalized.match(
    /^([a-z]{2})-[a-z]{2,4}$/i
  );

  if (
    regionalMatch &&
    SUPPORTED_VERIFIER_LANGUAGES.includes(
      regionalMatch[1].toLowerCase()
    )
  ) {
    return regionalMatch[1].toLowerCase();
  }

  return null;
}

function normalizeText(text) {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{M}\p{N}'\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return text.match(/[\p{L}\p{M}\p{N}]+(?:['-][\p{L}\p{M}\p{N}]+)*/gu) || [];
}

function countOccurrences(text, phrase) {
  const escaped = phrase.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const pattern = new RegExp(
    `(?:^|\\s)${escaped}(?=\\s|$)`,
    "gu"
  );

  return [...text.matchAll(pattern)].length;
}

function scoreLanguage(text, profile) {
  const words = tokenize(text);

  if (words.length === 0) {
    return {
      score: 0,
      evidence: 0,
      wordCount: 0
    };
  }

  const uniqueWords = new Set(words);
  let evidence = 0;

  for (const word of profile.words) {
    if (word.includes(" ")) {
      continue;
    }

    if (uniqueWords.has(word)) {
      evidence += 1;
    }
  }

  let phraseEvidence = 0;

  for (const phrase of profile.phrases) {
    if (countOccurrences(text, phrase) > 0) {
      phraseEvidence += 2;
    }
  }

  let markerEvidence = 0;

  for (const marker of profile.markers) {
    const occurrences = text.split(marker).length - 1;

    if (occurrences > 0) {
      markerEvidence += Math.min(occurrences, 3);
    }
  }

  const wordEvidence = evidence * 1.5;
  const totalEvidence =
    wordEvidence + phraseEvidence + markerEvidence;

  /*
   * Normalizimi sipas gjatësisë zvogëlon ndikimin e
   * teksteve të gjata, por rezultati mbetet heuristik.
   */
  const lengthFactor = Math.min(words.length / 12, 1);

  const score = Math.min(
    1,
    (totalEvidence / 8) * (0.5 + 0.5 * lengthFactor)
  );

  return {
    score: Number(score.toFixed(4)),
    evidence: totalEvidence,
    wordCount: words.length
  };
}

function createResult({
  valid,
  requestedLanguage,
  detectedLanguage = null,
  matches = null,
  confidence = 0,
  status,
  wordCount = 0,
  errors = []
}) {
  return Object.freeze({
    version: RESPONSE_LANGUAGE_VERIFIER_VERSION,
    valid,
    requestedLanguage,
    detectedLanguage,
    matches,
    confidence: Number(confidence.toFixed(4)),
    status,
    wordCount,
    errors: Object.freeze([...errors])
  });
}

/**
 * Vlerëson gjuhën e një përgjigjeje.
 *
 * @param {object} input
 * @param {string} input.text Teksti i përgjigjes.
 * @param {string} input.requestedLanguage Gjuha e kërkuar.
 * @returns {object} Rezultati i verifikimit.
 */
export function verifyResponseLanguage(input = {}) {
  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return createResult({
      valid: false,
      requestedLanguage: null,
      status: "invalid_input",
      errors: ["Input duhet të jetë objekt."]
    });
  }

  const requestedLanguage = normalizeLanguage(
    input.requestedLanguage
  );

  const errors = [];

  if (typeof input.text !== "string") {
    return createResult({
      valid: false,
      requestedLanguage,
      status: "invalid_text",
      errors: ["Teksti i përgjigjes duhet të jetë string."]
    });
  }

  const text = normalizeText(input.text);
  const words = tokenize(text);

  if (!requestedLanguage) {
    errors.push("Gjuha e kërkuar mungon ose nuk mbështetet.");

    return createResult({
      valid: false,
      requestedLanguage: null,
      status: "unsupported_language",
      wordCount: words.length,
      errors
    });
  }

  if (!text) {
    return createResult({
      valid: false,
      requestedLanguage,
      status: "empty_text",
      errors: ["Teksti i përgjigjes është bosh."]
    });
  }

  if (
    text.length < MIN_TEXT_LENGTH ||
    words.length < MIN_WORD_COUNT
  ) {
    return createResult({
      valid: true,
      requestedLanguage,
      detectedLanguage: null,
      matches: null,
      confidence: 0,
      status: "insufficient_text",
      wordCount: words.length,
      errors: [
        "Teksti është tepër i shkurtër për identifikim të besueshëm."
      ]
    });
  }

  const scores = Object.entries(LANGUAGE_PROFILES)
    .map(([language, profile]) => ({
      language,
      ...scoreLanguage(text, profile)
    }))
    .sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  if (!best || best.score < MIN_CONFIDENCE) {
    return createResult({
      valid: true,
      requestedLanguage,
      detectedLanguage: null,
      matches: null,
      confidence: best?.score ?? 0,
      status: "undetermined",
      wordCount: words.length,
      errors: [
        "Nuk u gjetën prova të mjaftueshme për të përcaktuar gjuhën."
      ]
    });
  }

  const margin = best.score - (second?.score ?? 0);

  /*
   * Nëse dy gjuhë kanë rezultate të afërta, mos deklaro
   * një gjuhë përfundimtare pa prova të mjaftueshme.
   */
  if (margin < MIN_SCORE_MARGIN) {
    return createResult({
      valid: true,
      requestedLanguage,
      detectedLanguage: null,
      matches: null,
      confidence: best.score,
      status: "ambiguous",
      wordCount: words.length,
      errors: [
        "Teksti përmban sinjale të paqarta ose të përbashkëta mes gjuhëve."
      ]
    });
  }

  const matches = best.language === requestedLanguage;

  return createResult({
    valid: true,
    requestedLanguage,
    detectedLanguage: best.language,
    matches,
    confidence: best.score,
    status: matches ? "match" : "mismatch",
    wordCount: words.length,
    errors: matches
      ? []
      : [
          `Gjuha e vlerësuar (${best.language}) ndryshon nga gjuha e kërkuar (${requestedLanguage}).`
        ]
  });
}

export default verifyResponseLanguage;
