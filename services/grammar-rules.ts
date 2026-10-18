// services/grammar-rules.ts

export type SentenceType =
  | "question"
  | "command"
  | "exclamation"
  | "statement"
  | "unknown";

export interface AlbanianSentenceAnalysis {
  normalizedText: string;
  sentenceType: SentenceType;
  hasNegation: boolean;
  hasPolitenessMarker: boolean;
  hasRequestMarker: boolean;
  hasQuestionWord: boolean;
  hasConjunctions: boolean;
  detectedConjunctions: string[];
}

const QUESTION_WORDS = new Set([
  "kush",
  "çfarë",
  "cfare",
  "ç",
  "kur",
  "ku",
  "pse",
  "si",
  "sa",
  "cili",
  "cila",
  "cilët",
  "cilat",
  "kujt",
  "kë",
  "ke",
  "nga",
  "prej",
]);

const NEGATION_WORDS = new Set([
  "nuk",
  "s'",
  "s’",
  "as",
  "mos",
]);

const POLITENESS_MARKERS = [
  "ju lutem",
  "të lutem",
  "te lutem",
  "të lutem shumë",
  "faleminderit",
  "faleminderit shumë",
  "me respekt",
  "me kënaqësi",
];

const REQUEST_MARKERS = [
  "më trego",
  "me trego",
  "më shpjego",
  "me shpjego",
  "më ndihmo",
  "me ndihmo",
  "a mund të",
  "a mundesh",
  "do të doja",
  "mund të më",
  "krijo",
  "gjenero",
  "shkruaj",
  "më bëj",
  "me bej",
];

const CONJUNCTIONS = [
  "sepse",
  "pasi",
  "për shkak se",
  "prandaj",
  "megjithatë",
  "mirëpo",
  "por",
  "dhe",
  "edhe",
  "apo",
  "ose",
  "që",
  "neuse",
  "nëse",
];

export function analyzeAlbanianSentence(
  input: string
): AlbanianSentenceAnalysis {
  const normalizedText = input
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();

  const text = normalizedText.toLocaleLowerCase("sq-AL");

  const words = new Set(
    text.match(/[\p{L}\p{M}’']+/gu) ?? []
  );

  const hasQuestionWord = [...QUESTION_WORDS].some(
    (word) => words.has(word)
  );

  const hasNegation = [...NEGATION_WORDS].some(
    (word) => words.has(word)
  );

  const hasPolitenessMarker = POLITENESS_MARKERS.some(
    (marker) => text.includes(marker)
  );

  const hasRequestMarker = REQUEST_MARKERS.some(
    (marker) => text.includes(marker)
  );

  const detectedConjunctions = CONJUNCTIONS.filter(
    (conj) => text.includes(conj)
  );
  const hasConjunctions = detectedConjunctions.length > 0;

  let sentenceType: SentenceType = "statement";

  if (!text) {
    sentenceType = "unknown";
  } else if (text.endsWith("?") || hasQuestionWord) {
    sentenceType = "question";
  } else if (text.endsWith("!")) {
    sentenceType = "exclamation";
  } else if (hasRequestMarker || /^mos\b/.test(text)) {
    sentenceType = "command";
  }

  return {
    normalizedText,
    sentenceType,
    hasNegation,
    hasPolitenessMarker,
    hasRequestMarker,
    hasQuestionWord,
    hasConjunctions,
    detectedConjunctions,
  };
}
