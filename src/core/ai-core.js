import {
  createAIRequest,
  createAIResponse,
  SUPPORTED_LANGUAGES
} from "./ai-core-contracts.js";

import {
  createRequestContext,
  isValidRequestContext
} from "./request-context.js";

import { searchKnowledge } from "../knowledge/knowledge-service.js";
import { detectLanguage } from "../language/language-engine.js";

function detectRequestLanguage(query, requestedLanguage) {
  const requested = typeof requestedLanguage === "string"
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
    fr: "Je n’ai pas trouvé suffisamment d’informations dans la base de connaissances. Reformulez la question ou ajoutez des connaissances sur ce sujet."
  };

  return answers[language] || answers.sq;
}

function buildAnswer(results) {
  const seen = new Set();
  const sections = [];

  for (const item of results) {
    const content = typeof item === "string"
      ? item.trim()
      : typeof item?.content === "string"
        ? item.content.trim()
        : "";

    if (!content) continue;

    const key = content.toLocaleLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    sections.push(content);
  }

  return sections.join("\n\n");
}

function buildMetadata(language, results, knowledge) {
  return {
    language,
    modelConnected: false,
    knowledgeResults: results.length,
    sources: Array.isArray(knowledge?.sources)
      ? knowledge.sources
      : [],
    engine: "xsus-ai-core",
    version: "1.0.0"
  };
}

function createErrorResponse(requestId, message, language = "auto") {
  return {
    requestId,
    answer: "",
    language,
    source: "xsus-ai-core",
    confidence: null,
    metadata: {
      engine: "xsus-ai-core"
    },
    error: message,
    timestamp: new Date().toISOString(),
    version: "1.0.0"
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

    if (typeof input.query !== "string" || !input.query.trim()) {
      return createErrorResponse(
        typeof input.id === "string" ? input.id : null,
        "Shkruaj një pyetje për XSUS AI."
      );
    }

    const request = createAIRequest(input);
    requestId = request.id;

    language = detectRequestLanguage(
      request.query,
      request.language
    );

    const context = createRequestContext({
      ...request,
      language
    });

    if (!isValidRequestContext(context)) {
      return createErrorResponse(
        requestId,
        "Konteksti i kërkesës nuk është i vlefshëm.",
        language
      );
    }

    const knowledge = await searchKnowledge(
      context.query,
      {
        language: context.language,
        limit: 5,
        metadata: {
          requestId: context.requestId,
          moduleName: context.moduleName
        }
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

    const results = Array.isArray(knowledge)
      ? knowledge
      : Array.isArray(knowledge.results)
        ? knowledge.results
        : [];

    const answer = buildAnswer(results);

    return createAIResponse({
      requestId,
      answer: answer || getFallbackAnswer(language),
      language,
      source: "xsus-knowledge-service",
      confidence: null,
      metadata: buildMetadata(language, results, knowledge)
    });
  } catch (error) {
    return createErrorResponse(
      requestId,
      error instanceof Error
        ? error.message
        : "Ndodhi një gabim gjatë përpunimit të kërkesës.",
      language
    );
  }
}
