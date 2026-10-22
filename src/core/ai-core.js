
/**
 * XSUS AI Core — Request Orchestrator
 * Version: 1.2.0
 *
 * Përgjegjësitë:
 * - Validimi dhe përpunimi i kërkesave.
 * - Përcaktimi i gjuhës.
 * - Validimi i Request Context.
 * - Integrimi me Context Engine.
 * - Përdorimi dhe kufizimi i historikut të bisedës.
 * - Kërkimi në bazën e njohurive.
 * - Standardizimi i përgjigjeve.
 * - Menaxhimi i memories RAM dhe persistent memory.
 * - Metadata dhe trajtimi i sigurt i gabimeve.
 */

import {
  createAIRequest,
  createAIResponse,
  createAIErrorResponse,
  AI_ERROR_CODES,
  SUPPORTED_LANGUAGES
} from "./ai-core-contracts.js";

import {
  createRequestContext,
  isValidRequestContext
} from "./request-context.js";

import { createContext } from "./context-engine.js";

import {
  createMemorySession,
  hasMemorySession,
  getMemoryHistory,
  addMemoryMessage
} from "./memory-engine.js";

import {
  createMemoryPersistence
} from "./memory-persistence-integration.js";

import {
  searchKnowledge
} from "../knowledge/knowledge-service.js";

import {
  detectLanguage
} from "../language/language-engine.js";

import {
  createResponse
} from "./response-engine.js";

export const AI_CORE_VERSION = "1.2.0";

const GENERIC_ERROR_MESSAGE =
  "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.";

const MAX_QUERY_LENGTH = 8000;
const MAX_CONVERSATION_ID_LENGTH = 200;
const MAX_SUPPLIED_HISTORY = 20;
const MAX_CONTEXT_MESSAGES = 4;

let memoryPersistenceInstance = null;

/**
 * Krijon një instancë të vetme të persistent memory.
 */
function getMemoryPersistence() {
  if (!memoryPersistenceInstance) {
    memoryPersistenceInstance = createMemoryPersistence();
  }

  return memoryPersistenceInstance;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function normalizeLanguage(value) {
  if (typeof value !== "string") {
    return null;
  }

  const language = value.trim().toLowerCase();

  if (SUPPORTED_LANGUAGES.includes(language)) {
    return language;
  }

  const match = language.match(/^([a-z]{2})-[a-z]{2}$/);

  if (match && SUPPORTED_LANGUAGES.includes(match[1])) {
    return match[1];
  }

  return null;
}

function detectRequestLanguage(query, requestedLanguage) {
  const requested = normalizeLanguage(requestedLanguage);

  if (requested) {
    return requested;
  }

  try {
    const detected = detectLanguage(query);

    const candidate = typeof detected === "string"
      ? detected
      : detected?.language;

    const normalized = normalizeLanguage(candidate);

    if (normalized) {
      return normalized;
    }
  } catch {
    // Përdoret gjuha rezervë.
  }

  return "sq";
}

function createRequestIdFallback() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `xsus-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function resolveConversationId(input) {
  const candidates = [
    input.conversationId,
    input.sessionId,
    input.context?.conversationId
  ];

  const value = candidates.find(
    candidate =>
      typeof candidate === "string" &&
      candidate.trim().length > 0
  );

  if (!value) {
    return "";
  }

  const normalized = value.trim();

  if (normalized.length > MAX_CONVERSATION_ID_LENGTH) {
    throw new TypeError(
      "ID-ja e bisedës është tepër e gjatë."
    );
  }

  return normalized;
}

function resolveSuppliedMessages(input) {
  let messages = [];

  if (Array.isArray(input.messages)) {
    messages = input.messages;
  } else if (Array.isArray(input.context?.messages)) {
    messages = input.context.messages;
  } else if (Array.isArray(input.context?.history)) {
    messages = input.context.history;
  }

  return messages
    .filter(message =>
      message &&
      typeof message === "object" &&
      typeof message.content === "string" &&
      ["user", "assistant", "system"].includes(message.role)
    )
    .slice(-MAX_SUPPLIED_HISTORY)
    .map(message => ({
      role: message.role,
      content: message.content
    }));
}

/**
 * Ndërton pyetjen për kërkimin e njohurive.
 */
function buildContextualQuery(context) {
  const userMessage =
    typeof context?.userMessage === "string"
      ? context.userMessage.trim()
      : "";

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
    .slice(-MAX_CONTEXT_MESSAGES)
    .map(message => {
      const role = message?.role === "assistant"
        ? "Assistant"
        : message?.role === "system"
          ? "System"
          : "User";

      const content =
        typeof message?.content === "string"
          ? message.content.trim()
          : "";

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

/**
 * Lexon historikun aktiv nga RAM.
 * Nëse nuk ekziston, përdor historikun e dërguar nga klienti.
 */
function readConversationHistory(
  conversationId,
  suppliedMessages = []
) {
  if (conversationId) {
    try {
      if (hasMemorySession(conversationId)) {
        const memoryHistory = getMemoryHistory(conversationId);

        if (
          Array.isArray(memoryHistory) &&
          memoryHistory.length > 0
        ) {
          return memoryHistory.slice(-MAX_SUPPLIED_HISTORY);
        }
      }
    } catch {
      // Përdoret historiku i dërguar nga klienti.
    }
  }

  return Array.isArray(suppliedMessages)
    ? suppliedMessages.slice(-MAX_SUPPLIED_HISTORY)
    : [];
}

/**
 * Rikthen sesionin nga storage kur nuk ekziston në RAM.
 */
async function ensureMemorySession(conversationId, language) {
  if (!conversationId) {
    return false;
  }

  try {
    if (hasMemorySession(conversationId)) {
      return true;
    }
  } catch {
    // Vazhdohet me rikthimin.
  }

  try {
    const persistence = getMemoryPersistence();

    await persistence.restoreSession(conversationId);
  } catch {
    // Dështimi i storage nuk e ndalon përpunimin.
  }

  try {
    if (hasMemorySession(conversationId)) {
      return true;
    }
  } catch {
    // Vazhdohet me krijimin e sesionit.
  }

  try {
    createMemorySession({
      sessionId: conversationId,
      language
    });

    return hasMemorySession(conversationId);
  } catch {
    try {
      return hasMemorySession(conversationId);
    } catch {
      return false;
    }
  }
}

/**
 * Ruajtje best-effort e sesionit në storage.
 */
async function persistMemorySession(sessionId) {
  if (!sessionId) {
    return false;
  }

  try {
    const persistence = getMemoryPersistence();
    const result = await persistence.saveSession(sessionId);

    return result?.success !== false;
  } catch {
    return false;
  }
}

function saveMemoryMessage(sessionId, role, content) {
  if (
    !sessionId ||
    typeof content !== "string" ||
    !content.trim()
  ) {
    return false;
  }

  try {
    if (!hasMemorySession(sessionId)) {
      return false;
    }

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

function collectSources(results, knowledge, responseResult) {
  const sources = [];

  if (Array.isArray(knowledge?.sources)) {
    sources.push(...knowledge.sources);
  }

  if (Array.isArray(results)) {
    for (const item of results) {
      if (!item || typeof item === "string") {
        continue;
      }

      const source =
        item.source ||
        item.metadata?.source ||
        item.id;

      if (typeof source === "string" && source.trim()) {
        sources.push(source.trim());
      }
    }
  }

  if (Array.isArray(responseResult?.metadata?.sources)) {
    sources.push(...responseResult.metadata.sources);
  }

  return [
    ...new Set(
      sources.filter(
        source =>
          typeof source === "string" &&
          source.trim().length > 0
      )
    )
  ];
}

function buildContextMetadata({
  conversationId,
  history = []
}) {
  const messages = Array.isArray(history) ? history : [];

  return {
    conversationId: conversationId || null,
    historyMessageCount: messages.length,
    hasPreviousContext: messages.length > 0,
    totalHistoryCharacters: messages.reduce(
      (total, message) => {
        const content =
          typeof message?.content === "string"
            ? message.content
            : "";

        return total + content.length;
      },
      0
    )
  };
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
  /*
   * Historia e kaluar këtu duhet të jetë historiku paraprak,
   * jo mesazhi aktual që sapo u ruajt në RAM.
   */
  const messages = Array.isArray(history)
    ? history
    : Array.isArray(context?.messages)
      ? context.messages
      : [];

  return {
    requestId,
    language,
    engine: "xsus-ai-core",
    version: AI_CORE_VERSION,
    modelConnected: false,
    knowledgeResults: Array.isArray(results)
      ? results.length
      : 0,
    sources: collectSources(
      results,
      knowledge,
      responseResult
    ),
    conversationId: conversationId || null,
    memoryEnabled: Boolean(memoryEnabled),
    context: buildContextMetadata({
      conversationId,
      history: messages
    }),
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
  return {
    requestId,
    language,
    engine: "xsus-ai-core",
    version: AI_CORE_VERSION,
    knowledgeResults,
    sources: Array.isArray(sources) ? sources : [],
    conversationId: conversationId || null,
    context: buildContextMetadata({
      conversationId,
      history
    })
  };
}

function createErrorResponse({
  message = GENERIC_ERROR_MESSAGE,
  requestId = null,
  language = "sq",
  code = AI_ERROR_CODES.INTERNAL_ERROR,
  exposeMessage = true,
  metadata = {}
}) {
  const safeMessage = exposeMessage
    ? message
    : GENERIC_ERROR_MESSAGE;

  const safeLanguage = normalizeLanguage(language) || "sq";

  const response = createAIErrorResponse({
    requestId,
    error: safeMessage,
    code,
    language: safeLanguage,
    source: "xsus-ai-core",
    metadata
  });

  return {
    ...response,
    requestId,
    answer: "",
    error: safeMessage,
    language: safeLanguage,
    version: AI_CORE_VERSION,
    timestamp: response.timestamp || new Date().toISOString(),
    metadata: {
      ...response.metadata,
      ...metadata,
      requestId,
      language: safeLanguage,
      engine: "xsus-ai-core",
      version: AI_CORE_VERSION
    }
  };
}

export async function processAIRequest(input = {}) {
  let requestId = null;
  let language = "sq";
  let conversationId = "";
  let history = [];

  try {
    if (!isPlainObject(input)) {
      return createErrorResponse({
        message: "Kërkesa nuk përmban një pyetje të vlefshme.",
        code: AI_ERROR_CODES.INVALID_REQUEST
      });
    }

    const rawQuery = typeof input.query === "string"
      ? input.query
      : typeof input.message === "string"
        ? input.message
        : "";

    const query = rawQuery.trim();

    if (!query) {
      const requestedLanguage =
        normalizeLanguage(input.language) || "sq";

      return createErrorResponse({
        message: "Gabim: pyetje nuk mund të jetë bosh.",
        language: requestedLanguage,
        code: AI_ERROR_CODES.INVALID_REQUEST,
        metadata: buildErrorMetadata({
          requestId: input.requestId || null,
          language: requestedLanguage
        })
      });
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return createErrorResponse({
        message: `Pyetja tejkalon kufirin prej ${MAX_QUERY_LENGTH} karakteresh.`,
        requestId: input.requestId || null,
        language: normalizeLanguage(input.language) || "sq",
        code: AI_ERROR_CODES.INVALID_QUERY
      });
    }

    conversationId = resolveConversationId(input);

    const suppliedMessages = resolveSuppliedMessages(input);

    const request = createAIRequest({
      ...input,
      id: input.id ?? input.requestId ?? null,
      query,
      language:
        input.language ??
        input.requestedLanguage ??
        "auto"
    });

    requestId = request.id || createRequestIdFallback();

    language = detectRequestLanguage(
      query,
      input.language ??
      input.requestedLanguage ??
      request.language
    );

    const requestContext = createRequestContext({
      id: requestId,
      query,
      language,
      moduleName: "xsus-ai-core",
      metadata: {
        conversationId: conversationId || "",
        historyMessageCount: suppliedMessages.length
      }
    });

    if (!isValidRequestContext(requestContext)) {
      return createErrorResponse({
        message: GENERIC_ERROR_MESSAGE,
        requestId,
        language,
        code: AI_ERROR_CODES.INVALID_REQUEST,
        exposeMessage: false,
        metadata: buildErrorMetadata({
          requestId,
          language,
          conversationId
        })
      });
    }

    requestId = requestContext.requestId;
    language = requestContext.language;

    const memoryEnabled = await ensureMemorySession(
      conversationId,
      language
    );

    /*
     * Përcakto historikun paraprak para se të shtohet
     * mesazhi aktual i përdoruesit.
     *
     * Nëse ekziston historik në RAM, ai ka përparësi.
     * Përndryshe përdoren mesazhet e kërkesës.
     */
    history = readConversationHistory(
      conversationId,
      suppliedMessages
    );

    const context = createContext({
      messages: history,
      userMessage: requestContext.query,
      language: requestContext.language,
      conversationId: conversationId || null
    });

    const contextualQuery = buildContextualQuery(context);

    if (!contextualQuery) {
      return createErrorResponse({
        message: "Nuk mund të ndërtohet pyetja për kërkim.",
        requestId,
        language,
        code: AI_ERROR_CODES.INVALID_QUERY,
        metadata: buildErrorMetadata({
          requestId,
          language,
          conversationId,
          history
        })
      });
    }

    if (memoryEnabled) {
      saveMemoryMessage(
        conversationId,
        "user",
        requestContext.query
      );

      await persistMemorySession(conversationId);
    }

    let knowledge;

    try {
      knowledge = await searchKnowledge(contextualQuery, {
        language: requestContext.language,
        limit: 5,
        metadata: {
          requestId: requestContext.requestId,
          moduleName: requestContext.moduleName,
          conversationId: conversationId || null,
          historyMessageCount: history.length
        }
      });
    } catch {
      return createErrorResponse({
        message: GENERIC_ERROR_MESSAGE,
        requestId,
        language,
        code: AI_ERROR_CODES.KNOWLEDGE_SERVICE_ERROR,
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
      const knowledgeError =
        typeof knowledge.error === "string" &&
        knowledge.error.trim()
          ? knowledge.error.trim()
          : GENERIC_ERROR_MESSAGE;

      return createErrorResponse({
        message: knowledgeError,
        requestId,
        language,
        code: AI_ERROR_CODES.KNOWLEDGE_SERVICE_ERROR,
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

    const answer =
      typeof standardizedResponse?.answer === "string"
        ? standardizedResponse.answer.trim()
        : "";

    if (!answer) {
      return createErrorResponse({
        message: GENERIC_ERROR_MESSAGE,
        requestId,
        language,
        code: AI_ERROR_CODES.EMPTY_RESPONSE,
        exposeMessage: false,
        metadata: buildErrorMetadata({
          requestId,
          language,
          conversationId,
          history,
          knowledgeResults: results.length,
          sources: collectSources(
            results,
            knowledge,
            standardizedResponse
          )
        })
      });
    }

    if (memoryEnabled) {
      saveMemoryMessage(
        conversationId,
        "assistant",
        answer
      );

      await persistMemorySession(conversationId);
    }

    /*
     * KORRIGJIMI KRYESOR:
     * Metadata përdor historikun paraprak të kapur përpara
     * shtimit të mesazhit aktual.
     *
     * Kjo ruan pritshmërinë e testeve që dërgojnë dy mesazhe
     * në input dhe presin historyMessageCount === 2.
     */
    const metadata = buildMetadata({
      language,
      results,
      knowledge,
      context: {
        ...context,
        messages: history
      },
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
      timestamp: response.timestamp || new Date().toISOString(),
      metadata: {
        ...response.metadata,
        ...metadata,
        engine: "xsus-ai-core",
        version: AI_CORE_VERSION
      }
    };
  } catch (error) {
    const code = error instanceof TypeError
      ? AI_ERROR_CODES.INVALID_REQUEST
      : AI_ERROR_CODES.INTERNAL_ERROR;

    return createErrorResponse({
      message: GENERIC_ERROR_MESSAGE,
      requestId,
      language,
      code,
      exposeMessage: false,
      metadata: buildErrorMetadata({
        requestId,
        language,
        conversationId,
        history
      })
    });
  }
}

export default processAIRequest;
