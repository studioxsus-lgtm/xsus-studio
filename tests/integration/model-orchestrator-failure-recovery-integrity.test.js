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

function createSystem({ adapters = [], defaultModelId = null } = {}) {
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

describe("XSUS AI Core — Model Orchestrator Failure Recovery & Resilience", () => {
  it("rikuperohet kur inicializimi dështon dhe provohet përsëri", async () => {
    const initialize = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary initialization failure"))
      .mockResolvedValueOnce({ success: true });

    const adapter = createTestAdapter({
      id: "initialization-recovery-model",
      modelId: "initialization-recovery-model",
      initialize,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await expect(
      orchestrator.initialize("initialization-recovery-model"),
    ).rejects.toBeDefined();

    const failedStatus = orchestrator.getRuntimeStatus(
      "initialization-recovery-model",
    );

    expect(failedStatus).not.toBeNull();
    expect(failedStatus.state).toBe("error");
    expect(failedStatus.initialized).toBe(false);

    const recoveredStatus = await orchestrator.initialize(
      "initialization-recovery-model",
    );

    expect(recoveredStatus.initialized).toBe(true);
    expect(recoveredStatus.state).toBe("ready");
    expect(initialize).toHaveBeenCalledTimes(2);

    await orchestrator.close();
  });

  it("rikuperohet pas një dështimi të përkohshëm të gjenerimit", async () => {
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary generation failure"))
      .mockResolvedValueOnce({
        text: "Recovered response",
      });

    const adapter = createTestAdapter({
      id: "generation-recovery-model",
      modelId: "generation-recovery-model",
      generate,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await expect(
      orchestrator.generate({
        modelId: "generation-recovery-model",
        prompt: "First attempt",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
    });

    const failedStatus = orchestrator.getRuntimeStatus(
      "generation-recovery-model",
    );

    expect(failedStatus.state).toBe("ready");
    expect(failedStatus.activeGenerations).toBe(0);
    expect(failedStatus.lastError).not.toBeNull();

    const result = await orchestrator.generate({
      modelId: "generation-recovery-model",
      prompt: "Second attempt",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe("Recovered response");

    const recoveredStatus = orchestrator.getRuntimeStatus(
      "generation-recovery-model",
    );

    expect(recoveredStatus.state).toBe("ready");
    expect(recoveredStatus.activeGenerations).toBe(0);
    expect(recoveredStatus.lastError).toBeNull();

    expect(generate).toHaveBeenCalledTimes(2);

    await orchestrator.close();
  });

  it("izolon dështimin e inicializimit të një modeli nga modelet e tjera", async () => {
    const failingAdapter = createTestAdapter({
      id: "initialization-failure-model",
      modelId: "initialization-failure-model",
      initialize: vi.fn(async () => {
        throw new Error("Model initialization failed");
      }),
    });

    const workingAdapter = createTestAdapter({
      id: "independent-working-model",
      modelId: "independent-working-model",
    });

    const { orchestrator } = createSystem({
      adapters: [failingAdapter, workingAdapter],
    });

    await expect(
      orchestrator.generate({
        modelId: "initialization-failure-model",
        prompt: "Failing model request",
      }),
    ).rejects.toBeDefined();

    const result = await orchestrator.generate({
      modelId: "independent-working-model",
      prompt: "Working model request",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe(
      "Response: Working model request",
    );

    const failedStatus = orchestrator.getRuntimeStatus(
      "initialization-failure-model",
    );

    const workingStatus = orchestrator.getRuntimeStatus(
      "independent-working-model",
    );

    expect(failedStatus.state).toBe("error");
    expect(workingStatus.state).toBe("ready");
    expect(workingStatus.activeGenerations).toBe(0);

    await orchestrator.close();
  });

  it("ruan integritetin pas dështimeve të përsëritura të gjenerimit", async () => {
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failure one"))
      .mockRejectedValueOnce(new Error("Failure two"))
      .mockResolvedValueOnce({
        text: "Final successful response",
      });

    const adapter = createTestAdapter({
      id: "repeated-failure-model",
      modelId: "repeated-failure-model",
      generate,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    for (const prompt of ["Attempt one", "Attempt two"]) {
      await expect(
        orchestrator.generate({
          modelId: "repeated-failure-model",
          prompt,
        }),
      ).rejects.toMatchObject({
        code: MODEL_ORCHESTRATOR_ERRORS.GENERATION_FAILED,
      });

      const status = orchestrator.getRuntimeStatus(
        "repeated-failure-model",
      );

      expect(status.activeGenerations).toBe(0);
      expect(status.state).toBe("ready");
      expect(status.lastError).not.toBeNull();
    }

    const result = await orchestrator.generate({
      modelId: "repeated-failure-model",
      prompt: "Final attempt",
    });

    expect(result.success).toBe(true);
    expect(result.text).toBe("Final successful response");

    const finalStatus = orchestrator.getRuntimeStatus(
      "repeated-failure-model",
    );

    expect(finalStatus.activeGenerations).toBe(0);
    expect(finalStatus.state).toBe("ready");
    expect(finalStatus.lastError).toBeNull();

    expect(generate).toHaveBeenCalledTimes(3);

    await orchestrator.close();
  });

  it("mbyll Runtime-të e tjera edhe kur një adapter dështon gjatë mbylljes", async () => {
    const failingClose = vi.fn(async () => {
      throw new Error("Adapter close failure");
    });

    const successfulClose = vi.fn(async () => ({
      success: true,
    }));

    const failingAdapter = createTestAdapter({
      id: "close-failure-model",
      modelId: "close-failure-model",
      close: failingClose,
    });

    const workingAdapter = createTestAdapter({
      id: "close-success-model",
      modelId: "close-success-model",
      close: successfulClose,
    });

    const { orchestrator } = createSystem({
      adapters: [failingAdapter, workingAdapter],
    });

    await Promise.all([
      orchestrator.generate({
        modelId: "close-failure-model",
        prompt: "Prepare first model",
      }),
      orchestrator.generate({
        modelId: "close-success-model",
        prompt: "Prepare second model",
      }),
    ]);

    const result = await orchestrator.close();

    expect(result.closed).toBe(true);
    expect(result.success).toBe(false);
    expect(result.runtimesClosed).toBe(2);
    expect(result.failures).toHaveLength(1);

    expect(failingClose).toHaveBeenCalledTimes(1);
    expect(successfulClose).toHaveBeenCalledTimes(1);

    expect(orchestrator.getStatus().closed).toBe(true);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("ruan rezultatin e mbylljes dhe nuk përsërit mbylljen pas dështimit", async () => {
    const close = vi.fn(async () => {
      throw new Error("Persistent close failure");
    });

    const adapter = createTestAdapter({
      id: "persistent-close-failure-model",
      modelId: "persistent-close-failure-model",
      close,
    });

    const { orchestrator } = createSystem({
      adapters: [adapter],
    });

    await orchestrator.generate({
      modelId: "persistent-close-failure-model",
      prompt: "Prepare model",
    });

    const firstResult = await orchestrator.close();
    const secondResult = await orchestrator.close();

    expect(firstResult.success).toBe(false);
    expect(firstResult.closed).toBe(true);
    expect(firstResult.runtimesClosed).toBe(1);
    expect(firstResult.failures).toHaveLength(1);

    expect(secondResult).toBe(firstResult);
    expect(close).toHaveBeenCalledTimes(1);

    expect(orchestrator.getStatus().closed).toBe(true);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });
});
