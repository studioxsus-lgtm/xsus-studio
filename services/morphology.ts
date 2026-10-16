// services/morphology.ts

import {
  lookupAlbanianForm,
  type AlbanianLexiconEntry,
} from "./albanian-lexicon";

export interface WordAnalysis {
  surface: string;
  lemma: string | null;
  partOfSpeech: AlbanianLexiconEntry["partOfSpeech"] | "unknown";
  known: boolean;
  confidence: number;
  meaning?: string;
}

export function analyzeAlbanianWord(
  input: string
): WordAnalysis {
  const surface = input
    .normalize("NFC")
    .toLocaleLowerCase("sq-AL");

  const entry = lookupAlbanianForm(surface);

  if (!entry) {
    return {
      surface,
      lemma: null,
      partOfSpeech: "unknown",
      known: false,
      confidence: 0,
    };
  }

  return {
    surface,
    lemma: entry.lemma,
    partOfSpeech: entry.partOfSpeech,
    known: true,
    confidence: 0.99,
    meaning: entry.meaning,
  };
}

export function analyzeAlbanianText(
  text: string
): WordAnalysis[] {
  const tokens =
    text.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? [];

  return tokens.map(analyzeAlbanianWord);
}
