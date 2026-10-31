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

describe("XSUS AI Core — Orchestrator Consistency & Long-Running Stability", () => {
  it("përballon 1000 gjenerime të njëpasnjëshme pa rrjedhje burimesh", async () => {
    const model = createAdapter({
      id: "long-running-sequential-model",
    });

    const { orchestrator } = createSystem([model.adapter]);

    for (let index = 1; index <= 1000; index += 1) {
      const result = await orchestrator.generate({
        modelId: "long-running-sequential-model",
        prompt: `Sequential request ${index}`,
      });

      expect(result.success).toBe(true);
      expect(result.text).toBe(
        `Response: Sequential request ${index}`,
      );

      const status = orchestrator.getRuntimeStatus(
        "long-running-sequential-model",
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
    }

    expect(model.initialize).toHaveBeenCalledTimes(1);
    expect(model.generate).toHaveBeenCalledTimes(1000);

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.closed).toBe(true);
    expect(closeResult.runtimesClosed).toBe(1);
    expect(closeResult.failures).toHaveLength(0);

    expect(model.close).toHaveBeenCalledTimes(1);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("përballon 500 kërkesa paralele dhe ruan konsistencën e statusit", async () => {
    const model = createAdapter({
      id: "long-running-parallel-model",
    });

    const { orchestrator } = createSystem([model.adapter]);

    const requests = Array.from({ length: 500 }, (_, index) =>
      orchestrator.generate({
        modelId: "long-running-parallel-model",
        prompt: `Parallel request ${index + 1}`,
      }),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(500);

    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.text).toContain("Response: Parallel request");
    }

    expect(model.initialize).toHaveBeenCalledTimes(1);
    expect(model.generate).toHaveBeenCalledTimes(500);

    const status = orchestrator.getRuntimeStatus(
      "long-running-parallel-model",
    );

    expect(status.state).toBe("ready");
    expect(status.activeGenerations).toBe(0);

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(1);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("izolon 100 dështime të kontrolluara gjatë 400 kërkesave", async () => {
    const model = createAdapter({
      id: "long-running-failure-model",
      generate: vi.fn(async (request) => {
        if (request.prompt.includes("FAIL")) {
          throw new Error(`Controlled failure: ${request.prompt}`);
        }

        return {
          text: `Recovered: ${request.prompt}`,
        };
      }),
    });

    const { orchestrator } = createSystem([model.adapter]);

    const requests = Array.from({ length: 400 }, (_, index) =>
      orchestrator.generate({
        modelId: "long-running-failure-model",
        prompt: (index + 1) % 4 === 0
          ? `FAIL request ${index + 1}`
          : `Healthy request ${index + 1}`,
      }),
    );

    const outcomes = await Promise.allSettled(requests);

    expect(outcomes).toHaveLength(400);

    const fulfilled = outcomes.filter(
      (outcome) => outcome.status === "fulfilled",
    );

    const rejected = outcomes.filter(
      (outcome) => outcome.status === "rejected",
    );

    expect(fulfilled).toHaveLength(300);
    expect(rejected).toHaveLength(100);

    for (const outcome of fulfilled) {
      expect(outcome.value.success).toBe(true);
      expect(outcome.value.text).toContain("Recovered:");
    }

    for (const outcome of rejected) {
      expect(outcome.reason).toBeDefined();
      expect(outcome.reason.code).toBeDefined();
    }

    const status = orchestrator.getRuntimeStatus(
      "long-running-failure-model",
    );

    expect(status.state).toBe("ready");
    expect(status.activeGenerations).toBe(0);
    expect(model.generate).toHaveBeenCalledTimes(400);

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.closed).toBe(true);
    expect(closeResult.failures).toHaveLength(0);
    expect(model.close).toHaveBeenCalledTimes(1);
  });

  it("ruan izolimin e pesë modeleve nën ngarkesë të vazhdueshme", async () => {
    const models = Array.from({ length: 5 }, (_, index) =>
      createAdapter({
        id: `continuous-load-model-${index + 1}`,
        generate: vi.fn(async (request) => {
          if (index === 2 && request.prompt.includes("FAIL")) {
            throw new Error("Isolated continuous-load failure");
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

    for (let batch = 1; batch <= 10; batch += 1) {
      const requests = Array.from({ length: 50 }, (_, index) => {
        const modelIndex = index % models.length;
        const shouldFail =
          modelIndex === 2 && index % 5 === 2;

        return orchestrator.generate({
          modelId: `continuous-load-model-${modelIndex + 1}`,
          prompt: shouldFail
            ? `FAIL batch ${batch} request ${index + 1}`
            : `Batch ${batch} request ${index + 1}`,
        });
      });

      const outcomes = await Promise.allSettled(requests);

      expect(outcomes).toHaveLength(50);

      expect(
        outcomes.filter((outcome) => outcome.status === "rejected"),
      ).toHaveLength(10);

      expect(
        outcomes.filter((outcome) => outcome.status === "fulfilled"),
      ).toHaveLength(40);

      for (const model of models) {
        const status = orchestrator.getRuntimeStatus(
          model.adapter.id,
        );

        expect(status.state).toBe("ready");
        expect(status.activeGenerations).toBe(0);
      }
    }

    for (const model of models) {
      expect(model.initialize).toHaveBeenCalledTimes(1);
      expect(model.generate).toHaveBeenCalledTimes(100);
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(5);
    expect(closeResult.failures).toHaveLength(0);

    for (const model of models) {
      expect(model.close).toHaveBeenCalledTimes(1);
    }

    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("ruan integritetin në 25 cikle të gjata të jetës së Runtime-it", async () => {
    for (let cycle = 1; cycle <= 25; cycle += 1) {
      const model = createAdapter({
        id: `long-lifecycle-model-${cycle}`,
      });

      const { orchestrator } = createSystem([model.adapter]);

      for (let batch = 1; batch <= 4; batch += 1) {
        const requests = Array.from({ length: 20 }, (_, index) =>
          orchestrator.generate({
            modelId: `long-lifecycle-model-${cycle}`,
            prompt: `Cycle ${cycle} batch ${batch} request ${index + 1}`,
          }),
        );

        const results = await Promise.all(requests);

        expect(results).toHaveLength(20);

        for (const result of results) {
          expect(result.success).toBe(true);
        }

        const status = orchestrator.getRuntimeStatus(
          `long-lifecycle-model-${cycle}`,
        );

        expect(status.state).toBe("ready");
        expect(status.activeGenerations).toBe(0);
      }

      expect(model.initialize).toHaveBeenCalledTimes(1);
      expect(model.generate).toHaveBeenCalledTimes(80);

      const closeResult = await orchestrator.close();

      expect(closeResult.success).toBe(true);
      expect(closeResult.closed).toBe(true);
      expect(closeResult.runtimesClosed).toBe(1);
      expect(closeResult.failures).toHaveLength(0);

      expect(model.close).toHaveBeenCalledTimes(1);
      expect(orchestrator.getStatus().activeRuntimes).toBe(0);
    }
  });
});
