
import { describe, expect, test } from "vitest";

import {
  RESPONSE_ENGINE_VERSION,
  normalizeResponseResults,
  calculateResponseConfidence,
  createResponse,
  createResponseMetadata,
  getFallbackResponse
} from "../../src/core/response-engine.js";

describe("XSUS Response Engine", () => {
  test("përdor versionin e pritshëm", () => {
    expect(RESPONSE_ENGINE_VERSION).toBe("1.3.0");
  });

  test("normalizon dhe pastron rezultatet", () => {
    const results = normalizeResponseResults([
      { content: "  Përgjigjja e parë  ", source: "kb-1" },
      { content: "Përgjigjja e parë", source: "kb-2" },
      { content: "Përgjigjja e dytë" },
      { content: "" },
      null
    ]);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      content: "Përgjigjja e parë",
      source: "kb-1"
    });
    expect(results[1].content).toBe("Përgjigjja e dytë");
  });

  test("mbështet formatet content, answer dhe text", () => {
    const results = normalizeResponseResults([
      { content: "Përgjigjja A" },
      { answer: "Përgjigjja B" },
      { text: "Përgjigjja C" }
    ]);

    expect(results.map((item) => item.content)).toEqual([
      "Përgjigjja A",
      "Përgjigjja B",
      "Përgjigjja C"
    ]);
  });

  test("heq dublikatat pa dallim të shkronjave të mëdha", () => {
    const results = normalizeResponseResults([
      { content: "XSUS AI" },
      { content: "xsus ai" }
    ]);

    expect(results).toHaveLength(1);
  });

  test("kthen listë bosh për hyrje të pavlefshme", () => {
    expect(normalizeResponseResults(null)).toEqual([]);
    expect(normalizeResponseResults("tekst")).toEqual([]);
    expect(normalizeResponseResults([])).toEqual([]);
  });

  test("normalizon hapësirat dhe rreshtat", () => {
    const results = normalizeResponseResults([
      { content: "  Përshëndetje!  \r\n\r\n\r\n Si je?  " }
    ]);

    expect(results[0].content).toBe("Përshëndetje!\n\n Si je?");
  });

  test("mbështet gjuhën shqipe", () => {
    const result = createResponse({
      results: [{ content: "Përshëndetje!" }],
      language: "sq"
    });

    expect(result.language).toBe("sq");
    expect(result.answer).toBe("Përshëndetje!");
    expect(result.success).toBe(true);
    expect(result.source).toBe("xsus-response-engine");
    expect(result.version).toBe(RESPONSE_ENGINE_VERSION);
  });

  test("bashkon disa rezultate pa dublikime", () => {
    const result = createResponse({
      results: [
        { content: "Rreshti i parë" },
        { content: "Rreshti i dytë" },
        { content: "Rreshti i parë" }
      ],
      language: "sq"
    });

    expect(result.answer).toBe(
      "Rreshti i parë\n\nRreshti i dytë"
    );
  });

  test("kthen përgjigje rezervë kur nuk ka rezultate", () => {
    const result = createResponse({
      results: [],
      language: "en"
    });

    expect(result.success).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.answer).toContain("Not enough information");
  });

  test("kthen përgjigje rezervë për rezultate të pavlefshme", () => {
    const result = createResponse({
      results: [null, {}, { content: "   " }],
      language: "sq"
    });

    expect(result.success).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  test("llogarit besueshmërinë brenda intervalit 0–1", () => {
    const confidence = calculateResponseConfidence([
      { content: "Përgjigjja A", source: "kb-1" },
      { content: "Përgjigjja B", source: "kb-2" }
    ]);

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
    expect(confidence).toBeGreaterThan(0);
  });

  test("besueshmëria është zero kur nuk ka rezultate", () => {
    expect(calculateResponseConfidence([])).toBe(0);
    expect(calculateResponseConfidence(null)).toBe(0);
  });

  test("krijon metadata me burimet dhe identifikuesit", () => {
    const metadata = createResponseMetadata({
      language: "fr",
      requestId: "test-123",
      conversationId: "conversation-1",
      results: [
        { content: "Bonjour", source: "kb-fr" },
        { content: "Salut", source: "kb-fr" }
      ]
    });

    expect(metadata.engine).toBe("xsus-response-engine");
    expect(metadata.version).toBe("1.3.0");
    expect(metadata.language).toBe("fr");
    expect(metadata.requestId).toBe("test-123");
    expect(metadata.conversationId).toBe("conversation-1");
    expect(metadata.sources).toEqual(["kb-fr"]);
    expect(metadata.resultCount).toBe(2);
  });

  test("përdor shqipen për gjuhë të pambështetura", () => {
    const result = createResponse({
      results: [{ content: "Përgjigje" }],
      language: "xx"
    });

    expect(result.language).toBe("sq");
  });

  test("normalizon kodet e gjuhëve", () => {
    const result = createResponse({
      results: [{ content: "Hello!" }],
      language: " EN "
    });

    expect(result.language).toBe("en");
  });

  test("kthen përgjigje rezervë në frëngjisht", () => {
    const result = getFallbackResponse("fr");

    expect(result.success).toBe(false);
    expect(result.language).toBe("fr");
    expect(result.confidence).toBe(0);
    expect(result.answer).toContain("Les informations trouvées");
  });

  test("përgjigjja dhe metadata kanë të njëjtën gjuhë e version", () => {
    const result = createResponse({
      results: [{ content: "Hello!" }],
      language: "en",
      requestId: "request-42",
      conversationId: "conversation-42"
    });

    expect(result.metadata.language).toBe(result.language);
    expect(result.metadata.version).toBe(result.version);
    expect(result.metadata.requestId).toBe("request-42");
    expect(result.metadata.conversationId).toBe("conversation-42");
  });
});
