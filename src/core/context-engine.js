
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 8000;

function normalizeMessage(message) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const role = message.role;
  if (!["system", "user", "assistant"].includes(role)) {
    return null;
  }

  if (typeof message.content !== "string") {
    return null;
  }

  const content = message.content.trim();

  if (!content || content.length > MAX_MESSAGE_LENGTH) {
    return null;
  }

  return { role, content };
}

export function createContext({
  messages = [],
  userMessage,
  language = "sq",
  conversationId = null,
} = {}) {
  if (typeof userMessage !== "string" || !userMessage.trim()) {
    throw new TypeError("userMessage duhet të jetë tekst jo bosh.");
  }

  const history = Array.isArray(messages)
    ? messages
        .map(normalizeMessage)
        .filter(Boolean)
        .slice(-MAX_HISTORY_MESSAGES)
    : [];

  return {
    conversationId,
    language,
    history,
    userMessage: userMessage.trim().slice(0, MAX_MESSAGE_LENGTH),
    metadata: {
      messageCount: history.length,
      hasPreviousContext: history.length > 0,
    },
  };
}

export function buildContextPrompt(context) {
  if (!context || typeof context.userMessage !== "string") {
    throw new TypeError("Konteksti i XSUS AI Core është i pavlefshëm.");
  }

  const language = context.language || "sq";

  const languageNames = {
    sq: "shqip",
    en: "anglisht",
    it: "italisht",
    de: "gjermanisht",
    fr: "frëngjisht",
  };

  const targetLanguage = languageNames[language] || language;

  return {
    instructions: [
      "Je bërthama bisedore e XSUS AI.",
      `Përgjigju në ${targetLanguage}, përveçse kur përdoruesi kërkon një gjuhë tjetër.`,
      "Përdor historikun vetëm kur është i rëndësishëm për mesazhin aktual.",
      "Mos shpik fakte që nuk mbështeten nga konteksti ose njohuritë e disponueshme.",
      "Nëse mungon informacion i domosdoshëm, kërko sqarim.",
    ],
    messages: [
      ...context.history,
      { role: "user", content: context.userMessage },
    ],
  };
}
