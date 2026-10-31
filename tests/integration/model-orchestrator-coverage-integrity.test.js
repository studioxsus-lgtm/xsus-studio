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

function createAdapter({
  id = "coverage-model",
  modelId = id,
  initialize = vi.fn(async () => ({ success: true })),
  generate = vi.fn(async () => ({ text: "OK" })),
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
  selectorOverride,
  registryOverride,
} = {}) {
  const registry = registryOverride ?? createModelRegistry();

  for (const adapter of adapters) {
    registry.register(adapter);
  }

  const selector =
    selectorOverride ??
    createModelSelector({ registry, defaultModelId });

  const orchestrator = createModelOrchestrator({
    registry,
    selector,
    defaultModelId,
  });

  return { registry, selector, orchestrator };
}

describe("XSUS AI Core — Model Orchestrator Coverage Integrity", () => {
  it("refuzon konfigurime të pavlefshme", () => {
    expect(() => createModelOrchestrator(null)).toThrow(
      MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
    );

    expect(() => createModelOrchestrator([])).toThrow(
      MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
    );

    expect(() =>
      createModelOrchestrator({
        registry: {},
        selector: { select: vi.fn() },
      }),
    ).toThrow(MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION);

    expect(() =>
      createModelOrchestrator({
        registry: {
          get: vi.fn(),
          list: vi.fn(),
        },
        selector: {},
      }),
    ).toThrow(MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION);

    const registry = createModelRegistry();

    expect(() =>
      createModelOrchestrator({
        registry,
        selector: { select: vi.fn() },
        defaultModelId: "   ",
      }),
    ).toThrow(MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION);
  });

  it("normalizon gabimet e selector-it gjatë gjenerimit", async () => {
    const selectorError = new Error("Selector failure");

    const { orchestrator } = createSystem({
      selectorOverride: {
        select: vi.fn(() => {
          throw selectorError;
        }),
      },
    });

    await expect(
      orchestrator.generate({ prompt: "Test" }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.MODEL_NOT_FOUND,
      message: "Selector failure",
      cause: selectorError,
    });

    await orchestrator.close();
  });

  it("normalizon gabimet e selector-it gjatë inicializimit", async () => {
    const selectorError = new Error("Initialization selection failure");

    const { orchestrator } = createSystem({
      selectorOverride: {
        select: vi.fn(() => {
          throw selectorError;
        }),
      },
    });

    await expect(
      orchestrator.initialize(),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.MODEL_NOT_FOUND,
      message: "Initialization selection failure",
      cause: selectorError,
    });

    await orchestrator.close();
  });

  it("përdor mesazh rezervë kur selector-i hedh gabim pa mesazh", async () => {
    const { orchestrator } = createSystem({
      selectorOverride: {
        select: vi.fn(() => {
          throw {};
        }),
      },
    });

    await expect(
      orchestrator.generate({ prompt: "Test" }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.MODEL_NOT_FOUND,
      message: "Nuk u gjet model i përshtatshëm.",
    });

    await orchestrator.close();
  });

  it("refuzon input të pavlefshëm për gjenerim", async () => {
    const adapter = createAdapter();
    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await expect(orchestrator.generate(null)).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
    });

    await expect(orchestrator.generate([])).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
    });

    await expect(orchestrator.generate("invalid")).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.INVALID_CONFIGURATION,
    });

    expect(orchestrator.getStatus().activeRuntimes).toBe(0);

    await orchestrator.close();
  });

  it("kthen null për runtime që nuk ekziston", () => {
    const { orchestrator } = createSystem();

    expect(
      orchestrator.getRuntimeStatus("missing-model"),
    ).toBeNull();

    expect(() =>
      orchestrator.getRuntimeStatus("   "),
    ).toThrow(TypeError);

    expect(() =>
      orchestrator.getRuntimeStatus(null),
    ).toThrow(TypeError);
  });

  it("kthen statusin e runtime-it sipas ID-së së adapter-it", async () => {
    const adapter = createAdapter({
      id: "adapter-coverage-id",
      modelId: "model-coverage-id",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await orchestrator.generate({
      modelId: "model-coverage-id",
      prompt: "Status test",
    });

    const status = orchestrator.getRuntimeStatus(
      "adapter-coverage-id",
    );

    expect(status).not.toBeNull();
    expect(status.initialized).toBe(true);

    const statuses = orchestrator.listRuntimeStatuses();

    expect(statuses).toHaveLength(1);
    expect(statuses[0].adapterId).toBe("adapter-coverage-id");

    await orchestrator.close();
  });

  it("pastron premtimin e inicializimit pas dështimit", async () => {
    const initialize = vi
      .fn()
      .mockRejectedValueOnce(new Error("First initialization failed"))
      .mockResolvedValueOnce({ success: true });

    const adapter = createAdapter({
      id: "retry-initialization-model",
      initialize,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await expect(
      orchestrator.initialize("retry-initialization-model"),
    ).rejects.toBeDefined();

    const result = await orchestrator.initialize(
      "retry-initialization-model",
    );

    expect(result.initialized).toBe(true);
    expect(result.state).toBe("ready");
    expect(initialize).toHaveBeenCalledTimes(2);

    await orchestrator.close();
  });

  it("normalizon gabimin e gjenerimit dhe ruan shkakun", async () => {
    const generationError = new Error("Generation failure");

    const adapter = createAdapter({
      generate: vi.fn(async () => {
        throw generationError;
      }),
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await expect(
      orchestrator.generate({
        modelId: "coverage-model",
        prompt: "Failure",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
      message: "Generation failure",
      cause: generationError,
    });

    expect(
      orchestrator.getRuntimeStatus("coverage-model").activeGenerations,
    ).toBe(0);

    await orchestrator.close();
  });

  it("përdor mesazh rezervë për gabime gjenerimi pa mesazh", async () => {
    const adapter = createAdapter({
      generate: vi.fn(async () => {
        throw {};
      }),
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await expect(
      orchestrator.generate({
        modelId: "coverage-model",
        prompt: "Failure",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
      message: "Gjenerimi i përgjigjes dështoi.",
    });

    await orchestrator.close();
  });

  it("kthen dështimet e runtime-ve gjatë mbylljes", async () => {
    const successfulAdapter = createAdapter({
      id: "successful-close-model",
    });

    const failingCloseError = new Error("Close failure");

    const failingAdapter = createAdapter({
      id: "failing-close-model",
      close: vi.fn(async () => {
        throw failingCloseError;
      }),
    });

    const { orchestrator } = createSystem({
      adapters: [successfulAdapter, failingAdapter],
    });

    await Promise.all([
      orchestrator.generate({
        modelId: "successful-close-model",
        prompt: "Prepare",
      }),
      orchestrator.generate({
        modelId: "failing-close-model",
        prompt: "Prepare",
      }),
    ]);

    const result = await orchestrator.close();

    expect(result.success).toBe(false);
    expect(result.closed).toBe(true);
    expect(result.runtimesClosed).toBe(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].message).toBe("Close failure");

    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
    expect(orchestrator.listRuntimeStatuses()).toEqual([]);
  });

  it("kthen rezultat të qëndrueshëm për mbyllje të përsëritur", async () => {
    const adapter = createAdapter();

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const firstResult = await orchestrator.close();
    const secondResult = await orchestrator.close();

    expect(firstResult.success).toBe(true);
    expect(firstResult.closed).toBe(true);

    expect(secondResult).toEqual({
      success: true,
      closed: true,
      runtimesClosed: 0,
    });
  });

  it("refuzon operacionet pas mbylljes", async () => {
    const adapter = createAdapter();

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await orchestrator.close();

    await expect(
      orchestrator.initialize("coverage-model"),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.CLOSED,
    });

    await expect(
      orchestrator.generate({
        modelId: "coverage-model",
        prompt: "After close",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.CLOSED,
    });
  });

  it("ruan konfigurimin dhe statusin fillestar", () => {
    const adapter = createAdapter({
      id: "default-model",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
      defaultModelId: "default-model",
    });

    expect(orchestrator.getStatus()).toEqual({
      version: "1.0.0",
      closed: false,
      registeredModels: 1,
      activeRuntimes: 0,
      defaultModelId: "default-model",
    });
  });
});
