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

describe("XSUS AI Core — Advanced Orchestrator Concurrency & Recovery Stress", () => {
  it("përballon 200 kërkesa paralele të shpërndara në 10 modele", async () => {
    const models = Array.from({ length: 10 }, (_, index) =>
      createAdapter({
        id: `stress-model-${index + 1}`,
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = Array.from({ length: 200 }, (_, index) => {
      const modelIndex = index % models.length;

      return orchestrator.generate({
        modelId: `stress-model-${modelIndex + 1}`,
        prompt: `Stress request ${index + 1}`,
      });
    });

    const results = await Promise.all(requests);

    expect(results).toHaveLength(200);

    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.text).toContain("Response: Stress request");
    }

    for (const model of models) {
      expect(model.initialize).toHaveBeenCalledTimes(1);
      expect(model.generate).toHaveBeenCalledTimes(20);

      const status = orchestrator.getRuntimeStatus(
        model.adapter.id,
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(10);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);

    for (const model of models) {
      expect(model.close).toHaveBeenCalledTimes(1);
    }
  });

  it("izolon 30 dështime nga 120 gjenerime paralele", async () => {
    const models = Array.from({ length: 6 }, (_, index) =>
      createAdapter({
        id: `failure-stress-model-${index + 1}`,
        generate: vi.fn(async (request) => {
          if (request.prompt.includes("FAIL")) {
            throw new Error(`Controlled failure: ${request.prompt}`);
          }

          return {
            text: `Recovered response: ${request.prompt}`,
          };
        }),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = Array.from({ length: 120 }, (_, index) => {
      const modelIndex = index % models.length;
      const shouldFail = index % 4 === 0;

      return orchestrator.generate({
        modelId: `failure-stress-model-${modelIndex + 1}`,
        prompt: shouldFail
          ? `FAIL request ${index + 1}`
          : `Healthy request ${index + 1}`,
      });
    });

    const outcomes = await Promise.allSettled(requests);

    expect(outcomes).toHaveLength(120);

    const fulfilled = outcomes.filter(
      (outcome) => outcome.status === "fulfilled",
    );

    const rejected = outcomes.filter(
      (outcome) => outcome.status === "rejected",
    );

    expect(fulfilled).toHaveLength(90);
    expect(rejected).toHaveLength(30);

    for (const outcome of fulfilled) {
      expect(outcome.value.success).toBe(true);
      expect(outcome.value.text).toContain("Recovered response:");
    }

    for (const outcome of rejected) {
      expect(outcome.reason).toBeDefined();
      expect(outcome.reason.code).toBeDefined();
    }

    for (const model of models) {
      const status = orchestrator.getRuntimeStatus(
        model.adapter.id,
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
      expect(model.generate).toHaveBeenCalledTimes(20);
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.closed).toBe(true);
    expect(closeResult.success).toBe(true);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("bashkon inicializimet paralele të të njëjtit model edhe kur ato dështojnë", async () => {
    let releaseInitialization;

    const initializationGate = new Promise((resolve) => {
      releaseInitialization = resolve;
    });

    const initialize = vi.fn(async () => {
      await initializationGate;
      throw new Error("Shared initialization failure");
    });

    const model = createAdapter({
      id: "shared-initialization-failure-model",
      initialize,
    });

    const { orchestrator } = createSystem([model.adapter]);

    const requests = Array.from({ length: 40 }, (_, index) =>
      orchestrator.generate({
        modelId: "shared-initialization-failure-model",
        prompt: `Initialization request ${index + 1}`,
      }),
    );

    await vi.waitFor(() => {
      expect(initialize).toHaveBeenCalledTimes(1);
    });

    releaseInitialization();

    const outcomes = await Promise.allSettled(requests);

    expect(outcomes).toHaveLength(40);

    for (const outcome of outcomes) {
      expect(outcome.status).toBe("rejected");

      if (outcome.status === "rejected") {
        expect(outcome.reason).toBeDefined();
      }
    }

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(model.generate).not.toHaveBeenCalled();

    const status = orchestrator.getRuntimeStatus(
      "shared-initialization-failure-model",
    );

    expect(status.initialized).toBe(false);
    expect(status.activeGenerations).toBe(0);
    expect(status.lastError).not.toBeNull();

    const closeResult = await orchestrator.close();

    expect(closeResult.closed).toBe(true);
    expect(model.close).toHaveBeenCalledTimes(1);
  });

  it("ruan izolimin e modeleve gjatë dështimeve të njëkohshme", async () => {
    const models = Array.from({ length: 8 }, (_, index) =>
      createAdapter({
        id: `isolated-stress-model-${index + 1}`,
        generate: vi.fn(async (request) => {
          if (index % 2 === 0) {
            throw new Error(`Model ${index + 1} failure`);
          }

          return {
            text: `Model ${index + 1}: ${request.prompt}`,
          };
        }),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = models.map((model, index) =>
      orchestrator.generate({
        modelId: `isolated-stress-model-${index + 1}`,
        prompt: `Isolation request ${index + 1}`,
      }),
    );

    const outcomes = await Promise.allSettled(requests);

    expect(outcomes).toHaveLength(8);

    for (let index = 0; index < outcomes.length; index += 1) {
      const outcome = outcomes[index];

      if (index % 2 === 0) {
        expect(outcome.status).toBe("rejected");
      } else {
        expect(outcome.status).toBe("fulfilled");

        if (outcome.status === "fulfilled") {
          expect(outcome.value.success).toBe(true);
        }
      }

      const status = orchestrator.getRuntimeStatus(
        `isolated-stress-model-${index + 1}`,
      );

      expect(status.activeGenerations).toBe(0);
      expect(status.state).toBe("ready");
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(8);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);

    for (const model of models) {
      expect(model.close).toHaveBeenCalledTimes(1);
    }
  });

  it("përballon mbylljen paralele të 12 Runtime-ve me një dështim të kontrolluar", async () => {
    const models = Array.from({ length: 12 }, (_, index) =>
      createAdapter({
        id: `parallel-shutdown-model-${index + 1}`,
        close: index === 5
          ? vi.fn(async () => {
              throw new Error("Controlled shutdown failure");
            })
          : vi.fn(async () => ({ success: true })),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    await Promise.all(
      models.map((model, index) =>
        orchestrator.generate({
          modelId: `parallel-shutdown-model-${index + 1}`,
          prompt: `Prepare runtime ${index + 1}`,
        }),
      ),
    );

    const closeResults = await Promise.all(
      Array.from({ length: 10 }, () => orchestrator.close()),
    );

    for (const result of closeResults) {
      expect(result.closed).toBe(true);
      expect(result.success).toBe(false);
      expect(result.runtimesClosed).toBe(12);
      expect(result.failures).toHaveLength(1);
    }

    expect(orchestrator.getStatus().closed).toBe(true);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);

    for (const model of models) {
      expect(model.close).toHaveBeenCalledTimes(1);
    }
  });

  it("ruan pastrimin e burimeve pas 20 cikleve të gjenerimit dhe mbylljes", async () => {
    for (let cycle = 1; cycle <= 20; cycle += 1) {
      const model = createAdapter({
        id: `lifecycle-stress-model-${cycle}`,
      });

      const { orchestrator } = createSystem([model.adapter]);

      const requests = Array.from({ length: 10 }, (_, index) =>
        orchestrator.generate({
          modelId: `lifecycle-stress-model-${cycle}`,
          prompt: `Cycle ${cycle} request ${index + 1}`,
        }),
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);

      for (const result of results) {
        expect(result.success).toBe(true);
      }

      const status = orchestrator.getRuntimeStatus(
        `lifecycle-stress-model-${cycle}`,
      );

      expect(status.activeGenerations).toBe(0);

      const closeResult = await orchestrator.close();

      expect(closeResult.success).toBe(true);
      expect(closeResult.closed).toBe(true);
      expect(closeResult.runtimesClosed).toBe(1);

      expect(model.initialize).toHaveBeenCalledTimes(1);
      expect(model.generate).toHaveBeenCalledTimes(10);
      expect(model.close).toHaveBeenCalledTimes(1);

      expect(orchestrator.getStatus().activeRuntimes).toBe(0);
    }
  });
});
