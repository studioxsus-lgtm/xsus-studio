import {
  describe,
  it,
  expect,
  vi,
  afterEach,
} from "vitest";

import {
  configureAICoreModelOrchestrator,
  processAIRequest,
} from "../../src/core/ai-core.js";

afterEach(() => {
  configureAICoreModelOrchestrator(null);
});

describe("XSUS AI Core — Model Orchestrator Request Bridge", () => {
  it("përcjell prompt-in te Model Orchestrator", async () => {
    const generate = vi.fn().mockResolvedValue({
      success: true,
      text: "Përgjigje nga modeli.",
      modelId: "test-model",
      language: "sq",
    });

    configureAICoreModelOrchestrator({ generate });

    await processAIRequest({
      query: "Përshëndetje",
      language: "sq",
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Përshëndetje"),
        language: "sq",
      }),
    );
  });

  it("përcjell context dhe metadata", async () => {
    const context = {
      conversationId: "conversation-1",
    };

    const metadata = {
      source: "request-bridge-test",
    };

    const generate = vi.fn().mockResolvedValue({
      success: true,
      text: "Përgjigje.",
      modelId: "test-model",
      language: "sq",
    });

    configureAICoreModelOrchestrator({ generate });

    await processAIRequest({
      query: "Test",
      language: "sq",
      context,
      metadata,
    });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining(context),
        metadata: expect.objectContaining(metadata),
      }),
    );
  });

  it("përcjell parametrat e modelit", async () => {
    const parameters = {
      temperature: 0.3,
      maxOutputTokens: 512,
    };

    const generate = vi.fn().mockResolvedValue({
      success: true,
      text: "Përgjigje.",
      modelId: "test-model",
      language: "sq",
    });

    configureAICoreModelOrchestrator({ generate });

    await processAIRequest({
      query: "Test",
      language: "sq",
      parameters,
    });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.objectContaining(parameters),
      }),
    );
  });

  it("përdor modelId kur përcaktohet", async () => {
    const generate = vi.fn().mockResolvedValue({
      success: true,
      text: "Përgjigje.",
      modelId: "preferred-model",
      language: "sq",
    });

    configureAICoreModelOrchestrator({ generate });

    await processAIRequest({
      query: "Test",
      language: "sq",
      modelId: "preferred-model",
    });

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "preferred-model",
      }),
    );
  });

  it("kthen përgjigjen e modelit në rezultatin e AI Core", async () => {
    const generate = vi.fn().mockResolvedValue({
      success: true,
      text: "Përgjigje nga modeli.",
      modelId: "test-model",
      language: "sq",
    });

    configureAICoreModelOrchestrator({ generate });

    const result = await processAIRequest({
      query: "Test",
      language: "sq",
    });

    expect(result.answer).toBe("Përgjigje nga modeli.");
    expect(result.source).toBe("xsus-model-runtime");
    expect(result.metadata.modelConnected).toBe(true);
    expect(result.metadata.model.modelId).toBe("test-model");
    expect(result.metadata.responseEngine.success).toBe(true);
  });
});
