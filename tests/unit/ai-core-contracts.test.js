import { describe, expect, test } from "vitest";

import {
  createAIRequest,
  createAIResponse,
  REQUEST_TYPES,
  SUPPORTED_LANGUAGES,
  XSUS_CORE_VERSION
} from "../../src/core/ai-core-contracts.js";

describe("XSUS AI Core Contracts", () => {
  test("ekspozon versionin dhe gjuhët bazë", () => {
    expect(XSUS_CORE_VERSION).toBe("1.0.0");
    expect(SUPPORTED_LANGUAGES).toEqual(["sq", "en", "fr"]);
  });

  test("krijon një kërkesë të vlefshme", () => {
    const request = createAIRequest({
      query: "Përshëndetje",
      language: "sq"
    });

    expect(request.query).toBe("Përshëndetje");
    expect(request.language).toBe("sq");
    expect(request.type).toBe(REQUEST_TYPES.CHAT);
    expect(request.id).toBeTruthy();
    expect(request.timestamp).toBeTruthy();
  });

  test("standardizon kodet rajonale", () => {
    expect(
      createAIRequest({
        query: "Hello",
        language: "en-us"
      }).language
    ).toBe("en-US");

    expect(
      createAIRequest({
        query: "Bonjour",
        language: "fr-fr"
      }).language
    ).toBe("fr-FR");
  });

  test("pranon gjuhën automatike", () => {
    expect(
      createAIRequest({
        query: "Hello",
        language: "AUTO"
      }).language
    ).toBe("auto");
  });

  test("refuzon pyetjen bosh", () => {
    expect(() => createAIRequest({ query: "  " }))
      .toThrow("Query duhet të jetë tekst jo bosh.");
  });

  test("refuzon kodin e pavlefshëm të gjuhës", () => {
    expect(() =>
      createAIRequest({
        query: "Hello",
        language: "en_US"
      })
    ).toThrow("Gjuha nuk është e vlefshme.");
  });

  test("refuzon llojin e panjohur të kërkesës", () => {
    expect(() =>
      createAIRequest({
        query: "Hello",
        type: "unknown"
      })
    ).toThrow("Lloji i kërkesës nuk njihet.");
  });

  test("krijon përgjigje të vlefshme", () => {
    const response = createAIResponse({
      requestId: "test-123",
      answer: "Hello!",
      language: "en-us",
      confidence: 0.95
    });

    expect(response.requestId).toBe("test-123");
    expect(response.answer).toBe("Hello!");
    expect(response.language).toBe("en-US");
    expect(response.confidence).toBe(0.95);
    expect(response.version).toBe(XSUS_CORE_VERSION);
  });

  test("refuzon confidence jashtë intervalit", () => {
    expect(() =>
      createAIResponse({
        answer: "Hello",
        confidence: 1.5
      })
    ).toThrow("Confidence duhet të jetë numër nga 0 deri në 1.");
  });

  test("refuzon përgjigjen bosh", () => {
    expect(() =>
      createAIResponse({
        answer: "   "
      })
    ).toThrow("Answer duhet të jetë tekst jo bosh.");
  });
});
