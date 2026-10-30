
/**
 * XSUS AI Core — Public API
 * Version: 1.4.0
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
// EXISTING RUNTIME
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
// MODEL CONTRACTS
// ============================================================

import {
  MODEL_CONTRACTS_VERSION,
  MODEL_ERROR_CODES,
  MODEL_RUNTIME_STATES,
  createModelRequest,
  createModelResponse,
  createModelError,
} from "./runtime/model-contracts.js";

// ============================================================
// MODEL RUNTIME
// ============================================================

import {
  createModelRuntime,
  MODEL_RUNTIME_VERSION,
} from "./runtime/model-runtime.js";

// ============================================================
// MODEL ADAPTER
// ============================================================

import {
  createModelAdapter,
  MODEL_ADAPTER_VERSION,
  MODEL_ADAPTER_TYPES,
} from "./runtime/model-adapter.js";

// ============================================================
// MODEL REGISTRY
// ============================================================

import {
  createModelRegistry,
  MODEL_REGISTRY_VERSION,
  MODEL_REGISTRY_ERRORS,
} from "./runtime/model-registry.js";

// ============================================================
// MODEL SELECTOR
// ============================================================

import {
  createModelSelector,
  MODEL_SELECTOR_VERSION,
  MODEL_SELECTION_ERRORS,
} from "./runtime/model-selector.js";

// ============================================================
// MODEL ORCHESTRATOR
// ============================================================

import {
  createModelOrchestrator,
  MODEL_ORCHESTRATOR_VERSION,
  MODEL_ORCHESTRATOR_ERRORS,
} from "./runtime/model-orchestrator.js";

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
 * Kthen kopje të listës publike të gjuhëve të mbështetura.
 */
function getPublicSupportedLanguages() {
  return [...getSupportedLanguages()];
}

// ============================================================
// MAIN PUBLIC OBJECT
// ============================================================

/**
 * Objekti kryesor publik i XSUS AI.
 * Përmban funksionet publike dhe versionet e moduleve.
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

  // ----------------------------------------------------------
  // CORE VERSIONS
  // ----------------------------------------------------------

  AI_CORE_VERSION,
  XSUS_CORE_VERSION,
  REQUEST_CONTEXT_VERSION,

  // ----------------------------------------------------------
  // LANGUAGE
  // ----------------------------------------------------------

  analyzeLanguage,
  detectLanguage,
  getLanguageInfo,
  getSupportedLanguages: getPublicSupportedLanguages,

  analyzeGrammar,
  isGrammarEngineSupported,

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
  // EXISTING RUNTIME
  // ----------------------------------------------------------

  routeAIRequest,

  registerService,
  getService,
  hasService,
  listServices,
  unregisterService,
  clearServices,

  // ----------------------------------------------------------
  // MODEL CONTRACTS
  // ----------------------------------------------------------

  MODEL_CONTRACTS_VERSION,
  MODEL_ERROR_CODES,
  MODEL_RUNTIME_STATES,

  createModelRequest,
  createModelResponse,
  createModelError,

  // ----------------------------------------------------------
  // MODEL RUNTIME
  // ----------------------------------------------------------

  createModelRuntime,
  MODEL_RUNTIME_VERSION,

  // ----------------------------------------------------------
  // MODEL ADAPTER
  // ----------------------------------------------------------

  createModelAdapter,
  MODEL_ADAPTER_VERSION,
  MODEL_ADAPTER_TYPES,

  // ----------------------------------------------------------
  // MODEL REGISTRY
  // ----------------------------------------------------------

  createModelRegistry,
  MODEL_REGISTRY_VERSION,
  MODEL_REGISTRY_ERRORS,

  // ----------------------------------------------------------
  // MODEL SELECTOR
  // ----------------------------------------------------------

  createModelSelector,
  MODEL_SELECTOR_VERSION,
  MODEL_SELECTION_ERRORS,

  // ----------------------------------------------------------
  // MODEL ORCHESTRATOR
  // ----------------------------------------------------------

  createModelOrchestrator,
  MODEL_ORCHESTRATOR_VERSION,
  MODEL_ORCHESTRATOR_ERRORS,

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
  // RESPONSE QUALITY CONSTANTS
  // ----------------------------------------------------------

  RESPONSE_QUALITY_REPORT_STATUSES,
  SOURCE_VERIFICATION_STATUSES,

  // ----------------------------------------------------------
  // RESPONSE QUALITY VERSIONS
  // ----------------------------------------------------------

  RESPONSE_QUALITY_PIPELINE_VERSION,
  RESPONSE_QUALITY_PIPELINE_API_VERSION,
  RESPONSE_QUALITY_REPORT_VERSION,
  RESPONSE_QUALITY_VERSION,
  SOURCE_VERIFICATION_VERSION,

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

  // ----------------------------------------------------------
  // MODEL VERSION GETTERS
  // ----------------------------------------------------------

  get modelContractsVersion() {
    return MODEL_CONTRACTS_VERSION;
  },

  get modelRuntimeVersion() {
    return MODEL_RUNTIME_VERSION;
  },

  get modelAdapterVersion() {
    return MODEL_ADAPTER_VERSION;
  },

  get modelRegistryVersion() {
    return MODEL_REGISTRY_VERSION;
  },

  get modelSelectorVersion() {
    return MODEL_SELECTOR_VERSION;
  },

  get modelOrchestratorVersion() {
    return MODEL_ORCHESTRATOR_VERSION;
  },
});

// ============================================================
// DIRECT PUBLIC EXPORTS
// ============================================================

// AI Core and contracts
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

// Existing runtime
export {
  routeAIRequest,
  registerService,
  getService,
  hasService,
  listServices,
  unregisterService,
  clearServices,
};

// Model contracts
export {
  MODEL_CONTRACTS_VERSION,
  MODEL_ERROR_CODES,
  MODEL_RUNTIME_STATES,
  createModelRequest,
  createModelResponse,
  createModelError,
};

// Model runtime
export {
  createModelRuntime,
  MODEL_RUNTIME_VERSION,
};

// Model adapter
export {
  createModelAdapter,
  MODEL_ADAPTER_VERSION,
  MODEL_ADAPTER_TYPES,
};

// Model registry
export {
  createModelRegistry,
  MODEL_REGISTRY_VERSION,
  MODEL_REGISTRY_ERRORS,
};

// Model selector
export {
  createModelSelector,
  MODEL_SELECTOR_VERSION,
  MODEL_SELECTION_ERRORS,
};

// Model orchestrator
export {
  createModelOrchestrator,
  MODEL_ORCHESTRATOR_VERSION,
  MODEL_ORCHESTRATOR_ERRORS,
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
