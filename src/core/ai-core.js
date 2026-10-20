
import {
  REQUEST_STATUS,
  createAIRequest,
  createAIResponse
} from "./ai-core-contracts.js";

import {
  createRequestContext,
  isValidRequestContext
} from "./request-context.js";

import { searchKnowledge } from "../knowledge/knowledge-service.js";
import { detectLanguage } from "../language/language-engine.js";

const SUPPORTED_LANGUAGES = ["sq", "en", "fr"];

function detectRequestLanguage(query, requestedLanguage) {
  const requested = typeof requestedLanguage === "string"
    ? requestedLanguage.trim().toLowerCase().split("-")[0]
    : "auto";

  if (SUPPORTED_LANGUAGES.includes(requested)) {
    return requested;
  }

  const detected = detectLanguage(query);
  return SUPPORTED_LANGUAGES.includes(detected) ? detected : "sq";
}

function getFallbackAnswer(language) {
  const answers = {
    sq: "Nuk gjeta informacion të mjaftueshëm në bazën e njohurive për këtë pyetje. Provo ta formulosh ndryshe ose shto njohuri për këtë temë.",
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
    engine: "xsus-ai-core"
  };
}

export async function processAIRequest(input = {}) {
  let requestId = null;

  try {
    const request = createAIRequest(input);
    requestId = request.id;

    if (!request.query) {
      return createAIResponse({
        requestId,
        status: REQUEST_STATUS.ERROR,
        answer: "",
        error: "Shkruaj një pyetje për XSUS AI."
      });
    }

    const language = detectRequestLanguage(
      request.query,
      request.language
    );

    const context = createRequestContext({
      ...request,
      language
    });

    if (!isValidRequestContext(context)) {
      return createAIResponse({
        requestId,
        status: REQUEST_STATUS.ERROR,
        error: "Konteksti i kërkesës nuk është i vlefshëm."
      });
    }

    const knowledge = await searchKnowledge(context.query, {
      language: context.language,
      limit: 5,
      metadata: {
        requestId: context.requestId,
        moduleName: context.moduleName
      }
    });

    if (!knowledge || knowledge.success === false) {
      return createAIResponse({
        requestId,
        status: REQUEST_STATUS.ERROR,
        error: knowledge?.error ||
          "Kërkimi në bazën e njohurive dështoi."
      });
    }

    const results = Array.isArray(knowledge)
      ? knowledge
      : Array.isArray(knowledge.results)
        ? knowledge.results
        : [];

    const answer = buildAnswer(results);
    const metadata = buildMetadata(
      context.language,
      results,
      knowledge
    );

    return createAIResponse({
      requestId,
      status: REQUEST_STATUS.SUCCESS,
      answer: answer || getFallbackAnswer(context.language),
      source: "xsus-knowledge-service",
      metadata
    });
  } catch (error) {
    return createAIResponse({
      requestId,
      status: REQUEST_STATUS.ERROR,
      error: error instanceof Error
        ? error.message
        : "Ndodhi një gabim gjatë përpunimit të kërkesës."
    });
  }
}
