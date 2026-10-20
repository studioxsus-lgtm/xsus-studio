
export {
  processAIRequest
} from "./core/ai-core.js";

export {
  createAIRequest,
  createAIResponse,
  REQUEST_STATUS,
  SUPPORTED_LANGUAGES
} from "./core/ai-core-contracts.js";

export {
  createRequestContext,
  isValidRequestContext
} from "./core/request-context.js";

export {
  analyzeLanguage,
  detectLanguage,
  getLanguageInfo
} from "./language/language-engine.js";

export {
  analyzeGrammar,
  isGrammarEngineSupported
} from "./language/grammar-engine.js";

export {
  normalizeText,
  normalizeForSearch,
  tokenizeText,
  normalizeLanguageCode,
  getBaseLanguage
} from "./language/normalization.js";

export {
  searchKnowledge,
  registerKnowledgeSource,
  listKnowledgeSources,
  hasKnowledgeSource,
  unregisterKnowledgeSource
} from "./knowledge/knowledge-service.js";

export {
  routeAIRequest
} from "./runtime/router.js";

export {
  registerService,
  getService,
  hasService,
  listServices,
  unregisterService,
  clearServices
} from "./runtime/service-registry.js";
