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

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createTestAdapter({
  id,
  modelId = id,
  initialize = vi.fn(async () => ({ success: true })),
  generate = vi.fn(async (request) => ({
    text: `Response: ${request.prompt}`,
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

describe("XSUS AI Core — Model Orchestrator Concurrency & Lifecycle Integrity", () => {
  it("kryen shumë gjenerime paralele për të njëjtin model", async () => {
    const adapter = createTestAdapter({
      id: "parallel-model",
      modelId: "parallel-model",
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const requests = Array.from({ length: 50 }, (_, index) =>
      orchestrator.generate({
        modelId: "parallel-model",
        prompt: `Parallel request ${index}`,
      }),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(50);

    for (let index = 0; index < results.length; index += 1) {
      expect(results[index].success).toBe(true);
      expect(results[index].text).toBe(
        `Response: Parallel request ${index}`,
      );
      expect(results[index].modelId).toBe("parallel-model");
    }

    const status = orchestrator.getRuntimeStatus("parallel-model");

    expect(status.initialized).toBe(true);
    expect(status.activeGenerations).toBe(0);

    await orchestrator.close();
  });

  it("kryen vetëm një inicializim për thirrje të njëkohshme initialize", async () => {
    const initialize = vi.fn(async () => {
      await Promise.resolve();
      return { success: true };
    });

    const adapter = createTestAdapter({
      id: "shared-initialization-model",
      modelId: "shared-initialization-model",
      initialize,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const results = await Promise.all([
      orchestrator.initialize("shared-initialization-model"),
      orchestrator.initialize("shared-initialization-model"),
      orchestrator.initialize("shared-initialization-model"),
      orchestrator.initialize("shared-initialization-model"),
    ]);

    expect(initialize).toHaveBeenCalledTimes(1);

    for (const result of results) {
      expect(result.initialized).toBe(true);
      expect(result.state).toBe("ready");
    }

    await orchestrator.close();
  });

  it("ndan inicializimin mes gjenerimeve paralele të të njëjtit model", async () => {
    const initialize = vi.fn(async () => {
      await Promise.resolve();
    });

    const adapter = createTestAdapter({
      id: "shared-generation-model",
      modelId: "shared-generation-model",
      initialize,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        orchestrator.generate({
          modelId: "shared-generation-model",
          prompt: `Request ${index}`,
        }),
      ),
    );

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(20);

    expect(
      results.every((result) => result.success === true),
    ).toBe(true);

    expect(
      orchestrator.getRuntimeStatus(
        "shared-generation-model",
      ).activeGenerations,
    ).toBe(0);

    await orchestrator.close();
  });

  it("izolon dështimet e gjenerimeve paralele", async () => {
    const generate = vi.fn(async (request) => {
      if (request.prompt === "failing-request") {
        throw new Error("Expected generation failure");
      }

      return {
        text: "Successful parallel response",
      };
    });

    const adapter = createTestAdapter({
      id: "failure-isolation-model",
      modelId: "failure-isolation-model",
      generate,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const results = await Promise.allSettled([
      orchestrator.generate({
        modelId: "failure-isolation-model",
        prompt: "failing-request",
      }),
      orchestrator.generate({
        modelId: "failure-isolation-model",
        prompt: "successful-request",
      }),
    ]);

    expect(results[0].status).toBe("rejected");
    expect(results[0].reason.code).toBe(
      MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
    );

    expect(results[1].status).toBe("fulfilled");
    expect(results[1].value.success).toBe(true);
    expect(results[1].value.text).toBe(
      "Successful parallel response",
    );

    const status = orchestrator.getRuntimeStatus(
      "failure-isolation-model",
    );

    expect(status.activeGenerations).toBe(0);

    await orchestrator.close();
  });

  it("pret përfundimin e gjenerimit aktiv para mbylljes së adapter-it", async () => {
    const generationStarted = createDeferred();
    const finishGeneration = createDeferred();

    const close = vi.fn(async () => ({
      success: true,
    }));

    const generate = vi.fn(async () => {
      generationStarted.resolve();

      await finishGeneration.promise;

      return {
        text: "Generation completed",
      };
    });

    const adapter = createTestAdapter({
      id: "close-during-generation-model",
      modelId: "close-during-generation-model",
      generate,
      close,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const generationPromise = orchestrator.generate({
      modelId: "close-during-generation-model",
      prompt: "Active generation",
    });

    await generationStarted.promise;

    const closePromise = orchestrator.close();

    expect(orchestrator.getStatus().closed).toBe(true);
    expect(close).not.toHaveBeenCalled();

    finishGeneration.resolve();

    await expect(generationPromise).rejects.toBeDefined();

    const closeResult = await closePromise;

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("pret përfundimin e inicializimit aktiv gjatë mbylljes", async () => {
    const initializationStarted = createDeferred();
    const finishInitialization = createDeferred();

    const close = vi.fn(async () => ({
      success: true,
    }));

    const initialize = vi.fn(async () => {
      initializationStarted.resolve();

      await finishInitialization.promise;

      return { success: true };
    });

    const adapter = createTestAdapter({
      id: "close-during-initialization-model",
      modelId: "close-during-initialization-model",
      initialize,
      close,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    const initializationPromise = orchestrator.initialize(
      "close-during-initialization-model",
    );

    await initializationStarted.promise;

    const closePromise = orchestrator.close();

    expect(orchestrator.getStatus().closed).toBe(true);
    expect(close).not.toHaveBeenCalled();

    finishInitialization.resolve();

    await expect(initializationPromise).rejects.toBeDefined();

    const closeResult = await closePromise;

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("përdor të njëjtin proces mbylljeje për thirrjet paralele", async () => {
    const closeStarted = createDeferred();
    const finishClose = createDeferred();

    const close = vi.fn(async () => {
      closeStarted.resolve();

      await finishClose.promise;

      return { success: true };
    });

    const adapter = createTestAdapter({
      id: "parallel-close-model",
      modelId: "parallel-close-model",
      close,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await orchestrator.generate({
      modelId: "parallel-close-model",
      prompt: "Before closing",
    });

    const firstClose = orchestrator.close();

    await closeStarted.promise;

    const secondClose = orchestrator.close();
    const thirdClose = orchestrator.close();

    expect(orchestrator.getStatus().closed).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);

    finishClose.resolve();

    const results = await Promise.all([
      firstClose,
      secondClose,
      thirdClose,
    ]);

    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.closed).toBe(true);
      expect(result.runtimesClosed).toBe(1);
    }

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("ruan konsistencën e statusit pas mbylljes", async () => {
    const firstAdapter = createTestAdapter({
      id: "lifecycle-model-a",
      modelId: "lifecycle-model-a",
    });

    const secondAdapter = createTestAdapter({
      id: "lifecycle-model-b",
      modelId: "lifecycle-model-b",
    });

    const { orchestrator } = createSystem({
      adapters: [firstAdapter, secondAdapter],
    });

    await Promise.all([
      orchestrator.generate({
        modelId: "lifecycle-model-a",
        prompt: "First",
      }),
      orchestrator.generate({
        modelId: "lifecycle-model-b",
        prompt: "Second",
      }),
    ]);

    expect(orchestrator.getStatus().activeRuntimes).toBe(2);

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(2);

    const finalStatus = orchestrator.getStatus();

    expect(finalStatus.closed).toBe(true);
    expect(finalStatus.activeRuntimes).toBe(0);
    expect(finalStatus.registeredModels).toBe(2);

    expect(orchestrator.listRuntimeStatuses()).toEqual([]);
  });
});
