/**

* XSUS AI Core — Public API
* Version: 1.3.0
* 
* Eksporton ndërfaqet publike të XSUS AI Core.
  */

import {
processAIRequest,
AI_CORE_VERSION,
} from "./core/ai-core.js";

import {
XSUS_CORE_VERSION,
SUPPORTED_LANGUAGES,
REQUEST_TYPES,
AI_ERROR_CODES,
createAIRequest,
createAIResponse,
createAIErrorResponse,
} from "./core/ai-core-contracts.js";

import {
createRequestContext,
isValidRequestContext,
REQUEST_CONTEXT_VERSION,
} from "./core/request-context.js";

import {
analyzeLanguage,
detectLanguage,
getLanguageInfo,
getSupportedLanguages,
} from "./language/language-engine.js";

import {
analyzeGrammar,
isGrammarEngineSupported,
} from "./language/grammar-engine.js";

import {
normalizeText,
normalizeForSearch,
tokenizeText,
normalizeLanguageCode,
getBaseLanguage,
} from "./language/normalization.js";

import {
searchKnowledge,
registerKnowledgeSource,
listKnowledgeSources,
hasKnowledgeSource,
unregisterKnowledgeSource,
} from "./knowledge/knowledge-service.js";

import {
routeAIRequest,
} from "./runtime/router.js";

import {
registerService,
getService,
hasService,
listServices,
unregisterService,
clearServices,
} from "./runtime/service-registry.js";

/**

* Lista publike e kodeve të gjuhëve.
* Kthen kopje për të mos ekspozuar listën origjinale.
  */
  function getPublicSupportedLanguages() {
  return [...getSupportedLanguages()];
  }

/**

* Objekti kryesor publik i XSUS AI.
  */
  export const XSUSAI = Object.freeze({
  get version() {
  return AI_CORE_VERSION;
  },

get coreVersion() {
return XSUS_CORE_VERSION;
},

processAIRequest,

analyzeLanguage,
detectLanguage,
getLanguageInfo,
getSupportedLanguages: getPublicSupportedLanguages,

analyzeGrammar,
isGrammarEngineSupported,

createAIRequest,
createAIResponse,
createAIErrorResponse,

createRequestContext,
isValidRequestContext,

searchKnowledge,
registerKnowledgeSource,
listKnowledgeSources,
hasKnowledgeSource,
unregisterKnowledgeSource,

routeAIRequest,

registerService,
getService,
hasService,
listServices,
unregisterService,
clearServices,
});

/**

* Eksportet e drejtpërdrejta mbeten të disponueshme.
  */
  export {
  processAIRequest,
  AI_CORE_VERSION,

XSUS_CORE_VERSION,
SUPPORTED_LANGUAGES,
REQUEST_TYPES,
AI_ERROR_CODES,
createAIRequest,
createAIResponse,
createAIErrorResponse,

createRequestContext,
isValidRequestContext,
REQUEST_CONTEXT_VERSION,

analyzeLanguage,
detectLanguage,
getLanguageInfo,
analyzeGrammar,
isGrammarEngineSupported,

normalizeText,
normalizeForSearch,
tokenizeText,
normalizeLanguageCode,
getBaseLanguage,

searchKnowledge,
registerKnowledgeSource,
listKnowledgeSources,
hasKnowledgeSource,
unregisterKnowledgeSource,

routeAIRequest,

registerService,
getService,
hasService,
listServices,
unregisterService,
clearServices,
};

/**

* Lista e gjuhëve për API-në publike.
  */
  export { getPublicSupportedLanguages as getSupportedLanguages };
