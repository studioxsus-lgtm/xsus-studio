/**
 * Hyper XSUS Core — Written Language Processing Pipeline v1.0.0
 * Integrates Unicode normalization, sentence segmentation, bounded context,
 * isolated language-engine routing, validated outputs, and safe failover.
 * Does not authenticate callers, persist messages, or infer languages.
 */
import { createTextBoundaryEngine } from "./text-boundary-engine.js";
import { createSentenceSegmentationEngine } from "./sentence-segmentation-engine.js";
import { createEngineRoutingCoordinator } from "./engine-routing-coordinator.js";
import { createEngineExecutionBudget } from "./engine-execution-budget.js";
import { createWrittenScriptProfileEngine } from "./written-script-profile-engine.js";
import { createUnicodeTokenizationEngine } from "./unicode-tokenization-engine.js";
export const WRITTEN_LANGUAGE_PIPELINE_VERSION = "1.0.0";
const LANG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/;
export function createWrittenLanguagePipeline({
  engines, maxCodePoints = 4096, maxSentences = 64,
  maxContextMessages = 8, maxContextCodePoints = 2048,
  maxTotalContextCodePoints = 8192,
  failureThreshold = 3, resetAfterMs = 30000, clock = Date.now,
  maxOutputDepth = 8, maxOutputNodes = 2048,
  maxEngineAttempts = 256, maxTokens = 2048
} = {}) {
  if (!Number.isSafeInteger(maxContextMessages) || maxContextMessages < 0 || maxContextMessages > 64 ||
      !Number.isSafeInteger(maxContextCodePoints) || maxContextCodePoints < 1 || maxContextCodePoints > 100000 ||
      !Number.isSafeInteger(maxTotalContextCodePoints) || maxTotalContextCodePoints < 1 || maxTotalContextCodePoints > 1000000)
    throw new TypeError("Invalid written language context configuration.");
  const input = createTextBoundaryEngine({ maxCodePoints });
  const contextBoundary = createTextBoundaryEngine({ maxCodePoints: maxContextCodePoints });
  const segmentation = createSentenceSegmentationEngine({ maxCodePoints, maxSentences });
  const scripts = createWrittenScriptProfileEngine({ maxCodePoints });
  const tokenizer = createUnicodeTokenizationEngine({ maxCodePoints, maxTokens });
  const router = createEngineRoutingCoordinator({
    engines, maxCodePoints, failureThreshold, resetAfterMs, clock, maxOutputDepth, maxOutputNodes
  });
  function prepareContext(messages) {
    if (!Array.isArray(messages) || messages.length > maxContextMessages)
      throw new TypeError("Invalid written language context.");
    let totalCodePoints = 0;
    return Object.freeze(messages.map(message => {
      if (!message || (message.role !== "user" && message.role !== "assistant"))
        throw new TypeError("Invalid written language context message.");
      const content = contextBoundary.normalize(message.content).text;
      totalCodePoints += Array.from(content).length;
      if (totalCodePoints > maxTotalContextCodePoints)
        throw new RangeError("Total written language context limit exceeded.");
      if (content.trim().length === 0)
        throw new TypeError("Empty written language context message.");
      return Object.freeze({ role: message.role, content });
    }));
  }
  async function process({ text, language = "en", context = [] } = {}) {
    if (typeof language !== "string" || !LANG.test(language))
      throw new TypeError("Invalid written language code.");
    const normalized = input.normalize(text);
    if (normalized.empty) throw new TypeError("Empty written language request.");
    const safeContext = prepareContext(context);
    const segmented = segmentation.segment(normalized.text);
    const tokenized = tokenizer.tokenize(normalized.text);
    if (segmented.sentences.length === 0)
      throw new TypeError("No processable written language sentences.");
    const budget = createEngineExecutionBudget({ maxAttempts: maxEngineAttempts, maxOutputs: maxSentences });
    const outputs = [];
    for (const sentence of segmented.sentences) {
      const routed = await router.route({ text: sentence.text, language, context: safeContext,
        onAttempt: budget.claimAttempt });
      budget.claimOutput();
      outputs.push(Object.freeze({
        text: sentence.text, start: sentence.start, end: sentence.end,
        engine: routed.engine, result: routed.result, degraded: routed.degraded
      }));
    }
    return Object.freeze({
      version: WRITTEN_LANGUAGE_PIPELINE_VERSION, language,
      normalizedText: normalized.text, scriptProfile: scripts.profile(normalized.text),
      tokens: tokenized.tokens, tokenCount: tokenized.count,
      contextMessages: safeContext.length,
      sentences: Object.freeze(outputs), degraded: outputs.some(item => item.degraded),
      execution: budget.snapshot(), readOnly: true
    });
  }
  return Object.freeze({ version: WRITTEN_LANGUAGE_PIPELINE_VERSION, process, health: router.health });
}
