import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from "vitest";

import {
  processAIRequest,
  configureAICoreModelOrchestrator
} from "../../src/core/ai-core.js";

describe("XSUS AI Core — Model Runtime Integration", () => {
  beforeEach(() => {
    configureAICoreModelOrchestrator(null);
  });

  afterEach(() => {
    configureAICoreModelOrchestrator(null);
  });

  function createModelOrchestrator(overrides = {}) {
    return {
      generate: vi.fn(async request => ({
        success: true,
        text: "Përgjigje e gjeneruar nga XSUS Model Runtime.",
        modelId: request.modelId || "xsus-test-model",
        language: request.language,
        finishReason: "stop",
        usage: {
          inputTokens: 20,
          outputTokens: 12,
          totalTokens: 32
        },
        metadata: {
          provider: "xsus-test",
          runtimeVersion: "1.0.0"
        },
        ...overrides
      }))
    };
  }

  test("përdor Model Orchestrator kur është konfiguruar", async () => {
    const orchestrator = createModelOrchestrator();

    configureAICoreModelOrchestrator(orchestrator);

    const result = await processAIRequest({
      query: "Çfarë është inteligjenca artificiale?",
      language: "sq"
    });

    expect(orchestrator.generate).toHaveBeenCalledTimes(1);

    expect(result.answer).toBe(
      "Përgjigje e gjeneruar nga XSUS Model Runtime."
    );

    expect(result.source).toBe("xsus-model-runtime");
    expect(result.version).toBe("1.2.0");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.metadata.modelConnected).toBe(true);
  });

  test("dërgon një kërkesë sipas kontratës së Model Runtime", async () => {
    const orchestrator = createModelOrchestrator();

    configureAICoreModelOrchestrator(orchestrator);

    await processAIRequest({
      query: "What is artificial intelligence?",
      language: "en",
      modelId: "xsus-test-model"
    });

    const modelRequest =
      orchestrator.generate.mock.calls[0][0];

    expect(modelRequest).toEqual(
      expect.objectContaining({
        prompt: expect.any(String),
        systemPrompt: expect.any(String),
        language: "en",
        modelId: "xsus-test-model",
        requestId: expect.any(String),
        parameters: expect.any(Object),
        context: expect.any(Object),
        metadata: expect.objectContaining({
          engine: "xsus-ai-core",
          coreVersion: "1.2.0"
        })
      })
    );

    expect(modelRequest.prompt).toContain(
      "What is artificial intelligence?"
    );
  });

  test("përdor Response Engine kur Model Orchestrator nuk është konfiguruar", async () => {
    configureAICoreModelOrchestrator(null);

    const result = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    expect(result.answer).toBeTruthy();
    expect(result.source).toBe("xsus-knowledge-service");
    expect(result.metadata.modelConnected).toBe(false);
    expect(result.metadata.model).toBeNull();
    expect(result.version).toBe("1.2.0");
  });

  test("ruan metadata të modelit në përgjigjen përfundimtare", async () => {
    const orchestrator = createModelOrchestrator();

    configureAICoreModelOrchestrator(orchestrator);

    const result = await processAIRequest({
      query: "Explain machine learning.",
      language: "en"
    });

    expect(result.metadata.model).toEqual(
      expect.objectContaining({
        modelId: "xsus-test-model",
        finishReason: "stop",
        usage: {
          inputTokens: 20,
          outputTokens: 12,
          totalTokens: 32
        },
        metadata: {
          provider: "xsus-test",
          runtimeVersion: "1.0.0"
        }
      })
    );
  });

  test("ruan versionin e Core edhe kur modeli ka metadata të veta", async () => {
    const orchestrator = createModelOrchestrator({
      metadata: {
        engine: "external-engine",
        version: "99.0.0",
        provider: "xsus-test"
      }
    });

    configureAICoreModelOrchestrator(orchestrator);

    const result = await processAIRequest({
      query: "What is programming?",
      language: "en"
    });

    expect(result.metadata.engine).toBe("xsus-ai-core");
    expect(result.metadata.version).toBe("1.2.0");
    expect(result.metadata.model.metadata.engine).toBe(
      "external-engine"
    );
  });

  test("kthen gabim të sigurt kur Model Orchestrator dështon", async () => {
    const orchestrator = {
      generate: vi.fn(async () => {
        throw new Error("Internal provider failure");
      })
    };

    configureAICoreModelOrchestrator(orchestrator);

    const result = await processAIRequest({
      query: "Explain neural networks.",
      language: "en"
    });

    expect(orchestrator.generate).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty("error");
    expect(result.answer).toBe("");
    expect(result.error).toContain("gabim");
    expect(result.error).not.toContain(
      "Internal provider failure"
    );
  });

  test("refuzon përgjigjen e modelit pa tekst", async () => {
    const orchestrator = createModelOrchestrator({
      text: "   "
    });

    configureAICoreModelOrchestrator(orchestrator);

    const result = await processAIRequest({
      query: "Explain artificial intelligence.",
      language: "en"
    });

    expect(result).toHaveProperty("error");
    expect(result.answer).toBe("");
  });

  test("refuzon përgjigjen e modelit pa modelId", async () => {
    const orchestrator = {
      generate: vi.fn(async () => ({
        success: true,
        text: "Përgjigje testuese.",
        modelId: "",
        language: "sq"
      }))
    };

    configureAICoreModelOrchestrator(orchestrator);

    const result = await processAIRequest({
      query: "Çfarë është programimi?",
      language: "sq"
    });

    expect(result).toHaveProperty("error");
    expect(result.answer).toBe("");
  });

  test("refuzon përgjigjen kur success është false", async () => {
    const orchestrator = {
      generate: vi.fn(async () => ({
        success: false,
        text: "Përgjigje e pavlefshme.",
        modelId: "xsus-test-model"
      }))
    };

    configureAICoreModelOrchestrator(orchestrator);

    const result = await processAIRequest({
      query: "What is software?",
      language: "en"
    });

    expect(result).toHaveProperty("error");
    expect(result.answer).toBe("");
  });

  test("izolon konfigurimin e Model Orchestrator pas çaktivizimit", async () => {
    const orchestrator = createModelOrchestrator();

    configureAICoreModelOrchestrator(orchestrator);

    const modelResult = await processAIRequest({
      query: "What is AI?",
      language: "en"
    });

    expect(modelResult.source).toBe("xsus-model-runtime");

    configureAICoreModelOrchestrator(null);

    const knowledgeResult = await processAIRequest({
      query: "What is JavaScript?",
      language: "en"
    });

    expect(knowledgeResult.source).toBe(
      "xsus-knowledge-service"
    );

    expect(knowledgeResult.metadata.modelConnected).toBe(false);
    expect(knowledgeResult.metadata.model).toBeNull();

    expect(orchestrator.generate).toHaveBeenCalledTimes(1);
  });

  test("refuzon konfigurimin e një Model Orchestrator të pavlefshëm", () => {
    expect(() => {
      configureAICoreModelOrchestrator({});
    }).toThrow(TypeError);

    expect(() => {
      configureAICoreModelOrchestrator({
        generate: "not-a-function"
      });
    }).toThrow(TypeError);
  });

  test("lejon rikthimin e konfigurimit pas një gabimi", async () => {
    const failingOrchestrator = {
      generate: vi.fn(async () => {
        throw new Error("Temporary failure");
      })
    };

    configureAICoreModelOrchestrator(failingOrchestrator);

    const failedResult = await processAIRequest({
      query: "What is AI?",
      language: "en"
    });

    expect(failedResult).toHaveProperty("error");

    const workingOrchestrator = createModelOrchestrator();

    configureAICoreModelOrchestrator(workingOrchestrator);

    const successfulResult = await processAIRequest({
      query: "What is machine learning?",
      language: "en"
    });

    expect(successfulResult.answer).toBeTruthy();
    expect(successfulResult.source).toBe("xsus-model-runtime");
    expect(workingOrchestrator.generate).toHaveBeenCalledTimes(1);
  });
});
