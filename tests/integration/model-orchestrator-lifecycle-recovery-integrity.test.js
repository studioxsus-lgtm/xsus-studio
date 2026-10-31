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

describe("XSUS AI Core — Model Orchestrator Lifecycle & Failure Recovery Integrity", () => {
  it("ruan gjendjen konsistente kur inicializimi i modelit dështon", async () => {
    const model = createAdapter({
      id: "initialization-failure-model",
      initialize: vi.fn(async () => {
        throw new Error("Initialization failure");
      }),
    });

    const { orchestrator } = createSystem([model.adapter]);

    await expect(
      orchestrator.generate({
        modelId: "initialization-failure-model",
        prompt: "Initialization failure request",
      }),
    ).rejects.toBeDefined();

    expect(model.initialize).toHaveBeenCalledTimes(1);
    expect(model.generate).not.toHaveBeenCalled();

    const status = orchestrator.getRuntimeStatus(
      "initialization-failure-model",
    );

    expect(status).not.toBeNull();
    expect(status.initialized).toBe(false);
    expect(status.activeGenerations).toBe(0);
    expect(status.lastError).not.toBeNull();

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.closed).toBe(true);
    expect(model.close).toHaveBeenCalledTimes(1);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("izolon dështimin e inicializimit nga modelet e tjera", async () => {
    const failingModel = createAdapter({
      id: "recovery-failing-model",
      initialize: vi.fn(async () => {
        throw new Error("Model initialization failed");
      }),
    });

    const healthyModel = createAdapter({
      id: "recovery-healthy-model",
    });

    const { orchestrator } = createSystem([
      failingModel.adapter,
      healthyModel.adapter,
    ]);

    await expect(
      orchestrator.generate({
        modelId: "recovery-failing-model",
        prompt: "Failing initialization",
      }),
    ).rejects.toBeDefined();

    const result = await orchestrator.generate({
      modelId: "recovery-healthy-model",
      prompt: "Healthy generation",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe("Response: Healthy generation");

    expect(failingModel.generate).not.toHaveBeenCalled();
    expect(healthyModel.generate).toHaveBeenCalledTimes(1);

    const failingStatus = orchestrator.getRuntimeStatus(
      "recovery-failing-model",
    );

    const healthyStatus = orchestrator.getRuntimeStatus(
      "recovery-healthy-model",
    );

    expect(failingStatus.lastError).not.toBeNull();
    expect(failingStatus.activeGenerations).toBe(0);

    expect(healthyStatus.state).toBe("ready");
    expect(healthyStatus.activeGenerations).toBe(0);
    expect(healthyStatus.lastError).toBeNull();

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(failingModel.close).toHaveBeenCalledTimes(1);
    expect(healthyModel.close).toHaveBeenCalledTimes(1);
  });

  it("përballon dështimin e mbylljes pa përsëritur close", async () => {
    const model = createAdapter({
      id: "close-failure-model",
      close: vi.fn(async () => {
        throw new Error("Close failure");
      }),
    });

    const { orchestrator } = createSystem([model.adapter]);

    await orchestrator.generate({
      modelId: "close-failure-model",
      prompt: "Prepare runtime",
    });

    const firstClose = await orchestrator.close();
    const secondClose = await orchestrator.close();

    expect(firstClose.closed).toBe(true);
    expect(secondClose.closed).toBe(true);

    expect(firstClose.failures).toHaveLength(1);
    expect(firstClose.success).toBe(false);

    expect(secondClose.failures).toHaveLength(1);
    expect(secondClose.success).toBe(false);

    expect(firstClose.failures[0].message).toBe("Close failure");

    expect(model.close).toHaveBeenCalledTimes(1);
    expect(orchestrator.getStatus().closed).toBe(true);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("ndalon kërkesat e reja pas fillimit të mbylljes", async () => {
    let releaseGeneration;

    const generationGate = new Promise((resolve) => {
      releaseGeneration = resolve;
    });

    const model = createAdapter({
      id: "closed-request-model",
      generate: vi.fn(async (request) => {
        await generationGate;

        return {
          text: `Response: ${request.prompt}`,
        };
      }),
    });

    const { orchestrator } = createSystem([model.adapter]);

    const activeRequest = orchestrator.generate({
      modelId: "closed-request-model",
      prompt: "Active request",
    });

    await vi.waitFor(() => {
      const status = orchestrator.getRuntimeStatus(
        "closed-request-model",
      );

      expect(status.activeGenerations).toBe(1);
    });

    const closePromise = orchestrator.close();

    await expect(
      orchestrator.generate({
        modelId: "closed-request-model",
        prompt: "Request after close",
      }),
    ).rejects.toBeDefined();

    releaseGeneration();

    const activeOutcome = await Promise.allSettled([activeRequest]);
    const closeResult = await closePromise;

    expect(activeOutcome[0].status).toBe("rejected");
    expect(closeResult.success).toBe(true);
    expect(closeResult.closed).toBe(true);

    expect(model.generate).toHaveBeenCalledTimes(1);
    expect(model.close).toHaveBeenCalledTimes(1);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("ruan konsistencën pas mbylljes kur një Runtime dështon", async () => {
    const failingModel = createAdapter({
      id: "shutdown-failure-model",
      generate: vi.fn(async () => {
        throw new Error("Generation failure before shutdown");
      }),
    });

    const healthyModel = createAdapter({
      id: "shutdown-healthy-model",
    });

    const { orchestrator } = createSystem([
      failingModel.adapter,
      healthyModel.adapter,
    ]);

    await expect(
      orchestrator.generate({
        modelId: "shutdown-failure-model",
        prompt: "Failing generation",
      }),
    ).rejects.toBeDefined();

    const healthyResult = await orchestrator.generate({
      modelId: "shutdown-healthy-model",
      prompt: "Healthy generation",
    });

    expect(healthyResult.success).toBe(true);

    const closeResult = await orchestrator.close();

    expect(closeResult.closed).toBe(true);
    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(2);
    expect(closeResult.failures).toHaveLength(0);

    expect(failingModel.close).toHaveBeenCalledTimes(1);
    expect(healthyModel.close).toHaveBeenCalledTimes(1);

    const finalStatus = orchestrator.getStatus();

    expect(finalStatus.closed).toBe(true);
    expect(finalStatus.activeRuntimes).toBe(0);
  });

  it("ruan izolimin gjatë mbylljes paralele me një Runtime që dështon", async () => {
    const failingModel = createAdapter({
      id: "parallel-close-failing-model",
      close: vi.fn(async () => {
        throw new Error("Parallel close failure");
      }),
    });

    const healthyModel = createAdapter({
      id: "parallel-close-healthy-model",
    });

    const { orchestrator } = createSystem([
      failingModel.adapter,
      healthyModel.adapter,
    ]);

    await Promise.all([
      orchestrator.generate({
        modelId: "parallel-close-failing-model",
        prompt: "Prepare failing runtime",
      }),
      orchestrator.generate({
        modelId: "parallel-close-healthy-model",
        prompt: "Prepare healthy runtime",
      }),
    ]);

    const [firstClose, secondClose] = await Promise.all([
      orchestrator.close(),
      orchestrator.close(),
    ]);

    expect(firstClose.closed).toBe(true);
    expect(secondClose.closed).toBe(true);

    expect(firstClose.success).toBe(false);
    expect(secondClose.success).toBe(false);

    expect(firstClose.failures).toHaveLength(1);
    expect(secondClose.failures).toHaveLength(1);

    expect(firstClose.failures[0].message).toBe(
      "Parallel close failure",
    );

    expect(failingModel.close).toHaveBeenCalledTimes(1);
    expect(healthyModel.close).toHaveBeenCalledTimes(1);

    expect(orchestrator.getStatus().closed).toBe(true);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });
});
