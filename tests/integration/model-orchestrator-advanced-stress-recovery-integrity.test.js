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

describe("XSUS AI Core — Multi-Model Orchestrator Advanced Stress & Recovery", () => {
  it("përballon 360 kërkesa paralele në 12 modele", async () => {
    const models = Array.from({ length: 12 }, (_, index) =>
      createAdapter({
        id: `advanced-stress-model-${index + 1}`,
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = Array.from({ length: 360 }, (_, index) => {
      const modelIndex = index % models.length;
      const modelId = `advanced-stress-model-${modelIndex + 1}`;
      const prompt = `Stress request ${index + 1}`;

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

    expect(results).toHaveLength(360);

    for (const item of results) {
      expect(item.result.success).toBe(true);
      expect(item.result.text).toBe(
        `${item.modelId}: ${item.prompt}`,
      );
    }

    for (const model of models) {
      expect(model.initialize).toHaveBeenCalledTimes(1);
      expect(model.generate).toHaveBeenCalledTimes(30);

      const status = orchestrator.getRuntimeStatus(
        model.adapter.id,
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(12);
    expect(closeResult.failures).toHaveLength(0);
    expect(orchestrator.getStatus().activeRuntimes).toBe(0);
  });

  it("izolon 50 dështime të kontrolluara nga 200 kërkesa paralele", async () => {
    const models = Array.from({ length: 8 }, (_, index) =>
      createAdapter({
        id: `recovery-stress-model-${index + 1}`,
        generate: vi.fn(async (request) => {
          if (request.prompt.includes("[FAIL]")) {
            throw new Error(`Controlled failure: ${index + 1}`);
          }

          return {
            text: `Recovered model ${index + 1}: ${request.prompt}`,
          };
        }),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    const requests = Array.from({ length: 200 }, (_, index) => {
      const modelIndex = index % models.length;
      const shouldFail = index % 4 === 0;
      const prompt = shouldFail
        ? `[FAIL] Request ${index + 1}`
        : `Request ${index + 1}`;

      return orchestrator.generate({
        modelId: `recovery-stress-model-${modelIndex + 1}`,
        prompt,
      });
    });

    const outcomes = await Promise.allSettled(requests);

    expect(outcomes).toHaveLength(200);

    const rejected = outcomes.filter(
      (outcome) => outcome.status === "rejected",
    );

    const fulfilled = outcomes.filter(
      (outcome) => outcome.status === "fulfilled",
    );

    expect(rejected).toHaveLength(50);
    expect(fulfilled).toHaveLength(150);

    for (const outcome of rejected) {
      expect(outcome.reason).toBeDefined();
      expect(outcome.reason.code).toBeDefined();
    }

    for (const outcome of fulfilled) {
      expect(outcome.value.success).toBe(true);
    }

    for (const model of models) {
      const status = orchestrator.getRuntimeStatus(
        model.adapter.id,
      );

      expect(status.state).toBe("ready");
      expect(status.activeGenerations).toBe(0);
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(8);
    expect(closeResult.failures).toHaveLength(0);
  });

  it("rikuperon modelet pas dështimeve të përsëritura në 10 cikle", async () => {
    const models = Array.from({ length: 5 }, (_, index) =>
      createAdapter({
        id: `repeated-recovery-model-${index + 1}`,
        generate: vi.fn(async (request) => {
          if (request.prompt.startsWith("FAIL-")) {
            throw new Error(`Temporary failure ${index + 1}`);
          }

          return {
            text: `OK-${index + 1}: ${request.prompt}`,
          };
        }),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    for (let cycle = 1; cycle <= 10; cycle += 1) {
      const requests = models.map((model, index) =>
        orchestrator.generate({
          modelId: `repeated-recovery-model-${index + 1}`,
          prompt: cycle % 2 === 0
            ? `FAIL-${cycle}-${index + 1}`
            : `RECOVER-${cycle}-${index + 1}`,
        }),
      );

      const outcomes = await Promise.allSettled(requests);

      expect(outcomes).toHaveLength(5);

      if (cycle % 2 === 0) {
        for (const outcome of outcomes) {
          expect(outcome.status).toBe("rejected");
        }
      } else {
        for (const outcome of outcomes) {
          expect(outcome.status).toBe("fulfilled");

          if (outcome.status === "fulfilled") {
            expect(outcome.value.success).toBe(true);
          }
        }
      }

      for (const model of models) {
        const status = orchestrator.getRuntimeStatus(
          model.adapter.id,
        );

        expect(status.state).toBe("ready");
        expect(status.activeGenerations).toBe(0);
      }
    }

    const recoveryRequests = models.map((model, index) =>
      orchestrator.generate({
        modelId: `repeated-recovery-model-${index + 1}`,
        prompt: `FINAL-RECOVERY-${index + 1}`,
      }),
    );

    const recoveryResults = await Promise.all(recoveryRequests);

    expect(recoveryResults).toHaveLength(5);

    for (let index = 0; index < recoveryResults.length; index += 1) {
      expect(recoveryResults[index].success).toBe(true);
      expect(recoveryResults[index].text).toBe(
        `OK-${index + 1}: FINAL-RECOVERY-${index + 1}`,
      );
    }

    for (const model of models) {
      expect(model.initialize).toHaveBeenCalledTimes(1);
      expect(model.close).not.toHaveBeenCalled();
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(5);
    expect(closeResult.failures).toHaveLength(0);
  });

  it("ruan stabilitetin gjatë 10 valëve me 50 kërkesa secila", async () => {
    const models = Array.from({ length: 5 }, (_, index) =>
      createAdapter({
        id: `wave-stability-model-${index + 1}`,
        generate: vi.fn(async (request) => {
          if (
            index === 2 &&
            request.prompt.includes("[WAVE-FAIL]")
          ) {
            throw new Error("Controlled wave failure");
          }

          return {
            text: `WAVE-${index + 1}: ${request.prompt}`,
          };
        }),
      }),
    );

    const { orchestrator } = createSystem(
      models.map((model) => model.adapter),
    );

    for (let wave = 1; wave <= 10; wave += 1) {
      const requests = Array.from({ length: 50 }, (_, index) => {
        const modelIndex = index % models.length;

        const shouldFail =
          modelIndex === 2 && index % 25 === 2;

        return orchestrator.generate({
          modelId: `wave-stability-model-${modelIndex + 1}`,
          prompt: shouldFail
            ? `[WAVE-FAIL] ${wave}-${index}`
            : `Wave ${wave} request ${index}`,
        });
      });

      const outcomes = await Promise.allSettled(requests);

      expect(outcomes).toHaveLength(50);

      const failures = outcomes.filter(
        (outcome) => outcome.status === "rejected",
      );

      expect(failures).toHaveLength(2);

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
    }

    const closeResult = await orchestrator.close();

    expect(closeResult.success).toBe(true);
    expect(closeResult.runtimesClosed).toBe(5);
    expect(closeResult.failures).toHaveLength(0);
  });

  it("përballon 20 cikle jetëgjatësie me 5 modele dhe 10 kërkesa për cikël", async () => {
    for (let cycle = 1; cycle <= 20; cycle += 1) {
      const models = Array.from({ length: 5 }, (_, index) =>
        createAdapter({
          id: `lifecycle-${cycle}-model-${index + 1}`,
        }),
      );

      const { orchestrator } = createSystem(
        models.map((model) => model.adapter),
      );

      const requests = Array.from({ length: 10 }, (_, index) => {
        const modelIndex = index % models.length;

        return orchestrator.generate({
          modelId: `lifecycle-${cycle}-model-${modelIndex + 1}`,
          prompt: `Cycle ${cycle} request ${index + 1}`,
        });
      });

      const results = await Promise.all(requests);

      expect(results).toHaveLength(10);

      for (const result of results) {
        expect(result.success).toBe(true);
      }

      for (const model of models) {
        const status = orchestrator.getRuntimeStatus(
          model.adapter.id,
        );

        expect(status.state).toBe("ready");
        expect(status.activeGenerations).toBe(0);
      }

      const closeResult = await orchestrator.close();

      expect(closeResult.success).toBe(true);
      expect(closeResult.runtimesClosed).toBe(5);
      expect(closeResult.failures).toHaveLength(0);

      expect(orchestrator.getStatus().activeRuntimes).toBe(0);

      for (const model of models) {
        expect(model.initialize).toHaveBeenCalledTimes(1);
        expect(model.generate).toHaveBeenCalledTimes(2);
        expect(model.close).toHaveBeenCalledTimes(1);
      }
    }
  });
});
