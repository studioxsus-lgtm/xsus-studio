import { afterEach, describe, expect, test } from "vitest";

import {
  processAIRequest,
  configureAICoreMemoryPersistence,
  configureAICoreModelOrchestrator,
} from "../../src/core/ai-core.js";

import {
  createMemoryRetrievalEngine,
} from "../../src/core/memory-retrieval-engine.js";

import {
  createMemorySession,
  addMemoryMessage,
  deleteMemorySession,
} from "../../src/core/memory-engine.js";

afterEach(() => {
  configureAICoreMemoryPersistence(null);
  configureAICoreModelOrchestrator(null);
});

describe("XSUS AI Core", () => {
  test("kthen gabim kur pyetja është bosh", async () => {
    const result = await processAIRequest({
      query: "   "
    });

    expect(result).toHaveProperty("error");
    expect(result.error).toContain("pyetje");
    expect(result.answer).toBe("");
  });

  test("përpunon një pyetje në shqip", async () => {
    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("sq");
    expect(result.source).toBe("xsus-knowledge-service");
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.version).toBe("1.2.0");
  });

  test("përpunon një pyetje në anglisht", async () => {
    const result = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("en");
    expect(result.metadata).toHaveProperty("knowledgeResults");
    expect(result.metadata.knowledgeResults).toBeGreaterThanOrEqual(0);
  });

  test("përpunon një pyetje në frëngjisht", async () => {
    const result = await processAIRequest({
      query: "Qu'est-ce que JavaScript?",
      language: "fr"
    });

    expect(result.answer).toBeTruthy();
    expect(result.language).toBe("fr");
    expect(result.source).toBe("xsus-knowledge-service");
    expect(result.metadata.engine).toBe("xsus-ai-core");
  });

  test("përgjigjja ka strukturën e pritshme", async () => {
    const result = await processAIRequest({
      query: "JavaScript",
      language: "en"
    });

    expect(result).toEqual(
      expect.objectContaining({
        requestId: expect.any(String),
        answer: expect.any(String),
        language: "en",
        source: "xsus-knowledge-service",
        metadata: expect.any(Object),
        timestamp: expect.any(String),
        version: "1.2.0"
      })
    );

    expect(result).toHaveProperty("confidence");
    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  test("përgjigjja përmban metadata për njohuritë", async () => {
    const result = await processAIRequest({
      query: "What is programming?",
      language: "en"
    });

    expect(result.metadata).toHaveProperty("knowledgeResults");
    expect(result.metadata.knowledgeResults).toBeGreaterThanOrEqual(0);
    expect(result.metadata).toHaveProperty("sources");
    expect(Array.isArray(result.metadata.sources)).toBe(true);
  });

  test("përgjigjja përfshin metadata të kontekstit", async () => {
    const result = await processAIRequest({
      query: "Çfarë është JavaScript?",
      language: "sq",
      conversationId: "test-context-integration",
      messages: [
        {
          role: "user",
          content: "Dua të mësoj programim."
        },
        {
          role: "assistant",
          content: "Mund të fillosh me JavaScript."
        }
      ]
    });

    expect(result.answer).toBeTruthy();
    expect(result.metadata.context).toBeDefined();
    expect(result.metadata.context.conversationId).toBe(
      "test-context-integration"
    );
    expect(result.metadata.context.historyMessageCount).toBe(2);
    expect(result.metadata.context.hasPreviousContext).toBe(true);
  });

  test("ruan historikun e bisedës për kërkesën pasuese", async () => {
    const conversationId = "test-memory-persistence-integration";

    const firstResult = await processAIRequest({
      query: "Dua të mësoj programim.",
      language: "sq",
      conversationId
    });

    expect(firstResult.answer).toBeTruthy();

    const secondResult = await processAIRequest({
      query: "Cilin hap duhet të ndjek më pas?",
      language: "sq",
      conversationId
    });

    expect(secondResult.answer).toBeTruthy();
    expect(secondResult.metadata.context).toBeDefined();
    expect(secondResult.metadata.context.conversationId).toBe(
      conversationId
    );
    expect(secondResult.metadata.context.hasPreviousContext).toBe(true);
    expect(
      secondResult.metadata.context.historyMessageCount
    ).toBeGreaterThanOrEqual(2);
  });

  test("kthen metadata të vlefshme për një pyetje pa rezultate të njohurive", async () => {
    const result = await processAIRequest({
      query: "A ekziston një koncept me emrin XSUS-TEST-UNKNOWN-92841?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();
    expect(result.metadata).toHaveProperty("knowledgeResults");
    expect(result.metadata.knowledgeResults).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.metadata.sources)).toBe(true);
  });

  test("përgjigjja përmban metadata të cilësisë", async () => {
    const result = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();

    expect(result.metadata.responseQuality).toEqual(
      expect.objectContaining({
        version: "1.0.0",
        score: expect.any(Number),
        dimensions: expect.any(Object),
        sourceCount: expect.any(Number),
        valid: expect.any(Boolean),
        errors: expect.any(Array)
      })
    );
  });

  test("metadata e cilësisë përmban vetëm fushat publike të lejuara", async () => {
    const result = await processAIRequest({
      query: "What is artificial intelligence?",
      language: "en"
    });

    const quality = result.metadata.responseQuality;

    expect(quality).toBeDefined();
    expect(quality).not.toBeNull();

    expect(Object.keys(quality)).toEqual([
      "version",
      "valid",
      "score",
      "dimensions",
      "sourceCount",
      "errors"
    ]);

    expect(quality).not.toHaveProperty("languageVerification");
    expect(quality).not.toHaveProperty("internalDebugData");
  });

  test("metadata e cilësisë përmban katër dimensionet", async () => {
    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    const dimensions =
      result.metadata.responseQuality?.dimensions;

    expect(dimensions).toBeDefined();

    expect(Object.keys(dimensions)).toEqual([
      "completeness",
      "clarity",
      "language",
      "sources"
    ]);
  });

  test("rezultati i cilësisë ka pikë brenda intervalit të vlefshëm", async () => {
    const result = await processAIRequest({
      query: "Shpjego programimin.",
      language: "sq"
    });

    const quality = result.metadata.responseQuality;

    expect(quality).toBeDefined();
    expect(Number.isFinite(quality.score)).toBe(true);
    expect(quality.score).toBeGreaterThanOrEqual(0);
    expect(quality.score).toBeLessThanOrEqual(100);
  });

  test("metadata e cilësisë ruan numrin e burimeve", async () => {
    const result = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    const quality = result.metadata.responseQuality;

    expect(quality).toBeDefined();
    expect(quality.sourceCount).toBeGreaterThanOrEqual(0);
    expect(quality.sourceCount).toBeLessThanOrEqual(
      result.metadata.sources.length
    );
  });

  test("metadata bazë ruan versionin e XSUS AI Core", async () => {
    const result = await processAIRequest({
      query: "Çfarë është XSUS AI?",
      language: "sq"
    });

    expect(result.version).toBe("1.2.0");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.metadata.engine).toBe("xsus-ai-core");
  });

  // --------------------------------------------------
  // PHASE 12.4.1 — INTELLIGENT MEMORY RETRIEVAL
  // --------------------------------------------------

  test("metadata raporton gjendjen e Memory Retrieval", async () => {
    const conversationId =
      "test-retrieval-metadata-12-4-1";

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq",
      conversationId
    });

    expect(result.answer).toBeTruthy();

    expect(result.metadata.memoryRetrieval).toEqual(
      expect.objectContaining({
        enabled: true,
        retrievedCount: expect.any(Number)
      })
    );

    expect(result.metadata.memoryRetrieval.retrievedCount)
      .toBeGreaterThanOrEqual(0);
  });

  test("Memory Retrieval nuk aktivizohet pa conversationId", async () => {
    const result = await processAIRequest({
      query: "What is programming?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();

    expect(result.metadata.memoryRetrieval).toEqual({
      enabled: false,
      retrievedCount: 0
    });
  });

  test("kërkimi i memories kufizohet në sesionin aktual", async () => {
    const firstSession =
      "test-retrieval-isolation-a";

    const secondSession =
      "test-retrieval-isolation-b";

    createMemorySession({
      sessionId: firstSession,
      language: "en"
    });

    createMemorySession({
      sessionId: secondSession,
      language: "en"
    });

    addMemoryMessage({
      sessionId: firstSession,
      role: "user",
      content: "XSUS retrieval isolation unique quantum architecture"
    });

    addMemoryMessage({
      sessionId: secondSession,
      role: "user",
      content: "XSUS retrieval isolation unique quantum architecture"
    });

    const engine = createMemoryRetrievalEngine();

    const results = engine.searchMemories(
      "quantum architecture",
      {
        sessionId: firstSession,
        limit: 10
      }
    );

    expect(results.length).toBeGreaterThan(0);

    expect(
      results.every(result => result.sessionId === firstSession)
    ).toBe(true);

    deleteMemorySession(firstSession);
    deleteMemorySession(secondSession);
  });

  test("kërkimi i memories nuk e ndryshon numrin e mesazheve", async () => {
    const conversationId =
      "test-retrieval-message-integrity";

    createMemorySession({
      sessionId: conversationId,
      language: "en"
    });

    addMemoryMessage({
      sessionId: conversationId,
      role: "user",
      content: "XSUS memory integrity unique architecture"
    });

    const engine = createMemoryRetrievalEngine();

    const before = engine.searchMemories(
      "memory integrity architecture",
      {
        sessionId: conversationId,
        limit: 10
      }
    );

    const after = engine.searchMemories(
      "memory integrity architecture",
      {
        sessionId: conversationId,
        limit: 10
      }
    );

    expect(after).toHaveLength(before.length);

    expect(
      after.map(item => item.content)
    ).toEqual(
      before.map(item => item.content)
    );

    deleteMemorySession(conversationId);
  });

  test("Memory Retrieval nuk ndryshon versionin publik të Core", async () => {
    const result = await processAIRequest({
      query: "What is artificial intelligence?",
      language: "en",
      conversationId: "test-retrieval-version"
    });

    expect(result.version).toBe("1.2.0");
    expect(result.metadata.version).toBe("1.2.0");
  });
});
