
import { describe, expect, test } from "vitest";

import {
  CONVERSATION_RESPONSE_ENGINE_VERSION,
  isPreviousQuestionRequest,
  findPreviousUserQuestion,
  createConversationResponse
} from "../../src/core/conversation-response-engine.js";

describe("XSUS Conversation Response Engine", () => {
  describe("Version and detection", () => {
    test("uses the expected version", () => {
      expect(CONVERSATION_RESPONSE_ENGINE_VERSION).toBe("1.0.0");
    });

    test("detects previous-question requests in Albanian", () => {
      expect(isPreviousQuestionRequest({
        query: "Çfarë pyetjeje të bëra më parë?",
        language: "sq"
      })).toBe(true);
    });

    test("detects previous-question requests in English", () => {
      expect(isPreviousQuestionRequest({
        query: "What did I ask you before?",
        language: "en"
      })).toBe(true);
    });

    test("detects previous-question requests in French", () => {
      expect(isPreviousQuestionRequest({
        query: "Quelle était ma question précédente ?",
        language: "fr"
      })).toBe(true);
    });

    test("does not intercept ordinary questions", () => {
      expect(isPreviousQuestionRequest({
        query: "Çfarë është inteligjenca artificiale?",
        language: "sq"
      })).toBe(false);
    });

    test("does not intercept empty questions", () => {
      expect(isPreviousQuestionRequest({
        query: "   ",
        language: "sq"
      })).toBe(false);
    });
  });

  describe("History retrieval", () => {
    test("returns the latest previous user message", () => {
      const result = findPreviousUserQuestion({
        history: [
          { role: "user", content: "Pyetja e parë" },
          { role: "assistant", content: "Përgjigjja" },
          { role: "user", content: "Pyetja e dytë" }
        ]
      });

      expect(result).toBe("Pyetja e dytë");
    });

    test("ignores assistant messages", () => {
      const result = findPreviousUserQuestion({
        history: [
          { role: "user", content: "Përshëndetje" },
          { role: "assistant", content: "Si mund të ndihmoj?" }
        ]
      });

      expect(result).toBe("Përshëndetje");
    });

    test("returns null for empty history", () => {
      expect(findPreviousUserQuestion({
        history: []
      })).toBeNull();
    });

    test("ignores invalid history entries", () => {
      const result = findPreviousUserQuestion({
        history: [
          null,
          {},
          { role: "user", content: "   " },
          { role: "user", content: "Pyetje e vlefshme" }
        ]
      });

      expect(result).toBe("Pyetje e vlefshme");
    });
  });

  describe("Response creation", () => {
    test("answers previous-question requests in Albanian", () => {
      const result = createConversationResponse({
        query: "Çfarë pyetjeje të bëra më parë?",
        language: "sq",
        history: [
          {
            role: "user",
            content: "Përshëndetje! Kush je ti?"
          }
        ],
        conversationId: "xsus-test-001"
      });

      expect(result.handled).toBe(true);
      expect(result.success).toBe(true);
      expect(result.answer).toContain(
        "Përshëndetje! Kush je ti?"
      );
      expect(result.metadata.previousQuestionFound).toBe(true);
      expect(result.metadata.conversationId).toBe("xsus-test-001");
    });

    test("answers in English", () => {
      const result = createConversationResponse({
        query: "What did I ask you before?",
        language: "en",
        history: [
          { role: "user", content: "Who are you?" }
        ]
      });

      expect(result.handled).toBe(true);
      expect(result.answer).toContain("Who are you?");
      expect(result.language).toBe("en");
    });

    test("answers in French", () => {
      const result = createConversationResponse({
        query: "Quelle était ma question précédente ?",
        language: "fr",
        history: [
          { role: "user", content: "Bonjour !" }
        ]
      });

      expect(result.handled).toBe(true);
      expect(result.answer).toContain("Bonjour !");
      expect(result.language).toBe("fr");
    });

    test("does not invent a previous question", () => {
      const result = createConversationResponse({
        query: "Çfarë pyetjeje të bëra më parë?",
        language: "sq",
        history: []
      });

      expect(result.handled).toBe(true);
      expect(result.metadata.previousQuestionFound).toBe(false);
      expect(result.answer).toContain(
        "Nuk kam një pyetje të mëparshme"
      );
    });

    test("leaves ordinary questions to the normal pipeline", () => {
      const result = createConversationResponse({
        query: "Çfarë është JavaScript?",
        language: "sq",
        history: [
          { role: "user", content: "Përshëndetje" }
        ]
      });

      expect(result.handled).toBe(false);
      expect(result.success).toBe(false);
      expect(result.answer).toBe("");
    });

    test("preserves response identifiers", () => {
      const result = createConversationResponse({
        query: "Çfarë pyetjeje të bëra më parë?",
        language: "sq",
        history: [],
        requestId: "request-123",
        conversationId: "conversation-123"
      });

      expect(result.metadata.requestId).toBe("request-123");
      expect(result.metadata.conversationId).toBe("conversation-123");
      expect(result.version).toBe("1.0.0");
    });
  });
});
