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
 * - Integrimi opsional me Model Orchestrator.
 * - Standardizimi i përgjigjeve.
 * - Vlerësimi i cilësisë përmes Response Quality Pipeline.
 * - Verifikimi strukturor i burimeve.
 * - Menaxhimi i memories RAM dhe persistent memory.
 * - Konfigurimi i integrimeve dhe testeve.
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

import {
  createResponseQualityPipeline
} from "./response-quality-pipeline.js";

import {
  createModelRequest,
  MODEL_ERROR_CODES
} from "../runtime/model-contracts.js";

export const AI_CORE_VERSION = "1.2.0";

const GENERIC_ERROR_MESSAGE =
  "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.";

const MAX_QUERY_LENGTH = 8000;
const MAX_CONVERSATION_ID_LENGTH = 200;
const MAX_SUPPLIED_HISTORY = 20;
const MAX_CONTEXT_MESSAGES = 4;

/*
 * Model Contracts lejon prompt deri në 32,000 karaktere.
 * Rezervohet hapësirë për udhëzimet dhe strukturën e prompt-it.
 */
const MAX_MODEL_PROMPT_LENGTH = 30000;

const responseQualityPipeline =
  createResponseQualityPipeline();

let memoryPersistenceInstance = null;
let modelOrchestratorInstance = null;

/**
 * Konfiguron persistent memory për integrime dhe teste.
 *
 * Instance duhet të ofrojë:
 * - saveSession(sessionId)
 * - restoreSession(sessionId)
 *
 * Kalimi i null rikthen krijimin automatik të instancës
 * së parazgjedhur.
 */
export function configureAICoreMemoryPersistence(
  instance = null
) {
  if (
    instance !== null &&
    (
      typeof instance !== "object" ||
      typeof instance.saveSession !== "function" ||
      typeof instance.restoreSession !== "function"
    )
  ) {
    throw new TypeError(
      "Instanca e memories duhet të ofrojë saveSession dhe restoreSession."
    );
  }

  memoryPersistenceInstance = instance;
}

/**
 * Konfiguron Model Orchestrator për XSUS AI Core.
 *
 * Instance duhet të ofrojë:
 * - generate(input)
 *
 * Kalimi i null çaktivizon integrimin me modelin.
 *
 * Ky konfigurim është në nivel moduli. Për konfigurime
 * të ndryshme përdoruesish kërkohet izolim i instancave.
 */
export function configureAICoreModelOrchestrator(
  instance = null
) {
  if (
    instance !== null &&
    (
      typeof instance !== "object" ||
      typeof instance.generate !== "function"
    )
  ) {
    throw new TypeError(
      "Model Orchestrator duhet të ofrojë metodën generate."
    );
  }

  modelOrchestratorInstance = instance;
}

/**
 * Kthen instancën aktive të persistent memory.
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

  try {
    const prototype = Object.getPrototypeOf(value);

    return (
      prototype === Object.prototype ||
      prototype === null
    );
  } catch {
    return false;
  }
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

/**
 * Mbledh burimet pa shpikur metadata.
 */
function collectSources(results, knowledge, responseResult) {
  const sources = [];

  if (Array.isArray(knowledge?.sources)) {
    sources.push(...knowledge.sources);
  }

  if (Array.isArray(results)) {
    for (const item of results) {
      if (typeof item === "string") {
        sources.push(item);
        continue;
      }

      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        continue;
      }

      const hasSourceFields = [
        item.id,
        item.title,
        item.content,
        item.url,
        item.source,
        item.metadata?.source
      ].some(
        value =>
          typeof value === "string" &&
          value.trim().length > 0
      );

      if (hasSourceFields) {
        sources.push(item);
      }
    }
  }

  if (Array.isArray(responseResult?.metadata?.sources)) {
    sources.push(...responseResult.metadata.sources);
  }

  const seen = new Set();

  return sources.filter(source => {
    if (typeof source === "string") {
      const normalized = source.trim();

      if (!normalized || seen.has(`text:${normalized}`)) {
        return false;
      }

      seen.add(`text:${normalized}`);
      return true;
    }

    if (
      !source ||
      typeof source !== "object" ||
      Array.isArray(source)
    ) {
      return false;
    }

    const key = [
      source.id,
      source.title,
      source.url,
      source.content,
      source.source,
      source.metadata?.source
    ]
      .map(value =>
        typeof value === "string" ? value.trim() : ""
      )
      .join("|");

    if (!key.replace(/\|/g, "")) {
      return false;
    }

    const objectKey = `object:${key}`;

    if (seen.has(objectKey)) {
      return false;
    }

    seen.add(objectKey);
    return true;
  });
}

/**
 * Ekspozon vetëm fushat publike të kontratës së cilësisë.
 */
function buildResponseQualityMetadata(responseQuality) {
  if (
    !responseQuality ||
    typeof responseQuality !== "object"
  ) {
    return null;
  }

  return {
    version: responseQuality.version,
    valid: responseQuality.valid,
    score: responseQuality.score,
    dimensions: responseQuality.dimensions,
    sourceCount: responseQuality.sourceCount,
    errors: responseQuality.errors
  };
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

/**
 * Ndërton metadata-n kryesore.
 *
 * Metadata e modelit ruhet në një fushë të veçantë,
 * pa mundësi për të mbishkruar fushat e Core.
 */
function buildMetadata({
  language,
  results = [],
  knowledge = {},
  context,
  history = [],
  requestId,
  conversationId,
  memoryEnabled,
  responseResult,
  responseQuality,
  modelResult = null
}) {
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

    modelConnected: Boolean(modelResult),

    model: modelResult
      ? {
          modelId: modelResult.modelId,
          finishReason: modelResult.finishReason,
          usage: modelResult.usage,
          metadata: modelResult.metadata
        }
      : null,

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
    },

    responseQuality: buildResponseQualityMetadata(
      responseQuality
    )
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
    modelConnected: Boolean(modelOrchestratorInstance),
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

/**
 * Kufizon tekstin pa e ndryshuar llojin e tij.
 */
function truncateText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength);
}

/**
 * Nxjerr tekst të përdorshëm nga një rezultat Knowledge.
 */
function extractKnowledgeText(item) {
  if (typeof item === "string") {
    return item.trim();
  }

  if (
    !item ||
    typeof item !== "object" ||
    Array.isArray(item)
  ) {
    return "";
  }

  return [
    item.title,
    item.content,
    item.text
  ]
    .filter(value =>
      typeof value === "string" &&
      value.trim().length > 0
    )
    .map(value => value.trim())
    .join("\n");
}

/**
 * Ndërton kontekstin e njohurive për modelin.
 */
function buildKnowledgeContext(results) {
  if (!Array.isArray(results)) {
    return "";
  }

  return results
    .map((item, index) => {
      const content = extractKnowledgeText(item);

      return content
        ? `[Knowledge ${index + 1}]\n${content}`
        : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Gjeneron përgjigje përmes Model Orchestrator.
 *
 * Përgjigjja validohet sipas Model Contracts.
 * Metadata e modelit izolohet nga metadata e Core.
 */
async function generateWithModel({
  contextualQuery,
  language,
  requestId,
  conversationId,
  history,
  results,
  input
}) {
  if (!modelOrchestratorInstance) {
    return null;
  }

  const knowledgeContext = buildKnowledgeContext(results);

  const systemPrompt = [
    "You are the AI response engine of XSUS Studio.",
    "Answer accurately and directly.",
    "Use the supplied knowledge context when relevant.",
    "Do not invent facts, citations, URLs, or sources.",
    "If the supplied context is insufficient, be transparent.",
    `Respond in language: ${language}.`
  ].join("\n");

  const promptParts = [
    "Conversation context:",
    contextualQuery,
    knowledgeContext
      ? `Knowledge context:\n${knowledgeContext}`
      : ""
  ].filter(Boolean);

  let prompt = promptParts.join("\n\n");

  /*
   * Kontrata e modelit lejon maksimumi 32,000 karaktere.
   * Kufiri ynë është më i ulët për të rezervuar hapësirë
   * për systemPrompt dhe metadata.
   */
  if (prompt.length > MAX_MODEL_PROMPT_LENGTH) {
    prompt = truncateText(
      prompt,
      MAX_MODEL_PROMPT_LENGTH
    );
  }

  const modelParameters = isPlainObject(input.modelParameters)
    ? input.modelParameters
    : {};

  const modelRequest = createModelRequest({
    requestId,
    conversationId: conversationId || null,
    prompt,
    systemPrompt,
    language,
    modelId: input.modelId ?? null,

    context: {
      messages: history,
      knowledgeResults: Array.isArray(results)
        ? results.length
        : 0
    },

    metadata: {
      engine: "xsus-ai-core",
      coreVersion: AI_CORE_VERSION,
      knowledgeResults: Array.isArray(results)
        ? results.length
        : 0
    },

    parameters: modelParameters
  });

  const modelResponse =
    await modelOrchestratorInstance.generate(modelRequest);

  if (
    !isPlainObject(modelResponse) ||
    modelResponse.success !== true ||
    typeof modelResponse.text !== "string" ||
    !modelResponse.text.trim() ||
    typeof modelResponse.modelId !== "string" ||
    !modelResponse.modelId.trim()
  ) {
    const error = new Error(
      "Modeli nuk prodhoi një përgjigje të vlefshme."
    );

    error.code = MODEL_ERROR_CODES.INVALID_RESPONSE;

    throw error;
  }

  return {
    answer: modelResponse.text.trim(),
    modelId: modelResponse.modelId,
    language: normalizeLanguage(modelResponse.language) || language,
    finishReason: modelResponse.finishReason,
    usage: isPlainObject(modelResponse.usage)
      ? { ...modelResponse.usage }
      : {},
    metadata: isPlainObject(modelResponse.metadata)
      ? { ...modelResponse.metadata }
      : {}
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
     * Historiku paraprak lexohet para mesazhit aktual.
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

    let standardizedResponse;
    let modelResult = null;
    let responseSource = "xsus-knowledge-service";

    /*
     * Nëse Orchestrator është konfiguruar, përdoret modeli.
     * Përndryshe ruhet Response Engine ekzistues.
     */
    if (modelOrchestratorInstance) {
      try {
        modelResult = await generateWithModel({
          contextualQuery,
          language,
          requestId,
          conversationId,
          history,
          results,
          input
        });

        standardizedResponse = {
          success: true,
          answer: modelResult.answer,
          confidence: 0,
          version: "model-runtime",
          metadata: {
            modelId: modelResult.modelId,
            finishReason: modelResult.finishReason,
            usage: modelResult.usage
          }
        };

        responseSource = "xsus-model-runtime";
      } catch {
        return createErrorResponse({
          message: GENERIC_ERROR_MESSAGE,
          requestId,
          language,
          code: AI_ERROR_CODES.INTERNAL_ERROR,
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
              null
            )
          })
        });
      }
    } else {
      standardizedResponse = createResponse({
        results,
        language,
        requestId,
        conversationId: conversationId || null
      });
    }

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

    /*
     * Vlerësimi i cilësisë mbetet i përbashkët për të dyja
     * mënyrat: Response Engine dhe Model Runtime.
     */
    const responseSources = collectSources(
      results,
      knowledge,
      standardizedResponse
    );

    let responseQuality = null;

    try {
      const pipelineResult = responseQualityPipeline.evaluate({
        query: requestContext.query,
        answer,
        expectedLanguage: language,
        responseLanguage: language,
        sources: responseSources
      });

      if (
        pipelineResult &&
        pipelineResult.quality &&
        typeof pipelineResult.quality === "object"
      ) {
        responseQuality = pipelineResult.quality;
      }
    } catch {
      responseQuality = null;
    }

    if (memoryEnabled) {
      saveMemoryMessage(
        conversationId,
        "assistant",
        answer
      );

      await persistMemorySession(conversationId);
    }

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
      responseResult: standardizedResponse,
      responseQuality,
      modelResult
    });

    const confidence =
      typeof standardizedResponse.confidence === "number" &&
      Number.isFinite(standardizedResponse.confidence)
        ? standardizedResponse.confidence
        : 0;

    const response = createAIResponse({
      requestId,
      answer,
      language,
      source: responseSource,
      confidence,
      metadata
    });

    return {
      ...response,
      requestId,
      answer,
      language,
      source: responseSource,
      confidence,
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
