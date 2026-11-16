import { createTextBoundaryEngine } from "./text-boundary-engine.js";
/** Written-language sentence boundaries; deterministic, no external model dependency. */
export const SENTENCE_SEGMENTATION_VERSION = "1.0.0";
export function createSentenceSegmentationEngine({ maxCodePoints = 4096, maxSentences = 256 } = {}) {
  if (!Number.isSafeInteger(maxSentences) || maxSentences < 1 || maxSentences > 10000)
    throw new TypeError("Invalid sentence segmentation configuration.");
  const boundary = createTextBoundaryEngine({ maxCodePoints });
  function segment(value) {
    const { text } = boundary.normalize(value);
    const sentences = [];
    // Conservative punctuation splitting; abbreviations and quotations need a language-specific engine.
    const pattern = /[^.!?。！？\n]+(?:[.!?。！？]+|(?=\n|$))/gu;
    for (const match of text.matchAll(pattern)) {
      const content = match[0].trim();
      if (!content) continue;
      if (sentences.length >= maxSentences) throw new RangeError("Sentence limit exceeded.");
      sentences.push(Object.freeze({ text: content, start: match.index, end: match.index + match[0].length }));
    }
    return Object.freeze({ version: SENTENCE_SEGMENTATION_VERSION, sentences: Object.freeze(sentences), normalizedText: text });
  }
  return Object.freeze({ version: SENTENCE_SEGMENTATION_VERSION, segment });
}
