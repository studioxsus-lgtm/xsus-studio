/**
 * XSUS AI Core — Public API
 * Version: 1.3.0
 *
 * Eksporton ndërfaqet publike të XSUS AI Core.
 */

// ============================================================
// AI CORE
// ============================================================

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

// ============================================================
// REQUEST CONTEXT
// ============================================================

import {
  createRequestContext,
  isValidRequestContext,
  REQUEST_CONTEXT_VERSION,
} from "./core/request-context.js";

// ============================================================
// LANGUAGE ENGINE
// ============================================================

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

// ============================================================
// KNOWLEDGE SERVICE
// ============================================================

import {
  searchKnowledge,
  registerKnowledgeSource,
  listKnowledgeSources,
  hasKnowledgeSource,
  unregisterKnowledgeSource,
} from "./knowledge/knowledge-service.js";

// ============================================================
// RUNTIME
// ============================================================

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

// ============================================================
// RESPONSE QUALITY PIPELINE
// ============================================================

import {
  createResponseQualityPipeline,
  RESPONSE_QUALITY_PIPELINE_VERSION,
} from "./core/response-quality-pipeline.js";

import {
  evaluateResponseQualityPipeline,
  createResponseQualityPipelineAPI,
  getResponseQualityPipelineInfo,
  RESPONSE_QUALITY_PIPELINE_API_VERSION,
} from "./core/response-quality-pipeline-api.js";

import {
  createResponseQualityReport,
  RESPONSE_QUALITY_REPORT_VERSION,
  RESPONSE_QUALITY_REPORT_STATUSES,
} from "./core/response-quality-report.js";

import {
  evaluateResponseQuality,
  RESPONSE_QUALITY_VERSION,
} from "./core/response-quality-engine.js";

import {
  verifyResponseSource,
  verifyResponseSources,
  SOURCE_VERIFICATION_STATUSES,
  SOURCE_VERIFICATION_VERSION,
} from "./core/response-source-verifier.js";

// ============================================================
// PUBLIC LANGUAGE HELPERS
// ============================================================

/**
 * Lista publike e kodeve të gjuhëve.
 * Kthen kopje për të mos ekspozuar listën origjinale.
 */
function getPublicSupportedLanguages() {
  return [...getSupportedLanguages()];
}

// ============================================================
// MAIN PUBLIC OBJECT
// ============================================================

/**
 * Objekti kryesor publik i XSUS AI.
 *
 * Ekspozon funksionet kryesore, versionet dhe
 * ndërfaqet e moduleve të XSUS AI Core.
 */
export const XSUSAI = Object.freeze({
  // ----------------------------------------------------------
  // CORE
  // ----------------------------------------------------------

  get version() {
    return AI_CORE_VERSION;
  },

  get coreVersion() {
    return XSUS_CORE_VERSION;
  },

  processAIRequest,

  // Versionet publike të moduleve
  AI_CORE_VERSION,
  XSUS_CORE_VERSION,
  REQUEST_CONTEXT_VERSION,

  RESPONSE_QUALITY_PIPELINE_VERSION,
  RESPONSE_QUALITY_PIPELINE_API_VERSION,
  RESPONSE_QUALITY_REPORT_VERSION,
  RESPONSE_QUALITY_VERSION,
  SOURCE_VERIFICATION_VERSION,

  // ----------------------------------------------------------
  // LANGUAGE
  // ----------------------------------------------------------

  analyzeLanguage,
  detectLanguage,
  getLanguageInfo,
  getSupportedLanguages: getPublicSupportedLanguages,

  analyzeGrammar,
  isGrammarEngineSupported,

  // Normalizimi i gjuhëve dhe tekstit
  normalizeText,
  normalizeForSearch,
  tokenizeText,
  normalizeLanguageCode,
  getBaseLanguage,

  // ----------------------------------------------------------
  // CONTRACTS
  // ----------------------------------------------------------

  SUPPORTED_LANGUAGES,
  REQUEST_TYPES,
  AI_ERROR_CODES,

  createAIRequest,
  createAIResponse,
  createAIErrorResponse,

  // ----------------------------------------------------------
  // REQUEST CONTEXT
  // ----------------------------------------------------------

  createRequestContext,
  isValidRequestContext,

  // ----------------------------------------------------------
  // KNOWLEDGE
  // ----------------------------------------------------------

  searchKnowledge,
  registerKnowledgeSource,
  listKnowledgeSources,
  hasKnowledgeSource,
  unregisterKnowledgeSource,

  // ----------------------------------------------------------
  // RUNTIME
  // ----------------------------------------------------------

  routeAIRequest,

  registerService,
  getService,
  hasService,
  listServices,
  unregisterService,
  clearServices,

  // ----------------------------------------------------------
  // RESPONSE QUALITY
  // ----------------------------------------------------------

  createResponseQualityPipeline,
  evaluateResponseQualityPipeline,
  createResponseQualityPipelineAPI,
  getResponseQualityPipelineInfo,

  createResponseQualityReport,
  evaluateResponseQuality,

  verifyResponseSource,
  verifyResponseSources,

  // ----------------------------------------------------------
  // RESPONSE QUALITY VERSION GETTERS
  // ----------------------------------------------------------

  get responseQualityPipelineVersion() {
    return RESPONSE_QUALITY_PIPELINE_VERSION;
  },

  get responseQualityPipelineAPIVersion() {
    return RESPONSE_QUALITY_PIPELINE_API_VERSION;
  },

  get responseQualityVersion() {
    return RESPONSE_QUALITY_VERSION;
  },

  get responseQualityReportVersion() {
    return RESPONSE_QUALITY_REPORT_VERSION;
  },

  get sourceVerificationVersion() {
    return SOURCE_VERIFICATION_VERSION;
  },
});

// ============================================================
// DIRECT PUBLIC EXPORTS
// ============================================================

// AI Core
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
};

// Request context
export {
  createRequestContext,
  isValidRequestContext,
  REQUEST_CONTEXT_VERSION,
};

// Language engine
export {
  analyzeLanguage,
  detectLanguage,
  getLanguageInfo,
  analyzeGrammar,
  isGrammarEngineSupported,
};

// Language normalization
export {
  normalizeText,
  normalizeForSearch,
  tokenizeText,
  normalizeLanguageCode,
  getBaseLanguage,
};

// Knowledge service
export {
  searchKnowledge,
  registerKnowledgeSource,
  listKnowledgeSources,
  hasKnowledgeSource,
  unregisterKnowledgeSource,
};

// Runtime
export {
  routeAIRequest,

  registerService,
  getService,
  hasService,
  listServices,
  unregisterService,
  clearServices,
};

// Response Quality Pipeline
export {
  createResponseQualityPipeline,
  RESPONSE_QUALITY_PIPELINE_VERSION,
};

// Response Quality Pipeline API
export {
  evaluateResponseQualityPipeline,
  createResponseQualityPipelineAPI,
  getResponseQualityPipelineInfo,
  RESPONSE_QUALITY_PIPELINE_API_VERSION,
};

// Response Quality Report
export {
  createResponseQualityReport,
  RESPONSE_QUALITY_REPORT_VERSION,
  RESPONSE_QUALITY_REPORT_STATUSES,
};

// Response Quality Engine
export {
  evaluateResponseQuality,
  RESPONSE_QUALITY_VERSION,
};

// Response Source Verifier
export {
  verifyResponseSource,
  verifyResponseSources,
  SOURCE_VERIFICATION_STATUSES,
  SOURCE_VERIFICATION_VERSION,
};

// Public language list
export {
  getPublicSupportedLanguages as getSupportedLanguages,
};
