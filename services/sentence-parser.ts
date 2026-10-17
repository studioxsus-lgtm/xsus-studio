// sentence-parser.ts

import { analyzeNoun } from "./noun-morphology";
import { analyzeVerb } from "./verb-morphology";

export interface SentenceToken {
  text: string;
  index: number;
  nounLemma: string | null;
  verbLemma: string | null;
  isNegation: boolean;
}

export interface SentenceAnalysis {
  text: string;
  tokens: SentenceToken[];
  possibleSubjects: string[];
  possibleVerbs: string[];
  possibleObjects: string[];
  hasNegation: boolean;
}

const NEGATIONS = new Set(["nuk", "s'ka", "s’ka", "mos", "s"]);

const normalize = (value: string) =>
  value.normalize("NFC").toLocaleLowerCase("sq-AL");

export function parseAlbanianSentence(
  input: string
): SentenceAnalysis {
  const text = input.normalize("NFC").trim();

  // Tokenizimi që mbron karakteret shqipe dhe apostrofin
  const words =
    text.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu) ?? [];

  const tokens: SentenceToken[] = words.map((word, index) => {
    const normalized = normalize(word);
    const noun = analyzeNoun(normalized);
    const verb = analyzeVerb(normalized);

    return {
      text: word,
      index,
      nounLemma: noun.lemma,
      verbLemma: verb.lemma,
      isNegation: NEGATIONS.has(normalized),
    };
  });

  const possibleSubjects: string[] = [];
  const possibleVerbs: string[] = [];
  const possibleObjects: string[] = [];

  for (const token of tokens) {
    if (token.verbLemma) {
      possibleVerbs.push(token.verbLemma);
    }

    if (token.nounLemma) {
      // Heuristikë sintaksore: emri para foljes së parë priret të jetë kryefjalë,
      // ndërsa emri pas foljes priret të jetë kundrinor.
      const firstVerbIndex = tokens.findIndex(
        (item) => item.verbLemma !== null
      );

      if (firstVerbIndex >= 0 && token.index < firstVerbIndex) {
        possibleSubjects.push(token.nounLemma);
      } else if (
        firstVerbIndex >= 0 &&
        token.index > firstVerbIndex
      ) {
        possibleObjects.push(token.nounLemma);
      } else if (firstVerbIndex === -1) {
        // Nëse nuk ka folje ende, e konsiderojmë subjekt potencial
        possibleSubjects.push(token.nounLemma);
      }
    }
  }

  return {
    text,
    tokens,
    possibleSubjects: [...new Set(possibleSubjects)],
    possibleVerbs: [...new Set(possibleVerbs)],
    possibleObjects: [...new Set(possibleObjects)],
    hasNegation: tokens.some((token) => token.isNegation),
  };
}
