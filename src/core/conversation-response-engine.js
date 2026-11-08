
/**
 * XSUS AI Core — Conversation Response Engine
 * Version: 1.0.0
 *
 * Përgjigje deterministe për pyetje të qarta
 * mbi historikun e bisedës.
 *
 * Nuk përdor model gjenerues.
 * Nuk ndryshon Response Engine ekzistues.
 */

export const CONVERSATION_RESPONSE_ENGINE_VERSION = "1.0.0";

const SUPPORTED_LANGUAGES = Object.freeze([
  "sq",
  "en",
  "fr"
]);

const HISTORY_QUESTION_PATTERNS = Object.freeze({
  sq: [
    /(?:çfarë|cfare|cilën|cilen)\s+pyetje(?:je)?\s+(?:të|te)\s+(?:bëra|bera)\s+(?:më|me)\s+parë/i,
    /(?:çfarë|cfare)\s+(?:të|te)\s+(?:pyeta|kam pyetur)\s+(?:më|me)\s+parë/i,
    /(?:cila|cilat)\s+(?:ishte|ishin)\s+pyetj(?:a|et)\s+(?:ime\s+)?(?:e\s+)?(?:më|me)\s+parë/i
  ],
  en: [
    /what\s+(?:was|were)\s+(?:my\s+)?(?:previous|last|earlier)\s+questions?/i,
    /what\s+did\s+i\s+ask\s+(?:you\s+)?(?:before|earlier|previously|last)/i
  ],
  fr: [
    /quelle(?:s)?\s+(?:était|étaient)\s+(?:ma|mes)\s+(?:question|questions)\s+précédente(?:s)?/i,
    /qu(?:'|’|e\s+)(?:est-ce\s+que\s+)?(?:je\s+)?(?:t'ai|vous\s+ai|j'ai)\s+demandé\s+(?:avant|précédemment)/i
  ]
});

const NO_HISTORY_MESSAGES = Object.freeze({
  sq: "Nuk kam një pyetje të mëparshme në historikun e kësaj bisede.",
  en: "I don't have a previous question in this conversation's history.",
  fr: "Je n'ai pas de question précédente dans l'historique de cette conversation."
});

const PREVIOUS_QUESTION_LABELS = Object.freeze({
  sq: "Pyetja jote e mëparshme ishte:",
  en: "Your previous question was:",
  fr: "Votre question précédente était :"
});

function normalizeLanguage(language) {
  if (typeof language !== "string") {
    return "sq";
  }

  const normalized = language
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .split("-")[0];

  return SUPPORTED_LANGUAGES.includes(normalized)
    ? normalized
    : "sq";
}

function normalizeQuestion(question) {
  if (typeof question !== "string") {
    return "";
  }

  return question
    .normalize("NFC")
    .trim();
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(message =>
      message !== null &&
      typeof message === "object" &&
      !Array.isArray(message) &&
      message.role === "user" &&
      typeof message.content === "string" &&
      message.content.trim().length > 0
    )
    .map(message => ({
      role: "user",
      content: normalizeQuestion(message.content)
    }));
}

/**
 * Identifikon vetëm pyetje të qarta mbi
 * pyetjen e mëparshme të përdoruesit.
 */
export function isPreviousQuestionRequest({
  query = "",
  language = "sq"
} = {}) {
  const normalizedQuery = normalizeQuestion(query);

  if (!normalizedQuery) {
    return false;
  }

  const normalizedLanguage = normalizeLanguage(language);

  return HISTORY_QUESTION_PATTERNS[
    normalizedLanguage
  ].some(pattern => pattern.test(normalizedQuery));
}

/**
 * Gjen pyetjen e fundit të përdoruesit
 * përpara kërkesës aktuale.
 *
 * Historiku pritet të mos përfshijë
 * mesazhin aktual.
 */
export function findPreviousUserQuestion({
  history = []
} = {}) {
  const userMessages = normalizeHistory(history);

  if (userMessages.length === 0) {
    return null;
  }

  return userMessages[userMessages.length - 1].content;
}

/**
 * Krijon përgjigje vetëm për kërkesat
 * e mbështetura mbi historikun.
 *
 * handled=false do të thotë që kërkesa
 * duhet të vazhdojë në pipeline-in normal.
 */
export function createConversationResponse({
  query = "",
  language = "sq",
  history = [],
  requestId = null,
  conversationId = null
} = {}) {
  const normalizedLanguage = normalizeLanguage(language);

  if (!isPreviousQuestionRequest({
    query,
    language: normalizedLanguage
  })) {
    return {
      handled: false,
      success: false,
      answer: "",
      language: normalizedLanguage,
      source: "xsus-conversation-response-engine",
      version: CONVERSATION_RESPONSE_ENGINE_VERSION,
      metadata: {
        requestId,
        conversationId,
        previousQuestionFound: false
      }
    };
  }

  const previousQuestion = findPreviousUserQuestion({
    history
  });

  const answer = previousQuestion
    ? `${PREVIOUS_QUESTION_LABELS[normalizedLanguage]}\n\n"${previousQuestion}"`
    : NO_HISTORY_MESSAGES[normalizedLanguage];

  return {
    handled: true,
    success: true,
    answer,
    language: normalizedLanguage,
    source: "xsus-conversation-response-engine",
    version: CONVERSATION_RESPONSE_ENGINE_VERSION,
    metadata: {
      requestId,
      conversationId,
      previousQuestionFound: Boolean(previousQuestion)
    }
  };
}

export default createConversationResponse;
