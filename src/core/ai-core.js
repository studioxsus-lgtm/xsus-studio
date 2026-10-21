/**
 * XSUS AI Core — Request Orchestrator
 * Version: 1.2.0
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

import { searchKnowledge } from "../knowledge/knowledge-service.js";
import { detectLanguage } from "../language/language-engine.js";

export const AI_CORE_VERSION = "1.2.0";

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

function getFallbackAnswer(language) {
  const answers = {
    sq: "Nuk gjeta informacion të mjaftueshëm në bazën aktuale të njohurive për t'iu përgjigjur saktë. Provo ta riformulosh pyetjen ose shto njohuri për këtë temë.",
    en: "I could not find enough information in the current knowledge base to answer accurately. Please rephrase your question or add knowledge about this topic.",
    fr: "Je n’ai pas trouvé suffisamment d’informations dans la base de connaissances actuelle pour répondre avec précision. Veuillez reformuler votre question ou ajouter des connaissances sur ce sujet."
  };

  return answers[language] || answers.sq;
}

function buildContextualQuery(context) {
  const userMessage = String(context?.userMessage || "").trim();

  if (!userMessage) return "";

  const history = Array.isArray(context?.messages)
    ? context.messages
    : [];

  if (history.length === 0) return userMessage;

  const recentHistory = history
    .slice(-4)
    .map((message) => {
      const role = message?.role === "assistant"
        ? "Assistant"
        : "User";

      const content = String(message?.content || "").trim();

      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean);

  if (recentHistory.length === 0) return userMessage;

  return [
    "Conversation context:",
    ...recentHistory,
    `Current question: ${userMessage}`
  ].join("\n");
}

function buildAnswer(results) {
  if (!Array.isArray(results)) return "";

  const seen = new Set();
  const sections = [];

  for (const result of results) {
    const content = typeof result === "string"
      ? result.trim()
      : typeof result?.content === "string"
        ? result.content.trim()
        : "";

    if (!content) continue;

    const key = content.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    sections.push(content);
  }

  return sections.join("\n\n");
}

function readConversationHistory(conversationId, suppliedMessages = []) {
  if (
    typeof conversationId === "string" &&
    conversationId.trim() &&
    hasMemorySession(conversationId)
  ) {
    return getMemoryHistory(conversationId);
  }

  return Array.isArray(suppliedMessages)
    ? suppliedMessages
    : [];
}

function ensureMemorySession(conversationId, language) {
  if (
    typeof conversationId !== "string" ||
    !conversationId.trim()
  ) {
    return false;
  }

  if (hasMemorySession(conversationId)) return true;

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
    typeof sessionId !== "string" ||
    !sessionId.trim() ||
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

function buildMetadata(
  language,
  results,
  context,
  requestId,
  conversationId,
  memoryEnabled
) {
  const sources = [
    ...new Set(
      (Array.isArray(results) ? results : [])
        .map((item) => {
          if (typeof item === "string") return "";

          return (
            item?.source ||
            item?.metadata?.source ||
            item?.id ||
            ""
          );
        })
        .filter(Boolean)
    )
  ];

  const messages = Array.isArray(context?.messages)
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
    }
  };
}

function createErrorResponse(error, requestId, language = "sq") {
  const message = error instanceof Error
    ? error.message
    : String(error || "Ndodhi një gabim i panjohur.");

  const code = error?.code || AI_ERROR_CODES.INTERNAL_ERROR;

  const response = createAIErrorResponse({
    requestId,
    code,
    message,
    language
  });

  return {
    ...response,
    version: AI_CORE_VERSION,
    timestamp: response?.timestamp || new Date().toISOString(),
    metadata: {
      ...(response?.metadata || {}),
      requestId,
      engine: "xsus-ai-core",
      version: AI_CORE_VERSION
    }
  };
}

export async function processAIRequest(input = {}) {
  let requestId = null;
  let language = "sq";

  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return createErrorResponse(
        new Error("Kërkesa duhet të jetë një objekt i vlefshëm."),
        requestId,
        language
      );
    }

    const rawQuery = typeof input.query === "string"
      ? input.query
      : typeof input.message === "string"
        ? input.message
        : "";

    if (!rawQuery.trim()) {
      return createErrorResponse(
        new Error("Pyetja nuk mund të jetë bosh."),
        requestId,
        language
      );
    }

    const request = createAIRequest(input);
    requestId = request?.requestId || null;

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

    const requestContext = createRequestContext({
      requestId,
      language,
      conversationId: conversationId || null,
      metadata: input.metadata || {}
    });

    if (!isValidRequestContext(requestContext)) {
      return createErrorResponse(
        new Error("Konteksti i kërkesës nuk është i vlefshëm."),
        requestId,
        language
      );
    }

    const contextualQuery = buildContextualQuery(context);

    if (memoryEnabled && conversationId) {
      saveMemoryMessage(
        conversationId,
        "user",
        rawQuery.trim()
      );
    }

    const knowledge = await searchKnowledge(contextualQuery, {
      language,
      limit: 5,
      metadata: {
        requestId,
        moduleName: "xsus-ai-core",
        conversationId: conversationId || null,
        historyMessageCount: history.length
      }
    });

    const results = Array.isArray(knowledge)
      ? knowledge
      : Array.isArray(knowledge?.results)
        ? knowledge.results
        : [];

    const answer = buildAnswer(results) || getFallbackAnswer(language);

    if (memoryEnabled && conversationId) {
      saveMemoryMessage(conversationId, "assistant", answer);
    }

    const metadata = buildMetadata(
      language,
      results,
      context,
      requestId,
      conversationId,
      memoryEnabled
    );

    const response = createAIResponse({
      requestId,
      answer,
      language,
      source: "xsus-service",
      confidence: null,
      metadata
    });

    return {
      ...response,
      version: AI_CORE_VERSION,
      timestamp: response?.timestamp || new Date().toISOString(),
      metadata: {
        ...(response?.metadata || {}),
        ...metadata,
        version: AI_CORE_VERSION,
        engine: "xsus-ai-core",
        conversationId: conversationId || null,
        memoryEnabled: Boolean(memoryEnabled)
      }
    };
  } catch (error) {
    return createErrorResponse(error, requestId, language);
  }
}

export default processAIRequest;
