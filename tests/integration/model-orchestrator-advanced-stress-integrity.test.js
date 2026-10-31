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

function createTestSystem({
  id,
  initialize = vi.fn(async () => ({ success: true })),
  generate = vi.fn(async (request) => ({
    text: `Response: ${request.prompt}`,
  })),
  close = vi.fn(async () => ({ success: true })),
} = {}) {
  const adapter = createModelAdapter({
    id,
    modelId: id,
    type: "custom",
    initialize,
    generate,
    close,
  });

  const registry = createModelRegistry();
  registry.register(adapter);

  const selector = createModelSelector({
    registry,
    defaultModelId: id,
  });

  const orchestrator = createModelOrchestrator({
    registry,
    selector,
    defaultModelId: id,
  });

  return {
    adapter,
    registry,
    selector,
    orchestrator,
    initialize,
    generate,
    close,
  };
}

describe("XSUS AI Core — Model Orchestrator Advanced Stress & Stability", () => {
  it("përpunon 150 kërkesa paralele për të njëjtin model", async () => {
    const system = createTestSystem({
      id: "stress-single-model",
    });

    const requests = Array.from({ length: 150 }, (_, index) =>
      system.orchestrator.generate({
        modelId: "stress-single-model",
        prompt: `Stress request ${index + 1}`,
      }),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(150);

    for (let index = 0; index < results.length; index += 1) {
      expect(results[index].success).toBe(true);
      expect(results[index].text).toBe(
        `Response: Stress request ${index + 1}`,
      );
    }

    expect(system.initialize).toHaveBeenCalledTimes(1);
    expect(system.generate).toHaveBeenCalledTimes(150);

    const status = system.orchestrator.getRuntimeStatus(
      "stress-single-model",
    );

    expect(status.state).toBe("ready");
    expect(status.activeGenerations).toBe(0);

    const closeResult = await system.orchestrator.close();

    expect(closeResult.closed).toBe(true);
    expect(system.close).toHaveBeenCalledTimes(1);
  });

  it("përpunon kërkesa paralele në shumë modele pa përzier rezultatet", async () => {
    const systems = Array.from({ length: 8 }, (_, index) =>
      createTestSystem({
        id: `stress-model-${index + 1}`,
      }),
    );

    const requestsPerModel = 20;

    const requests = systems.flatMap((system, modelIndex) =>
      Array.from({ length: requestsPerModel }, (_, requestIndex) =>
        system.orchestrator.generate({
          modelId: `stress-model-${modelIndex + 1}`,
          prompt: `Model ${modelIndex + 1} request ${requestIndex + 1}`,
        }),
      ),
    );

    const results = await Promise.all(requests);

    expect(results).toHaveLength(160);

    for (let modelIndex = 0; modelIndex < systems.length; modelIndex += 1) {
      const system = systems[modelIndex];
      const modelResults = results.slice(
        modelIndex * requestsPerModel,
        (modelIndex + 1) * requestsPerModel,
      );

      expect(modelResults).toHaveLength(requestsPerModel);

      for (let requestIndex = 0; requestIndex < requestsPerModel; requestIndex += 1) {
        expect(modelResults[requestIndex].success).toBe(true);
        expect(modelResults[requestIndex].text).toBe(
          `Response: Model ${modelIndex + 1} request ${requestIndex + 1}`,
        );
      }

      expect(system.initialize).toHaveBeenCalledTimes(1);
      expect(system.generate).toHaveBeenCalledTimes(requestsPerModel);

      const status = system.orchestrator.getRuntimeStatus(
        `stress-model-${modelIndex + 1}`,
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
    }

    const closeResults = await Promise.all(
      systems.map((system) => system.orchestrator.close()),
    );

    expect(closeResults.every((result) => result.closed)).toBe(true);

    for (const system of systems) {
      expect(system.close).toHaveBeenCalledTimes(1);
    }
  });

  it("izolon 10 dështime nga 30 kërkesa të përziera paralele", async () => {
    const generate = vi.fn(async (request) => {
      if (request.prompt.endsWith("-fail")) {
        throw new Error(`Intentional failure: ${request.prompt}`);
      }

      return {
        text: `Recovered: ${request.prompt}`,
      };
    });

    const system = createTestSystem({
      id: "mixed-load-model",
      generate,
    });

    const requests = Array.from({ length: 30 }, (_, index) => {
      const shouldFail = (index + 1) % 3 === 0;

      return system.orchestrator.generate({
        modelId: "mixed-load-model",
        prompt: shouldFail
          ? `Request ${index + 1}-fail`
          : `Request ${index + 1}-success`,
      });
    });

    const outcomes = await Promise.allSettled(requests);

    const successful = outcomes.filter(
      (outcome) => outcome.status === "fulfilled",
    );

    const failed = outcomes.filter(
      (outcome) => outcome.status === "rejected",
    );

    expect(successful).toHaveLength(20);
    expect(failed).toHaveLength(10);

    for (const outcome of successful) {
      expect(outcome.value.success).toBe(true);
      expect(outcome.value.text).toContain("Recovered:");
    }

    for (const outcome of failed) {
      expect(outcome.reason.code).toBeDefined();
    }

    expect(generate).toHaveBeenCalledTimes(30);

    const status = system.orchestrator.getRuntimeStatus(
      "mixed-load-model",
    );

    expect(status.state).toBe("ready");
    expect(status.activeGenerations).toBe(0);

    const recovery = await system.orchestrator.generate({
      modelId: "mixed-load-model",
      prompt: "Final recovery request",
    });

    expect(recovery.success).toBe(true);
    expect(recovery.text).toBe(
      "Recovered: Final recovery request",
    );

    expect(
      system.orchestrator.getRuntimeStatus("mixed-load-model")
        .activeGenerations,
    ).toBe(0);

    await system.orchestrator.close();
  });

  it("ruan stabilitetin gjatë 10 cikleve të inicializimit, gjenerimit dhe mbylljes", async () => {
    const cycleCount = 10;
    const requestsPerCycle = 10;

    const systems = [];

    for (let cycle = 1; cycle <= cycleCount; cycle += 1) {
      const system = createTestSystem({
        id: `lifecycle-cycle-${cycle}`,
      });

      systems.push(system);

      const requests = Array.from(
        { length: requestsPerCycle },
        (_, index) =>
          system.orchestrator.generate({
            modelId: `lifecycle-cycle-${cycle}`,
            prompt: `Cycle ${cycle} request ${index + 1}`,
          }),
      );

      const results = await Promise.all(requests);

      expect(results).toHaveLength(requestsPerCycle);
      expect(results.every((result) => result.success)).toBe(true);

      expect(system.initialize).toHaveBeenCalledTimes(1);
      expect(system.generate).toHaveBeenCalledTimes(requestsPerCycle);

      const beforeClose = system.orchestrator.getRuntimeStatus(
        `lifecycle-cycle-${cycle}`,
      );

      expect(beforeClose.state).toBe("ready");
      expect(beforeClose.activeGenerations).toBe(0);

      const closeResult = await system.orchestrator.close();

      expect(closeResult.success).toBe(true);
      expect(closeResult.closed).toBe(true);
      expect(system.close).toHaveBeenCalledTimes(1);

      const finalStatus = system.orchestrator.getStatus();

      expect(finalStatus.closed).toBe(true);
      expect(finalStatus.activeRuntimes).toBe(0);
    }

    expect(systems).toHaveLength(cycleCount);
  });

  it("ruan izolimin dhe integritetin e gjendjes pas ngarkesës së kombinuar", async () => {
    const systems = Array.from({ length: 5 }, (_, index) => {
      const generate = vi.fn(async (request) => {
        if (request.prompt.includes("failure")) {
          throw new Error("Combined stress failure");
        }

        return {
          text: `Stable response: ${request.prompt}`,
        };
      });

      return createTestSystem({
        id: `combined-model-${index + 1}`,
        generate,
      });
    });

    const requests = systems.flatMap((system, modelIndex) =>
      Array.from({ length: 12 }, (_, requestIndex) =>
        system.orchestrator.generate({
          modelId: `combined-model-${modelIndex + 1}`,
          prompt:
            requestIndex % 4 === 0
              ? `Model ${modelIndex + 1} failure ${requestIndex}`
              : `Model ${modelIndex + 1} success ${requestIndex}`,
        }),
      ),
    );

    const outcomes = await Promise.allSettled(requests);

    expect(outcomes).toHaveLength(60);

    const successful = outcomes.filter(
      (outcome) => outcome.status === "fulfilled",
    );

    const failed = outcomes.filter(
      (outcome) => outcome.status === "rejected",
    );

    expect(successful).toHaveLength(45);
    expect(failed).toHaveLength(15);

    for (let index = 0; index < systems.length; index += 1) {
      const system = systems[index];

      const status = system.orchestrator.getRuntimeStatus(
        `combined-model-${index + 1}`,
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
      expect(system.generate).toHaveBeenCalledTimes(12);
      expect(system.initialize).toHaveBeenCalledTimes(1);
    }

    const closeResults = await Promise.all(
      systems.map((system) => system.orchestrator.close()),
    );

    expect(closeResults.every((result) => result.success)).toBe(true);

    for (const system of systems) {
      expect(system.orchestrator.getStatus().closed).toBe(true);
      expect(system.orchestrator.getStatus().activeRuntimes).toBe(0);
      expect(system.close).toHaveBeenCalledTimes(1);
    }
  });
});
