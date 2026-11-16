/**
 * Hyper XSUS Core — Unicode Tokenization Engine v1.0.0
 * Deterministic lexical tokens with UTF-16 source offsets.
 * No grammatical or language-identification claims.
 */
import { createTextBoundaryEngine } from "./text-boundary-engine.js";
export const UNICODE_TOKENIZATION_VERSION = "1.0.0";
const TOKEN = /[\p{Letter}\p{Mark}]+(?:['’][\p{Letter}\p{Mark}]+)*|[\p{Number}]+(?:[.,][\p{Number}]+)*|[^\p{White_Space}]/gu;
export function createUnicodeTokenizationEngine({
  maxCodePoints = 4096, maxTokens = 2048
} = {}) {
  if (!Number.isSafeInteger(maxTokens) || maxTokens < 1 || maxTokens > 100000)
    throw new TypeError("Invalid Unicode tokenization configuration.");
  const boundary = createTextBoundaryEngine({ maxCodePoints });
  function tokenize(value) {
    const { text } = boundary.normalize(value);
    const tokens = [];
    for (const match of text.matchAll(TOKEN)) {
      if (tokens.length >= maxTokens) throw new RangeError("Unicode token limit exceeded.");
      const token = match[0];
      const kind = /^\p{Letter}/u.test(token) ? "word" :
        /^\p{Number}/u.test(token) ? "number" : "symbol";
      tokens.push(Object.freeze({
        value: token, kind, start: match.index, end: match.index + token.length
      }));
    }
    return Object.freeze({
      version: UNICODE_TOKENIZATION_VERSION,
      normalizedText: text, tokens: Object.freeze(tokens), count: tokens.length
    });
  }
  return Object.freeze({ version: UNICODE_TOKENIZATION_VERSION, tokenize });
}
