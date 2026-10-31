import { describe, it, expect, vi } from "vitest";

import {
  createModelOrchestrator,
  MODEL_ORCHESTRATOR_ERRORS,
} from "../../src/runtime/model-orchestrator.js";

import {
  createModelRegistry,
} from "../../src/runtime/model-registry.js";

import {
  createModelSelector,
} from "../../src/runtime/model-selector.js";

import {
  createModelAdapter,
} from "../../src/runtime/model-adapter.js";

function createTestAdapter({
  id,
  modelId = id,
  initialize = vi.fn(async () => ({ success: true })),
  generate = vi.fn(async (request) => ({
    text: `Response from ${modelId}`,
    request,
  })),
  close = vi.fn(async () => ({ success: true })),
} = {}) {
  return createModelAdapter({
    id,
    modelId,
    type: "custom",
    initialize,
    generate,
    close,
  });
}

function createSystem({
  adapters = [],
  defaultModelId = null,
} = {}) {
  const registry = createModelRegistry();

  for (const adapter of adapters) {
    registry.register(adapter);
  }

  const selector = createModelSelector({
    registry,
    defaultModelId,
  });

  const orchestrator = createModelOrchestrator({
    registry,
    selector,
    defaultModelId,
  });

  return {
    registry,
    selector,
    orchestrator,
  };
}

describe("XSUS AI Core — Model Orchestrator Integration Integrity", () => {
  it("përzgjedh modelin e kërkuar dhe gjeneron përgjigjen", async () => {
    const adapter = createTestAdapter({
      id: "model-a",
      modelId: "model-a",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const result = await orchestrator.generate({
      modelId: "model-a",
      prompt: "Hello XSUS",
      language: "en",
    });

    expect(result.text).toBe("Response from model-a");
    expect(result.request.prompt).toBe("Hello XSUS");
    expect(result.request.language).toBe("en");

    await orchestrator.close();
  });

  it("përdor modelin e parazgjedhur kur nuk specifikohet modelId", async () => {
    const adapter = createTestAdapter({
      id: "default-model",
      modelId: "default-model",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
      defaultModelId: "default-model",
    });

    const result = await orchestrator.generate({
      prompt: "Default model request",
    });

    expect(result.text).toBe("Response from default-model");
    expect(result.request.modelId).toBe("default-model");

    await orchestrator.close();
  });

  it("ripërdor të njëjtin Runtime për kërkesa të njëpasnjëshme", async () => {
    const adapter = createTestAdapter({
      id: "shared-model",
      modelId: "shared-model",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await orchestrator.generate({
      modelId: "shared-model",
      prompt: "First request",
    });

    await orchestrator.generate({
      modelId: "shared-model",
      prompt: "Second request",
    });

    const status = orchestrator.getRuntimeStatus("shared-model");

    expect(status).not.toBeNull();
    expect(status.initialized).toBe(true);

    expect(
      orchestrator.listRuntimeStatuses(),
    ).toHaveLength(1);

    await orchestrator.close();
  });

  it("ruan kontekstin dhe parametrat e kërkesës gjatë gjenerimit", async () => {
    const generate = vi.fn(async (request) => ({
      text: "Context preserved",
      conversationId: request.conversationId,
      context: request.context,
      metadata: request.metadata,
    }));

    const adapter = createTestAdapter({
      id: "context-model",
      modelId: "context-model",
      generate,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const request = {
      modelId: "context-model",
      prompt: "Continue the conversation",
      conversationId: "conversation-123",
      context: {
        previousTopic: "XSUS AI",
        memoryEnabled: true,
      },
      metadata: {
        source: "integration-test",
      },
    };

    const result = await orchestrator.generate(request);

    expect(result.conversationId).toBe("conversation-123");
    expect(result.context).toEqual(request.context);
    expect(result.metadata).toEqual(request.metadata);

    await orchestrator.close();
  });

  it("izolon dështimin e një modeli nga një model tjetër", async () => {
    const failingAdapter = createTestAdapter({
      id: "failing-model",
      modelId: "failing-model",
      generate: vi.fn(async () => {
        throw new Error("Generation failure");
      }),
    });

    const workingAdapter = createTestAdapter({
      id: "working-model",
      modelId: "working-model",
    });

    const { orchestrator } = createSystem({
      adapters: [failingAdapter, workingAdapter],
    });

    await expect(
      orchestrator.generate({
        modelId: "failing-model",
        prompt: "Fail",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
    });

    const result = await orchestrator.generate({
      modelId: "working-model",
      prompt: "Continue",
    });

    expect(result.text).toBe("Response from working-model");

    await orchestrator.close();
  });

  it("kthen MODEL_NOT_FOUND kur nuk ekziston model i përshtatshëm", async () => {
    const adapter = createTestAdapter({
      id: "available-model",
      modelId: "available-model",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await expect(
      orchestrator.generate({
        modelId: "missing-model",
        prompt: "Test",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.MODEL_NOT_FOUND,
    });

    await orchestrator.close();
  });

  it("inicializon modelin e kërkuar dhe ekspozon statusin e Runtime", async () => {
    const adapter = createTestAdapter({
      id: "initialize-model",
      modelId: "initialize-model",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const result = await orchestrator.initialize("initialize-model");

    expect(result.success).toBe(true);

    const status = orchestrator.getRuntimeStatus(
      "initialize-model",
    );

    expect(status).not.toBeNull();
    expect(status.initialized).toBe(true);

    await orchestrator.close();
  });

  it("mbyll të gjitha Runtime-të aktive", async () => {
    const firstAdapter = createTestAdapter({
      id: "first-model",
      modelId: "first-model",
    });

    const secondAdapter = createTestAdapter({
      id: "second-model",
      modelId: "second-model",
    });

    const { orchestrator } = createSystem({
      adapters: [firstAdapter, secondAdapter],
    });

    await orchestrator.generate({
      modelId: "first-model",
      prompt: "First",
    });

    await orchestrator.generate({
      modelId: "second-model",
      prompt: "Second",
    });

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.closed).toBe(true);
    expect(closeResult.runtimesClosed).toBe(2);

    expect(orchestrator.getStatus().closed).toBe(true);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("refuzon kërkesa të reja pas mbylljes", async () => {
    const adapter = createTestAdapter({
      id: "closed-model",
      modelId: "closed-model",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await orchestrator.close();

    await expect(
      orchestrator.generate({
        modelId: "closed-model",
        prompt: "After close",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.CLOSED,
    });

    await expect(
      orchestrator.initialize("closed-model"),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.CLOSED,
    });
  });

  it("ruan sigurinë e mbylljes kur close thirret disa herë", async () => {
    const adapter = createTestAdapter({
      id: "idempotent-model",
      modelId: "idempotent-model",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await orchestrator.generate({
      modelId: "idempotent-model",
      prompt: "Before close",
    });

    const results = await Promise.all([
      orchestrator.close(),
      orchestrator.close(),
      orchestrator.close(),
    ]);

    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.closed).toBe(true);
      expect(result.runtimesClosed).toBe(1);
    }
  });
});
