
/**
 * XSUS AI Core — Public API
 * Exports the supported public interfaces.
 */

export {
  processAIRequest,
  AI_CORE_VERSION,
} from "./core/ai-core.js";

export {
  XSUS_CORE_VERSION,
  SUPPORTED_LANGUAGES,
  REQUEST_TYPES,
  AI_ERROR_CODES,
  createAIRequest,
  createAIResponse,
  createAIErrorResponse,
} from "./core/ai-core-contracts.js";

export {
  createRequestContext,
  isValidRequestContext,
  REQUEST_CONTEXT_VERSION,
} from "./core/request-context.js";

export {
  analyzeLanguage,
  detectLanguage,
  getLanguageInfo,
  getSupportedLanguages,
} from "./language/language-engine.js";

export {
  analyzeGrammar,
  isGrammarEngineSupported,
} from "./language/grammar-engine.js";

export {
  normalizeText,
  normalizeForSearch,
  tokenizeText,
  normalizeLanguageCode,
  getBaseLanguage,
} from "./language/normalization.js";

export {
  searchKnowledge,
  registerKnowledgeSource,
  listKnowledgeSources,
  hasKnowledgeSource,
  unregisterKnowledgeSource,
} from "./knowledge/knowledge-service.js";

export {
  routeAIRequest,
} from "./runtime/router.js";

export {
  registerService,
  getService,
  hasService,
  listServices,
  unregisterService,
  clearServices,
} from "./runtime/service-registry.js";
