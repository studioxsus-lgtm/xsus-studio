/**
 * Hyper XSUS Core — Read-only Language Processing Diagnostics.
 * Aggregates immutable pipeline results without storing user text or engine output.
 */
export const LANGUAGE_PROCESSING_DIAGNOSTICS_VERSION = "1.0.0";
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
export function createLanguageProcessingDiagnostics({ maxSentences = 256 } = {}) {
  if (!Number.isSafeInteger(maxSentences) || maxSentences < 1 || maxSentences > 10000)
    throw new TypeError("Invalid diagnostics configuration.");
  function summarize(result) {
    if (!result || !Array.isArray(result.sentences) || result.sentences.length > maxSentences ||
        !Number.isSafeInteger(result.tokenCount) || result.tokenCount < 0)
      throw new TypeError("Invalid language processing result.");
    const engines = new Map();
    let degradedSentences = 0;
    for (const sentence of result.sentences) {
      if (!sentence || typeof sentence.engine !== "string" || !ID.test(sentence.engine) ||
          typeof sentence.degraded !== "boolean")
        throw new TypeError("Invalid language processing sentence.");
      engines.set(sentence.engine, (engines.get(sentence.engine) ?? 0) + 1);
      if (sentence.degraded) degradedSentences++;
    }
    const execution = result.execution;
    if (!execution || !Number.isSafeInteger(execution.attempts) ||
        !Number.isSafeInteger(execution.outputs) || execution.attempts < 0 ||
        execution.outputs !== result.sentences.length)
      throw new TypeError("Invalid language processing execution.");
    return Object.freeze({
      version: LANGUAGE_PROCESSING_DIAGNOSTICS_VERSION,
      sentenceCount: result.sentences.length, tokenCount: result.tokenCount,
      degradedSentences, engineAttempts: execution.attempts,
      engineUsage: Object.freeze([...engines].sort(([a], [b]) => a.localeCompare(b))
        .map(([engine, count]) => Object.freeze({ engine, count }))),
      containsUserText: false
    });
  }
  return Object.freeze({ version: LANGUAGE_PROCESSING_DIAGNOSTICS_VERSION, summarize });
}
