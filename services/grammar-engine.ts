// services/grammar-engine.ts

import { analyzeNoun } from "./noun-morphology";
import { analyzeVerb } from "./verb-morphology";
import { parseAlbanianSentence } from "./sentence-parser";
import { analyzeAlbanianSentence } from "./grammar-rules";
import { analyzeAlbanianText } from "./morphology";

export interface IntegratedToken {
  text: string;
  index: number;
  nounLemma: string | null;
  verbLemma: string | null;
  isNegation: boolean;
  noun: ReturnType<typeof analyzeNoun> | null;
  verb: ReturnType<typeof analyzeVerb> | null;
  wordAnalysis?: ReturnType<typeof analyzeAlbanianText>[number];
}

export interface IntegratedGrammarResult {
  language: "sq";
  normalizedText: string;
  sentenceType: ReturnType<typeof analyzeAlbanianSentence>["sentenceType"];
  hasNegation: boolean;
  hasRequestMarker: boolean;
  hasPolitenessMarker: boolean;
  hasConjunctions: boolean;
  detectedConjunctions: string[];
  syntax: ReturnType<typeof parseAlbanianSentence>;
  tokens: IntegratedToken[];
  words: ReturnType<typeof analyzeAlbanianText>;
  statistics: {
    totalWords: number;
    knownWords: number;
    unknownWords: number;
    vocabularyCoverage: number;
  };
}

/**
 * Motori qendror i analizës gramatikore dhe sintaksore për gjuhën shqipe në XSUS AI
 */
export function analyzeAlbanianGrammar(text: string): IntegratedGrammarResult {
  const sentence = analyzeAlbanianSentence(text);
  const syntax = parseAlbanianSentence(text);
  const words = analyzeAlbanianText(sentence.normalizedText);

  // Krijojmë një hartë kërkimi të shpejtë për analizën morfologjike të fjalëve
  const wordAnalysisMap = new Map(
    words.map((w) => [w.surface.toLowerCase(), w])
  );

  const tokens: IntegratedToken[] = syntax.tokens.map((token, idx) => {
    const cleanText = token.text.toLowerCase();
    const wordAnalysis = wordAnalysisMap.get(cleanText);

    return {
      text: token.text,
      index: token.index ?? idx,
      nounLemma: token.nounLemma ?? (wordAnalysis?.partOfSpeech === "noun" ? wordAnalysis.lemma : null),
      verbLemma: token.verbLemma ?? (wordAnalysis?.partOfSpeech === "verb" ? wordAnalysis.lemma : null),
      isNegation: token.isNegation ?? sentence.hasNegation,
      noun: token.nounLemma || wordAnalysis?.partOfSpeech === "noun"
        ? analyzeNoun(token.text)
        : null,
      verb: token.verbLemma || wordAnalysis?.partOfSpeech === "verb"
        ? analyzeVerb(token.text)
        : null,
      wordAnalysis,
    };
  });

  const knownWords = words.filter((w) => w.known);
  const unknownWords = words.filter((w) => !w.known);

  return {
    language: "sq" as const,
    normalizedText: sentence.normalizedText,
    sentenceType: sentence.sentenceType,
    hasNegation: sentence.hasNegation,
    hasRequestMarker: sentence.hasRequestMarker,
    hasPolitenessMarker: sentence.hasPolitenessMarker,
    hasConjunctions: sentence.hasConjunctions,
    detectedConjunctions: sentence.detectedConjunctions,
    syntax,
    tokens,
    words,
    statistics: {
      totalWords: words.length,
      knownWords: knownWords.length,
      unknownWords: unknownWords.length,
      vocabularyCoverage:
        words.length === 0 ? 0 : knownWords.length / words.length,
    },
  };
}
