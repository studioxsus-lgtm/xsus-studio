// grammar-engine.ts

import { analyzeNoun } from "./noun-morphology";
import { analyzeVerb } from "./verb-morphology";
import { parseAlbanianSentence } from "./sentence-parser";
import { analyzeAlbanianSentence } from "./grammar-rules";

export interface IntegratedToken {
  text: string;
  index: number;
  nounLemma: string | null;
  verbLemma: string | null;
  isNegation: boolean;
  noun: ReturnType<typeof analyzeNoun> | null;
  verb: ReturnType<typeof analyzeVerb> | null;
}

export function analyzeAlbanianGrammar(text: string) {
  const sentence = analyzeAlbanianSentence(text);
  const syntax = parseAlbanianSentence(text);

  const tokens: IntegratedToken[] = syntax.tokens.map((token) => ({
    ...token,
    noun: token.nounLemma
      ? analyzeNoun(token.text)
      : null,
    verb: token.verbLemma
      ? analyzeVerb(token.text)
      : null,
  }));

  return {
    language: "sq" as const,
    normalizedText: sentence.normalizedText,
    sentenceType: sentence.sentenceType,
    hasNegation: sentence.hasNegation,
    hasRequestMarker: sentence.hasRequestMarker,
    hasPolitenessMarker: sentence.hasPolitenessMarker,
    syntax,
    tokens,
  };
}
