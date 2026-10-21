
/**
 * XSUS AI Core — Request Orchestrator
 * Version: 1.1.0
 *
 * Përgjegjësitë:
 * - Validimi dhe përpunimi i kërkesave.
 * - Përcaktimi i gjuhës së përgjigjes.
 * - Integrimi me Context Engine.
 * - Kërkimi në bazën e njohurive.
 * - Normalizimi i përgjigjeve dhe metadata.
 */

import {
  createAIRequest,
  createAIResponse,
  SUPPORTED_LANGUAGES,
} from "./ai-core-contracts.js";

import {
  createRequestContext,
  isValidRequestContext,
} from "./request-context.js";

import {
  createContext,
} from "./context-engine.js";

import {
  searchKnowledge,
} from "../knowledge/knowledge-service.js";

import {
  detectLanguage,
} from "../language/language-engine.js";

export const AI_CORE_VERSION = "1.1.0";

function detectRequestLanguage(query, requestedLanguage) {
  const requested =
    typeof requestedLanguage === "string"
      ? requestedLanguage.trim().toLowerCase().split("-")[0]
      : "auto";

  if (SUPPORTED_LANGUAGES.includes(requested)) {
    return requested;
  }

  const detected = detectLanguage(query);

  return SUPPORTED_LANGUAGES.includes(detected)
    ? detected
    : "sq";
}

function getFallbackAnswer(language) {
  const answers = {
    sq: "Nuk gjeta informacion të mjaftueshëm në bazën e njohurive. Provo ta formulosh pyetjen ndryshe ose shto njohuri për këtë temë.",
    en: "I couldn't find enough information in the knowledge base. Try rephrasing your question or adding knowledge about this topic.",
    fr: "Je n’ai pas trouvé suffisamment d’informations dans la base de connaissances. Reformulez la question ou ajoutez des connaissances sur ce sujet.",
  };

  return answers[language] || answers.sq;
}

function buildAnswer(results) {
  if (!Array.isArray(results)) {
    return "";
  }

  const seen = new Set();
  const sections = [];

  for (const item of results) {
    const content =
      typeof item === "string"
        ? item.trim()
        : typeof item?.content === "string"
          ? item.content.trim()
          : "";

    if (!content) continue;

    const key = content
      .normalize("NFC")
      .toLocaleLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    sections.push(content);
  }

  return sections.join("\n\n");
}

function buildMetadata(language, results, knowledge, context) {
  return {
    language,
    modelConnected: false,
    knowledgeResults: results.length,
    sources: Array.isArray(knowledge?.sources)
      ? knowledge.sources
      : [],
    context: {
      conversationId: context.conversationId,
      historyMessageCount: context.history.length,
      hasPreviousContext: context.metadata.hasPreviousContext,
      totalHistoryCharacters:
        context.metadata.totalHistoryCharacters,
    },
    engine: "xsus-ai-core",
    version: AI_CORE_VERSION,
  };
}

function createErrorResponse(
  requestId,
  message,
  language = "auto"
) {
  return {
    requestId,
    answer: "",
    language,
    source: "xsus-ai-core",
    confidence: null,
    metadata: {
      engine: "xsus-ai-core",
      version: AI_CORE_VERSION,
    },
    error: message,
    timestamp: new Date().toISOString(),
    version: AI_CORE_VERSION,
  };
}

export async function processAIRequest(input = {}) {
  let requestId = null;
  let language = "auto";

  try {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      return createErrorResponse(
        null,
        "Kërkesa duhet të jetë një objekt i vlefshëm."
      );
    }

    if (
      typeof input.query !== "string" ||
      !input.query.trim()
    ) {
      return createErrorResponse(
        typeof input.id === "string" ? input.id : null,
        "Shkruaj një pyetje për XSUS AI."
      );
    }

    // 1. Krijimi dhe validimi i kërkesës.
    const request = createAIRequest(input);
    requestId = request.id;

    // 2. Përcaktimi i gjuhës.
    language = detectRequestLanguage(
      request.query,
      request.language
    );

    // 3. Ndërtimi i kontekstit bisedor.
    const requestContext = request.context || {};

    const context = createContext({
      messages: Array.isArray(input.messages)
        ? input.messages
        : Array.isArray(requestContext.messages)
          ? requestContext.messages
          : [],
      userMessage: request.query,
      language,
      conversationId:
        typeof input.conversationId === "string"
          ? input.conversationId
          : typeof requestContext.conversationId === "string"
            ? requestContext.conversationId
            : null,
    });

    // 4. Krijimi i kontekstit standard të kërkesës.
    const validatedContext = createRequestContext({
      id: request.id,
      query: context.userMessage,
      language: context.language,
      moduleName:
        typeof input.moduleName === "string"
          ? input.moduleName
          : "xsus-ai",
      metadata: {
        ...request.metadata,
        conversationId: context.conversationId,
        historyMessageCount: context.history.length,
      },
    });

    if (!isValidRequestContext(validatedContext)) {
      return createErrorResponse(
        requestId,
        "Konteksti i kërkesës nuk është i vlefshëm.",
        language
      );
    }

    // 5. Kërkimi në bazën e njohurive.
    const knowledge = await searchKnowledge(
      validatedContext.query,
      {
        language: validatedContext.language,
        limit: 5,
        metadata: {
          requestId: validatedContext.requestId,
          moduleName: validatedContext.moduleName,
          conversationId: context.conversationId,
        },
      }
    );

    if (!knowledge || knowledge.success === false) {
      return createErrorResponse(
        requestId,
        knowledge?.error ||
          "Kërkimi në bazën e njohurive dështoi.",
        language
      );
    }

    // 6. Normalizimi i rezultateve.
    const results = Array.isArray(knowledge)
      ? knowledge
      : Array.isArray(knowledge.results)
        ? knowledge.results
        : [];

    const answer = buildAnswer(results);

    // 7. Krijimi i përgjigjes standarde.
    return createAIResponse({
      requestId,
      answer: answer || getFallbackAnswer(language),
      language,
      source: "xsus-knowledge-service",
      confidence: null,
      metadata: buildMetadata(
        language,
        results,
        knowledge,
        context
      ),
    });
  } catch (error) {
    // Mos ekspozo detaje të brendshme të gabimeve te përdoruesi.
    return createErrorResponse(
      requestId,
      "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.",
      language
    );
  }
}
