
/**
 * XSUS Hyper Core
 * Public Entry Point
 * Version: 1.0.0
 *
 * Eksporton modulet publike të Hyper XSUS Core.
 */

export const HYPER_XSUS_CORE_VERSION = "1.0.0";

// KnowledgeLinking
export * from "./knowledge-linking/index.js";

// KnowledgeGraph
export * from "./knowledge-graph/index.js";

// XSUS AI Integration Adapter
export {
  createXsusAIKnowledgeAdapter,
  XSUS_AI_KNOWLEDGE_ADAPTER_VERSION,
} from "./knowledge-linking/adapters/xsus-ai-knowledge.adapter.js";
