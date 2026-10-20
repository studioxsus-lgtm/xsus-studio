
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

function detectRequestLanguage(query, requestedLanguage) {
  const supported = ["sq", "en", "fr"];

  if (supported.includes(requestedLanguage)) {
    return requestedLanguage;
  }

  const detected = detectLanguage(query);
  return supported.includes(detected) ? detected : "sq";
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

    const knowledge = await searchKnowledge(
      context.query,
      {
        language: context.language,
        limit: 5
      }
    );

    const results = Array.isArray(knowledge)
      ? knowledge
      : Array.isArray(knowledge?.results)
        ? knowledge.results
        : [];

    const answer = results
      .map(item => {
        if (typeof item === "string") return item;
        return typeof item?.content === "string"
          ? item.content
          : "";
      })
      .filter(Boolean)
      .join("\n\n");

    if (!answer) {
      return createAIResponse({
        requestId,
        status: REQUEST_STATUS.SUCCESS,
        answer:
          context.language === "sq"
            ? "Nuk gjeta informacion të mjaftueshëm në bazën e njohurive. Lidhja me modelin AI duhet të konfigurohet për të krijuar një përgjigje më të plotë."
            : context.language === "fr"
              ? "Je n’ai pas trouvé suffisamment d’informations dans la base de connaissances. Le modèle IA doit être configuré pour produire une réponse plus complète."
              : "I couldn't find enough information in the knowledge base. The AI model must be configured to generate a fuller answer.",
        source: "xsus-knowledge-service",
        metadata: {
          language: context.language,
          modelConnected: false
        }
      });
    }

    return createAIResponse({
      requestId,
      status: REQUEST_STATUS.SUCCESS,
      answer,
      source: "xsus-knowledge-service",
      metadata: {
        language: context.language,
        modelConnected: false,
        knowledgeResults: results.length
      }
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
