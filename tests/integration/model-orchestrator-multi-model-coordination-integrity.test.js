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
    text: `${id}: ${request.prompt}`,
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

describe("XSUS AI Core — Multi-Model Orchestrator Coordination & Isolation", () => {
  it("koordinon 200 kërkesa paralele në 10 modele të pavarura", async () => {
    const models = Array.from({ length: 10 }, (_, index) =>
      createAdapter({
        id: `coordination-model-${index + 1}`,
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = Array.from({ length: 200 }, (_, index) => {
      const modelIndex = index % models.length;
      const modelId = `coordination-model-${modelIndex + 1}`;
      const prompt = `Model ${modelIndex + 1} request ${index + 1}`;

      return orchestrator.generate({
        modelId,
        prompt,
      }).then((result) => ({
        modelId,
        prompt,
        result,
      }));
    });

    const results = await Promise.all(requests);

    expect(results).toHaveLength(200);

    for (const item of results) {
      expect(item.result.success).toBe(true);
      expect(item.result.text).toBe(
        `${item.modelId}: ${item.prompt}`,
      );
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
    expect(closeResult.failures).toHaveLength(0);

    for (const model of models) {
      expect(model.close).toHaveBeenCalledTimes(1);
    }

    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("ruan izolimin e përgjigjeve dhe burimeve ndërmjet modeleve", async () => {
    const models = Array.from({ length: 5 }, (_, index) =>
      createAdapter({
        id: `isolation-model-${index + 1}`,
        generate: vi.fn(async (request) => ({
          text: `PRIVATE-${index + 1}: ${request.prompt}`,
        })),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = models.map((model, index) =>
      orchestrator.generate({
        modelId: `isolation-model-${index + 1}`,
        prompt: `Unique request ${index + 1}`,
      }),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(5);

    for (let index = 0; index < results.length; index += 1) {
      expect(results[index].text).toBe(
        `PRIVATE-${index + 1}: Unique request ${index + 1}`,
      );

      for (let otherIndex = 0; otherIndex < results.length; otherIndex += 1) {
        if (otherIndex !== index) {
          expect(results[index].text).not.toContain(
            `PRIVATE-${otherIndex + 1}:`,
          );
        }
      }
    }

    for (const model of models) {
      expect(model.generate).toHaveBeenCalledTimes(1);

      const status = orchestrator.getRuntimeStatus(
        model.adapter.id,
      );

      expect(status.activeGenerations).toBe(0);
      expect(status.state).toBe("ready");
    }

    await orchestrator.close();

    for (const model of models) {
      expect(model.close).toHaveBeenCalledTimes(1);
    }
  });

  it("përballon regjistrimin dhe çregjistrimin dinamik gjatë punës", async () => {
    const firstModel = createAdapter({
      id: "dynamic-coordination-first",
    });

    const { registry, orchestrator } = createSystem([
      firstModel.adapter,
    ]);

    const firstResult = await orchestrator.generate({
      modelId: "dynamic-coordination-first",
      prompt: "Before registry update",
    });

    expect(firstResult.success).toBe(true);

    const secondModel = createAdapter({
      id: "dynamic-coordination-second",
    });

    registry.register(secondModel.adapter);

    const secondResult = await orchestrator.generate({
      modelId: "dynamic-coordination-second",
      prompt: "After registration",
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.text).toBe(
      "dynamic-coordination-second: After registration",
    );

    expect(registry.unregister("dynamic-coordination-first")).toBe(true);
    expect(registry.has("dynamic-coordination-first")).toBe(false);

    await expect(
      orchestrator.generate({
        modelId: "dynamic-coordination-first",
        prompt: "Request to removed model",
      }),
    ).rejects.toBeDefined();

    const thirdModel = createAdapter({
      id: "dynamic-coordination-third",
    });

    registry.register(thirdModel.adapter);

    const thirdResult = await orchestrator.generate({
      modelId: "dynamic-coordination-third",
      prompt: "After second registry update",
    });

    expect(thirdResult.success).toBe(true);
    expect(thirdResult.text).toBe(
      "dynamic-coordination-third: After second registry update",
    );

    expect(firstModel.generate).toHaveBeenCalledTimes(1);
    expect(secondModel.generate).toHaveBeenCalledTimes(1);
    expect(thirdModel.generate).toHaveBeenCalledTimes(1);

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(3);
    expect(closeResult.failures).toHaveLength(0);

    expect(firstModel.close).toHaveBeenCalledTimes(1);
    expect(secondModel.close).toHaveBeenCalledTimes(1);
    expect(thirdModel.close).toHaveBeenCalledTimes(1);
  });

  it("izolon dështimet e njëkohshme nga modelet e shëndetshme", async () => {
    const models = Array.from({ length: 8 }, (_, index) =>
      createAdapter({
        id: `failure-coordination-model-${index + 1}`,
        generate: vi.fn(async (request) => {
          if (index === 1 || index === 4 || index === 6) {
            throw new Error(`Controlled failure in model ${index + 1}`);
          }

          return {
            text: `Healthy model ${index + 1}: ${request.prompt}`,
          };
        }),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = models.map((model, index) =>
      orchestrator.generate({
        modelId: `failure-coordination-model-${index + 1}`,
        prompt: `Coordination request ${index + 1}`,
      }),
    );

    const outcomes = await Promise.allSettled(requests);

    expect(outcomes).toHaveLength(8);

    const failedIndexes = [1, 4, 6];

    for (let index = 0; index < outcomes.length; index += 1) {
      const outcome = outcomes[index];

      if (failedIndexes.includes(index)) {
        expect(outcome.status).toBe("rejected");

        if (outcome.status === "rejected") {
          expect(outcome.reason).toBeDefined();
          expect(outcome.reason.code).toBeDefined();
        }
      } else {
        expect(outcome.status).toBe("fulfilled");

        if (outcome.status === "fulfilled") {
          expect(outcome.value.success).toBe(true);
          expect(outcome.value.text).toContain(
            `Healthy model ${index + 1}:`,
          );
        }
      }

      const status = orchestrator.getRuntimeStatus(
        `failure-coordination-model-${index + 1}`,
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(8);
    expect(closeResult.failures).toHaveLength(0);

    for (const model of models) {
      expect(model.close).toHaveBeenCalledTimes(1);
    }
  });

  it("ruan konsistencën gjatë mbylljes së të gjitha Runtime-ve", async () => {
    let releaseGeneration;

    const generationGate = new Promise((resolve) => {
      releaseGeneration = resolve;
    });

    const models = Array.from({ length: 6 }, (_, index) =>
      createAdapter({
        id: `shutdown-coordination-model-${index + 1}`,
        generate: vi.fn(async (request) => {
          await generationGate;

          return {
            text: `Completed model ${index + 1}: ${request.prompt}`,
          };
        }),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = models.map((model, index) =>
      orchestrator.generate({
        modelId: `shutdown-coordination-model-${index + 1}`,
        prompt: `Shutdown request ${index + 1}`,
      }),
    );

    await vi.waitFor(() => {
      for (const model of models) {
        const status = orchestrator.getRuntimeStatus(
          model.adapter.id,
        );

        expect(status.activeGenerations).toBe(1);
        expect(status.state).toBe("ready");
      }
    });

    const closePromises = Array.from(
      { length: 5 },
      () => orchestrator.close(),
    );

    expect(orchestrator.getStatus().closed).toBe(true);

    releaseGeneration();

    const outcomes = await Promise.allSettled(requests);
    const closeResults = await Promise.all(closePromises);

    expect(outcomes).toHaveLength(6);

    for (const outcome of outcomes) {
      expect(outcome.status).toBe("rejected");

      if (outcome.status === "rejected") {
        expect(outcome.reason).toBeDefined();
        expect(outcome.reason.code).toBeDefined();
      }
    }

    for (const result of closeResults) {
      expect(result.success).toBe(true);
      expect(result.closed).toBe(true);
      expect(result.runtimesClosed).toBe(6);
      expect(result.failures).toHaveLength(0);
    }

    for (const model of models) {
      expect(model.generate).toHaveBeenCalledTimes(1);
      expect(model.close).toHaveBeenCalledTimes(1);
    }

    const finalStatus = orchestrator.getStatus();

    expect(finalStatus.closed).toBe(true);
    expect(finalStatus.activeRuntimes).toBe(0);
  });
});
