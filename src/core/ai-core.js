
/**
 * XSUS AI Core — Request Orchestrator
 * Version: 1.2.0
 *
 * Përgjegjësitë:
 * - Validimi dhe përpunimi i kërkesave.
 * - Përcaktimi i gjuhës.
 * - Integrimi me Context Engine.
 * - Përdorimi i historikut të bisedës.
 * - Kërkimi në bazën e njohurive.
 * - Standardizimi i përgjigjeve.
 * - Menaxhimi i memories së sesionit.
 * - Metadata dhe trajtimi i gabimeve.
 */

import {
  createAIRequest,
  createAIResponse,
  createAIErrorResponse,
  AI_ERROR_CODES,
  SUPPORTED_LANGUAGES
} from "./ai-core-contracts.js";

import { createContext } from "./context-engine.js";

import {
  createMemorySession,
  hasMemorySession,
  getMemoryHistory,
  addMemoryMessage
} from "./memory-engine.js";

import { searchKnowledge } from "../knowledge/knowledge-service.js";
import { detectLanguage } from "../language/language-engine.js";

import { createResponse } from "./response-engine.js";

export const AI_CORE_VERSION = "1.2.0";

const GENERIC_ERROR_MESSAGE =
  "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.";

function detectRequestLanguage(query, requestedLanguage) {
  const requested = typeof requestedLanguage === "string"
    ? requestedLanguage.trim().toLowerCase()
    : "";

  if (requested && SUPPORTED_LANGUAGES.includes(requested)) {
    return requested;
  }

  try {
    const detected = detectLanguage(query);

    const language = typeof detected === "string"
      ? detected
      : detected?.language;

    if (
      typeof language === "string" &&
      SUPPORTED_LANGUAGES.includes(language)
    ) {
      return language;
    }
  } catch {
    // Përdor gjuhën rezervë.
  }

  return "sq";
}

/**
 * Ndërton pyetjen për kërkimin e njohurive.
 *
 * Përfshin historikun e fundit kur është i disponueshëm,
 * por gjithmonë ruan pyetjen aktuale si pjesë të kërkimit.
 */
function buildContextualQuery(context) {
  const userMessage = String(
    context?.userMessage || ""
  ).trim();

  if (!userMessage) {
    return "";
  }

  const history = Array.isArray(context?.messages)
    ? context.messages
    : [];

  if (history.length === 0) {
    return userMessage;
  }

  const recentHistory = history
    .slice(-4)
    .map(message => {
      const role = message?.role === "assistant"
        ? "Assistant"
        : "User";

      const content = String(
        message?.content || ""
      ).trim();

      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean);

  if (recentHistory.length === 0) {
    return userMessage;
  }

  return [
    "Conversation context:",
    ...recentHistory,
    `Current question: ${userMessage}`
  ].join("\n");
}

function readConversationHistory(
  conversationId,
  suppliedMessages = []
) {
  if (
    typeof conversationId === "string" &&
    conversationId &&
    hasMemorySession(conversationId)
  ) {
    const memoryHistory = getMemoryHistory(conversationId);

    if (
      Array.isArray(memoryHistory) &&
      memoryHistory.length > 0
    ) {
      return memoryHistory;
    }
  }

  return Array.isArray(suppliedMessages)
    ? suppliedMessages
    : [];
}

function ensureMemorySession(conversationId, language) {
  if (!conversationId) {
    return false;
  }

  if (hasMemorySession(conversationId)) {
    return true;
  }

  try {
    createMemorySession({
      sessionId: conversationId,
      language
    });

    return true;
  } catch {
    return hasMemorySession(conversationId);
  }
}

function saveMemoryMessage(sessionId, role, content) {
  if (
    !sessionId ||
    typeof content !== "string" ||
    !content.trim() ||
    !hasMemorySession(sessionId)
  ) {
    return false;
  }

  try {
    addMemoryMessage({
      sessionId,
      role,
      content: content.trim()
    });

    return true;
  } catch {
    return false;
  }
}

function buildMetadata({
  language,
  results = [],
  knowledge = {},
  context,
  history = [],
  requestId,
  conversationId,
  memoryEnabled,
  responseResult
}) {
  const knowledgeSources = Array.isArray(knowledge?.sources)
    ? knowledge.sources
    : [];

  const resultSources = (
    Array.isArray(results) ? results : []
  )
    .map(item => {
      if (typeof item === "string") {
        return "";
      }

      return (
        item?.source ||
        item?.metadata?.source ||
        item?.id ||
        ""
      );
    })
    .filter(Boolean);

  const responseSources = Array.isArray(
    responseResult?.metadata?.sources
  )
    ? responseResult.metadata.sources
    : [];

  const sources = [
    ...new Set([
      ...knowledgeSources,
      ...resultSources,
      ...responseSources
    ])
  ];

  const messages = Array.isArray(history) && history.length > 0
    ? history
    : Array.isArray(context?.messages)
      ? context.messages
      : [];

  const totalHistoryCharacters = messages.reduce(
    (total, message) =>
      total + String(message?.content || "").length,
    0
  );

  return {
    requestId,
    language,
    engine: "xsus-ai-core",
    version: AI_CORE_VERSION,
    modelConnected: false,
    knowledgeResults: Array.isArray(results)
      ? results.length
      : 0,
    sources,
    conversationId: conversationId || null,
    memoryEnabled: Boolean(memoryEnabled),
    context: {
      conversationId: conversationId || null,
      historyMessageCount: messages.length,
      hasPreviousContext: messages.length > 0,
      totalHistoryCharacters
    },
    responseEngine: {
      version: responseResult?.version || null,
      confidence: responseResult?.confidence ?? 0,
      success: Boolean(responseResult?.success)
    }
  };
}

function buildErrorMetadata({
  requestId,
  language,
  conversationId = null,
  history = [],
  knowledgeResults = 0,
  sources = []
}) {
  const messages = Array.isArray(history)
    ? history
    : [];

  return {
    requestId,
    language,
    engine: "xsus-ai-core",
    version: AI_CORE_VERSION,
    knowledgeResults,
    sources: Array.isArray(sources)
      ? sources
      : [],
    conversationId: conversationId || null,
    context: {
      conversationId: conversationId || null,
      historyMessageCount: messages.length,
      hasPreviousContext: messages.length > 0,
      totalHistoryCharacters: messages.reduce(
        (total, item) =>
          total + String(item?.content || "").length,
        0
      )
    }
  };
}

function createErrorResponse({
  message,
  requestId,
  language = "sq",
  code = AI_ERROR_CODES.INTERNAL_ERROR,
  exposeMessage = true,
  metadata = {}
}) {
  const safeMessage = exposeMessage
    ? message
    : GENERIC_ERROR_MESSAGE;

  const response = createAIErrorResponse({
    requestId,
    code,
    message: safeMessage,
    language
  });

  return {
    ...response,
    requestId,
    answer: "",
    error: safeMessage,
    language,
    version: AI_CORE_VERSION,
    timestamp: response?.timestamp || new Date().toISOString(),
    metadata: {
      ...(response?.metadata || {}),
      ...metadata,
      requestId,
      language,
      engine: "xsus-ai-core",
      version: AI_CORE_VERSION
    }
  };
}

export async function processAIRequest(input = {}) {
  let requestId = null;
  let language = "sq";

  try {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      return createErrorResponse({
        message: "Kërkesa nuk përmban një pyetje të vlefshme.",
        language,
        code: AI_ERROR_CODES.INVALID_REQUEST
      });
    }

    const rawQuery = typeof input.query === "string"
      ? input.query
      : typeof input.message === "string"
        ? input.message
        : "";

    if (!rawQuery.trim()) {
      return createErrorResponse({
        message: "Gabim: pyetje nuk mund të jetë bosh.",
        language: input.language || "sq",
        code: AI_ERROR_CODES.INVALID_REQUEST,
        metadata: {
          knowledgeResults: 0,
          sources: [],
          context: {
            conversationId: null,
            historyMessageCount: 0,
            hasPreviousContext: false,
            totalHistoryCharacters: 0
          }
        }
      });
    }

    const request = createAIRequest(input);

    requestId =
      request?.requestId ||
      input.requestId ||
      null;

    if (!requestId) {
      requestId = globalThis.crypto?.randomUUID?.()
        || `xsus-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
    }

    language = detectRequestLanguage(
      rawQuery,
      input.language ||
      input.requestedLanguage ||
      request?.language
    );

    const suppliedMessages = Array.isArray(input.messages)
      ? input.messages
      : Array.isArray(input.context?.messages)
        ? input.context.messages
        : Array.isArray(request?.context?.messages)
          ? request.context.messages
          : [];

    const conversationId = (
      typeof input.conversationId === "string"
        ? input.conversationId
        : typeof input.sessionId === "string"
          ? input.sessionId
          : typeof input.context?.conversationId === "string"
            ? input.context.conversationId
            : ""
    ).trim();

    const memoryEnabled = ensureMemorySession(
      conversationId,
      language
    );

    const history = readConversationHistory(
      conversationId,
      suppliedMessages
    );

    const context = createContext({
      messages: history,
      userMessage: rawQuery.trim(),
      language,
      conversationId: conversationId || null
    });

    const contextualQuery = buildContextualQuery(context);

    if (memoryEnabled && conversationId) {
      saveMemoryMessage(
        conversationId,
        "user",
        rawQuery.trim()
      );
    }

    let knowledge;

    try {
      knowledge = await searchKnowledge(contextualQuery, {
        language,
        limit: 5,
        metadata: {
          requestId,
          moduleName: "xsus-ai-core",
          conversationId: conversationId || null,
          historyMessageCount: history.length
        }
      });
    } catch {
      return createErrorResponse({
        message: GENERIC_ERROR_MESSAGE,
        requestId,
        language,
        exposeMessage: false,
        metadata: buildErrorMetadata({
          requestId,
          language,
          conversationId,
          history
        })
      });
    }

    if (knowledge?.success === false) {
      return createErrorResponse({
        message: knowledge.error ||
          "Gabim gjatë kërkimit të njohurive.",
        requestId,
        language,
        metadata: buildErrorMetadata({
          requestId,
          language,
          conversationId,
          history,
          knowledgeResults: 0,
          sources: knowledge.sources
        })
      });
    }

    const results = Array.isArray(knowledge)
      ? knowledge
      : Array.isArray(knowledge?.results)
        ? knowledge.results
        : [];

    const standardizedResponse = createResponse({
      results,
      language,
      requestId,
      conversationId: conversationId || null
    });

    const answer = standardizedResponse.answer;

    if (memoryEnabled && conversationId) {
      saveMemoryMessage(
        conversationId,
        "assistant",
        answer
      );
    }

    const metadata = buildMetadata({
      language,
      results,
      knowledge,
      context,
      history,
      requestId,
      conversationId,
      memoryEnabled,
      responseResult: standardizedResponse
    });

    const response = createAIResponse({
      requestId,
      answer,
      language,
      source: "xsus-knowledge-service",
      confidence: standardizedResponse.confidence,
      metadata
    });

    return {
      ...response,
      requestId,
      answer,
      language,
      source: "xsus-knowledge-service",
      confidence: standardizedResponse.confidence,
      version: AI_CORE_VERSION,
      timestamp: response?.timestamp || new Date().toISOString(),
      metadata: {
        ...(response?.metadata || {}),
        ...metadata,
        engine: "xsus-ai-core",
        version: AI_CORE_VERSION
      }
    };
  } catch {
    return createErrorResponse({
      message: GENERIC_ERROR_MESSAGE,
      requestId,
      language,
      exposeMessage: false,
      metadata: buildErrorMetadata({
        requestId,
        language
      })
    });
  }
}

export default processAIRequest;
