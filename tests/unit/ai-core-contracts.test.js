
import { describe, expect, test } from "vitest";

import {
  createAIRequest,
  createAIResponse,
  createAIErrorResponse,
  AI_ERROR_CODES,
  REQUEST_TYPES,
  SUPPORTED_LANGUAGES,
  XSUS_CORE_VERSION
} from "../../src/core/ai-core-contracts.js";

describe("XSUS AI Core Contracts", () => {
  test("ekspozon versionin dhe gjuhët bazë", () => {
    expect(XSUS_CORE_VERSION).toBe("1.0.0");
    expect(SUPPORTED_LANGUAGES).toEqual(["sq", "en", "fr"]);
    expect(Object.isFrozen(SUPPORTED_LANGUAGES)).toBe(true);
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
    expect(request.version).toBe(XSUS_CORE_VERSION);
    expect(Number.isNaN(Date.parse(request.timestamp))).toBe(false);
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

    expect(
      createAIRequest({
        query: "Përshëndetje",
        language: "sq-al"
      }).language
    ).toBe("sq-AL");
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
    for (const language of ["en_US", "de", "en-USA", "en-", ""]) {
      expect(() =>
        createAIRequest({
          query: "Hello",
          language
        })
      ).toThrow("Gjuha nuk është e vlefshme.");
    }
  });

  test("refuzon gjuhën që nuk është tekst", () => {
    expect(() =>
      createAIRequest({
        query: "Hello",
        language: null
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

  test("refuzon kërkesën që nuk është objekt i thjeshtë", () => {
    expect(() => createAIRequest(null))
      .toThrow("Kërkesa duhet të jetë një objekt i vlefshëm.");

    expect(() => createAIRequest("Hello"))
      .toThrow("Kërkesa duhet të jetë një objekt i vlefshëm.");
  });

  test("refuzon kontekstin dhe metadata-n e pavlefshme", () => {
    expect(() =>
      createAIRequest({
        query: "Hello",
        context: []
      })
    ).toThrow("Konteksti i kërkesës nuk është i vlefshëm.");

    expect(() =>
      createAIRequest({
        query: "Hello",
        metadata: "invalid"
      })
    ).toThrow("Metadata e kërkesës nuk është e vlefshme.");
  });

  test("normalizon tekstin dhe kopjon objektet hyrëse", () => {
    const context = { session: "abc" };
    const metadata = { origin: "test" };

    const request = createAIRequest({
      query: "  Hello  ",
      language: "en",
      context,
      metadata
    });

    expect(request.query).toBe("Hello");
    expect(request.context).toEqual(context);
    expect(request.context).not.toBe(context);
    expect(request.metadata).toEqual(metadata);
    expect(request.metadata).not.toBe(metadata);
  });

  test("refuzon ID-në e pavlefshme të kërkesës", () => {
    expect(() =>
      createAIRequest({
        id: "   ",
        query: "Hello"
      })
    ).toThrow("ID-ja e kërkesës nuk është e vlefshme.");
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
    expect(response.timestamp).toBeTruthy();
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });

  test("pranon confidence në kufijtë e intervalit", () => {
    expect(
      createAIResponse({
        answer: "Përgjigjja",
        confidence: 0
      }).confidence
    ).toBe(0);

    expect(
      createAIResponse({
        answer: "Përgjigjja",
        confidence: 1
      }).confidence
    ).toBe(1);
  });

  test("refuzon confidence jashtë intervalit", () => {
    for (const confidence of [-0.1, 1.5, NaN, Infinity, "0.5"]) {
      expect(() =>
        createAIResponse({
          answer: "Hello",
          confidence
        })
      ).toThrow(
        "Confidence duhet të jetë numër nga 0 deri në 1."
      );
    }
  });

  test("refuzon përgjigjen bosh", () => {
    expect(() =>
      createAIResponse({
        answer: "   "
      })
    ).toThrow("Answer duhet të jetë tekst jo bosh.");
  });

  test("refuzon metadata-n e pavlefshme të përgjigjes", () => {
    expect(() =>
      createAIResponse({
        answer: "Hello",
        metadata: []
      })
    ).toThrow("Metadata e përgjigjes nuk është e vlefshme.");
  });

  test("krijon përgjigje gabimi me kod standard", () => {
    const response = createAIErrorResponse({
      requestId: "error-123",
      error: "Provo përsëri.",
      code: AI_ERROR_CODES.KNOWLEDGE_SERVICE_ERROR,
      language: "sq"
    });

    expect(response.requestId).toBe("error-123");
    expect(response.answer).toBe("");
    expect(response.error).toBe("Provo përsëri.");
    expect(response.language).toBe("sq");
    expect(response.confidence).toBeNull();
    expect(response.metadata.errorCode)
      .toBe(AI_ERROR_CODES.KNOWLEDGE_SERVICE_ERROR);
    expect(response.metadata.version).toBe(XSUS_CORE_VERSION);
    expect(response.version).toBe(XSUS_CORE_VERSION);
  });

  test("zëvendëson kodin e panjohur të gabimit", () => {
    const response = createAIErrorResponse({
      error: "Gabim",
      code: "UNKNOWN_ERROR"
    });

    expect(response.metadata.errorCode)
      .toBe(AI_ERROR_CODES.INTERNAL_ERROR);
  });

  test("përdor mesazhin standard kur mesazhi i gabimit është bosh", () => {
    const response = createAIErrorResponse({
      error: "   "
    });

    expect(response.error).toBe(
      "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri."
    );
  });

  test("refuzon metadata-n e pavlefshme të gabimit", () => {
    expect(() =>
      createAIErrorResponse({
        error: "Gabim",
        metadata: []
      })
    ).toThrow("Metadata e gabimit nuk është e vlefshme.");
  });
});
