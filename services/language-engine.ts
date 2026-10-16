import { analyzeAlbanianText } from "./morphology";
import { analyzeAlbanianSentence } from "./grammar-rules";

export function analyzeAlbanian(text: string) {
  const sentence = analyzeAlbanianSentence(text);
  const words = analyzeAlbanianText(sentence.normalizedText);

  const knownWords = words.filter((word) => word.known);
  const unknownWords = words.filter((word) => !word.known);

  return {
    language: "sq" as const,
    normalizedText: sentence.normalizedText,
    sentence,
    words,
    statistics: {
      totalWords: words.length,
      knownWords: knownWords.length,
      unknownWords: unknownWords.length,
      vocabularyCoverage:
        words.length === 0
          ? 0
          : knownWords.length / words.length,
    },
  };
}
