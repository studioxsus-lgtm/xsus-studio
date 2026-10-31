import { describe, it, expect, vi } from "vitest";

import {
  createModelOrchestrator,
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
  id,
  initialize = vi.fn(async () => ({ success: true })),
  generate = vi.fn(async (request) => ({
    text: `Response: ${request.prompt}`,
  })),
  close = vi.fn(async () => ({ success: true })),
} = {}) {
  return {
    adapter: createModelAdapter({
      id,
      modelId: id,
      type: "custom",
      initialize,
      generate,
      close,
    }),
    initialize,
    generate,
    close,
  };
}

function createSystem(adapters = []) {
  const registry = createModelRegistry();

  for (const adapter of adapters) {
    registry.register(adapter);
  }

  const selector = createModelSelector({ registry });

  const orchestrator = createModelOrchestrator({
    registry,
    selector,
  });

  return { registry, selector, orchestrator };
}

describe("XSUS AI Core — Model Orchestrator Resource Management & Runtime Isolation", () => {
  it("pastron gjendjen aktive pas 100 gjenerimeve të njëpasnjëshme", async () => {
    const model = createAdapter({
      id: "resource-cleanup-model",
    });

    const { orchestrator } = createSystem([model.adapter]);

    for (let index = 1; index <= 100; index += 1) {
      const result = await orchestrator.generate({
        modelId: "resource-cleanup-model",
        prompt: `Resource request ${index}`,
      });

      expect(result.success).toBe(true);
      expect(result.text).toBe(
        `Response: Resource request ${index}`,
      );

      const status = orchestrator.getRuntimeStatus(
        "resource-cleanup-model",
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
    }

    expect(model.initialize).toHaveBeenCalledTimes(1);
    expect(model.generate).toHaveBeenCalledTimes(100);

    const result = await orchestrator.close();

    expect(result.success).toBe(true);
    expect(result.closed).toBe(true);
    expect(model.close).toHaveBeenCalledTimes(1);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("izolon gjendjen dhe burimet e dy Runtime-ve të pavarura", async () => {
    const modelA = createAdapter({
      id: "isolated-runtime-a",
      generate: vi.fn(async (request) => ({
        text: `A: ${request.prompt}`,
      })),
    });

    const modelB = createAdapter({
      id: "isolated-runtime-b",
      generate: vi.fn(async (request) => ({
        text: `B: ${request.prompt}`,
      })),
    });

    const { orchestrator } = createSystem([
      modelA.adapter,
      modelB.adapter,
    ]);

    const [resultA, resultB] = await Promise.all([
      orchestrator.generate({
        modelId: "isolated-runtime-a",
        prompt: "Request A",
      }),
      orchestrator.generate({
        modelId: "isolated-runtime-b",
        prompt: "Request B",
      }),
    ]);

    expect(resultA.text).toBe("A: Request A");
    expect(resultB.text).toBe("B: Request B");

    expect(
      orchestrator.getRuntimeStatus("isolated-runtime-a").state,
    ).toBe("ready");

    expect(
      orchestrator.getRuntimeStatus("isolated-runtime-b").state,
    ).toBe("ready");

    expect(modelA.generate).toHaveBeenCalledTimes(1);
    expect(modelB.generate).toHaveBeenCalledTimes(1);

    await orchestrator.close();

    expect(modelA.close).toHaveBeenCalledTimes(1);
    expect(modelB.close).toHaveBeenCalledTimes(1);
  });

  it("ruan izolimin kur një Runtime dështon gjatë gjenerimit", async () => {
    const modelA = createAdapter({
      id: "failure-isolation-a",
      generate: vi.fn(async () => {
        throw new Error("Isolated model failure");
      }),
    });

    const modelB = createAdapter({
      id: "failure-isolation-b",
    });

    const { orchestrator } = createSystem([
      modelA.adapter,
      modelB.adapter,
    ]);

    await expect(
      orchestrator.generate({
        modelId: "failure-isolation-a",
        prompt: "Failing request",
      }),
    ).rejects.toBeDefined();

    const resultB = await orchestrator.generate({
      modelId: "failure-isolation-b",
      prompt: "Independent request",
    });

    expect(resultB.success).toBe(true);
    expect(resultB.text).toBe(
      "Response: Independent request",
    );

    const statusA = orchestrator.getRuntimeStatus(
      "failure-isolation-a",
    );

    const statusB = orchestrator.getRuntimeStatus(
      "failure-isolation-b",
    );

    expect(statusA.state).toBe("ready");
    expect(statusA.activeGenerations).toBe(0);
    expect(statusA.lastError).not.toBeNull();

    expect(statusB.state).toBe("ready");
    expect(statusB.activeGenerations).toBe(0);
    expect(statusB.lastError).toBeNull();

    await orchestrator.close();
  });

  it("respekton regjistrimin dhe çregjistrimin dinamik të modeleve", async () => {
    const registry = createModelRegistry();
    const selector = createModelSelector({ registry });

    const orchestrator = createModelOrchestrator({
      registry,
      selector,
    });

    const firstModel = createAdapter({
      id: "dynamic-model-one",
    });

    registry.register(firstModel.adapter);

    const firstResult = await orchestrator.generate({
      modelId: "dynamic-model-one",
      prompt: "First registered model",
    });

    expect(firstResult.success).toBe(true);
    expect(registry.has("dynamic-model-one")).toBe(true);

    const removed = registry.unregister("dynamic-model-one");

    expect(removed).toBe(true);
    expect(registry.has("dynamic-model-one")).toBe(false);

    const secondModel = createAdapter({
      id: "dynamic-model-two",
    });

    registry.register(secondModel.adapter);

    const secondResult = await orchestrator.generate({
      modelId: "dynamic-model-two",
      prompt: "Second registered model",
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.text).toBe(
      "Response: Second registered model",
    );

    expect(registry.has("dynamic-model-two")).toBe(true);

    await expect(
      orchestrator.generate({
        modelId: "dynamic-model-one",
        prompt: "Removed model request",
      }),
    ).rejects.toBeDefined();

    expect(firstModel.generate).toHaveBeenCalledTimes(1);
    expect(secondModel.generate).toHaveBeenCalledTimes(1);

    await orchestrator.close();

    expect(firstModel.close).toHaveBeenCalledTimes(1);
    expect(secondModel.close).toHaveBeenCalledTimes(1);
  });

  it("ruan konsistencën e statusit gjatë gjenerimeve paralele dhe mbylljes", async () => {
    let releaseGeneration;

    const generationGate = new Promise((resolve) => {
      releaseGeneration = resolve;
    });

    const generate = vi.fn(async (request) => {
      await generationGate;

      return {
        text: `Completed: ${request.prompt}`,
      };
    });

    const model = createAdapter({
      id: "status-consistency-model",
      generate,
    });

    const { orchestrator } = createSystem([model.adapter]);

    const requests = Array.from({ length: 25 }, (_, index) =>
      orchestrator.generate({
        modelId: "status-consistency-model",
        prompt: `Parallel request ${index + 1}`,
      }),
    );

    await vi.waitFor(() => {
      const status = orchestrator.getRuntimeStatus(
        "status-consistency-model",
      );

      expect(status.activeGenerations).toBe(25);
      expect(status.state).toBe("ready");
    });

    const closePromise = orchestrator.close();

    expect(orchestrator.getStatus().closed).toBe(true);

    releaseGeneration();

    const results = await Promise.all(requests);
    const closeResult = await closePromise;

    expect(results).toHaveLength(25);
    expect(results.every((result) => result.success)).toBe(true);

    expect(closeResult.success).toBe(true);
    expect(closeResult.closed).toBe(true);
    expect(closeResult.runtimesClosed).toBe(1);

    expect(model.generate).toHaveBeenCalledTimes(25);
    expect(model.close).toHaveBeenCalledTimes(1);

    const finalStatus = orchestrator.getStatus();

    expect(finalStatus.closed).toBe(true);
    expect(finalStatus.activeRuntimes).toBe(0);
  });
});
