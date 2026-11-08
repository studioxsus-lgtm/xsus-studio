
/**
 * XSUS AI V3 — XSUS AI Core HTTP Adapter
 * Version: 1.0.0
 *
 * Independent frontend integration boundary.
 * No direct imports from XSUS AI Core.
 */

export const XSUS_AI_CORE_ADAPTER_VERSION = "1.0.0";

// Replace with the verified Render API origin
// if the frontend is hosted on another domain.
const DEFAULT_API_URL =
  "https://xsus-studio.onrender.com/api/chat";

export function createXSUSCoreAdapter(options = {}) {
  const {
    endpoint = DEFAULT_API_URL,
    getLanguage = () => "sq",
    timeoutMs = 30000
  } = options;

  return async function xsusCoreAdapter(request = {}) {
    const message =
      typeof request.message === "string"
        ? request.message.trim()
        : "";

    if (!message) {
      throw new Error("Message cannot be empty.");
    }

    const conversationId =
      typeof request.conversationId === "string"
        ? request.conversationId.trim()
        : "";

    if (!conversationId) {
      throw new Error("Conversation ID is required.");
    }

    const language = getLanguage();

    if (!["sq", "en", "fr"].includes(language)) {
      throw new Error("Unsupported language.");
    }

    const attachments = Array.isArray(request.attachments)
      ? request.attachments
      : [];

    if (attachments.length > 0) {
      throw new Error(
        "File attachments are not yet supported by the XSUS AI Core chat API."
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: message,
          language,
          conversationId
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(
          `XSUS AI Core HTTP error: ${response.status}`
        );
      }

      const data = await response.json();

      if (
        !data ||
        typeof data.answer !== "string"
      ) {
        throw new Error(
          "Invalid response from XSUS AI Core."
        );
      }

      if (data.error) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "XSUS AI Core returned an error."
        );
      }

      return {
        answer: data.answer,
        source: data.source ?? null,
        confidence: data.confidence ?? null,
        metadata: data.metadata ?? {},
        requestId: data.requestId ?? null
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(
          "XSUS AI Core request timed out."
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
}
