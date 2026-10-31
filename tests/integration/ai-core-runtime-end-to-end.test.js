import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import {
  processAIRequest,
  configureAICoreModelOrchestrator,
} from "../../src/core/ai-core.js";

import {
  createModelAdapter,
} from "../../src/runtime/model-adapter.js";

import {
  createModelOrchestrator,
  MODEL_ORCHESTRATOR_ERRORS,
} from "../../src/runtime/model-orchestrator.js";

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createTestEnvironment(options = {}) {
  const {
    generate,
    initialize,
    close,
    modelId = "xsus-e2e-model",
  } = options;

  const adapter = createModelAdapter({
    id: "xsus-e2e-adapter",
    type: "custom",
    modelId,

    initialize:
      initialize ??
      vi.fn(async () => ({
        success: true,
        initialized: true,
      })),

    generate:
      generate ??
      vi.fn(async () => ({
        text: "Përgjigje nga modeli real i testuar.",
        finishReason: "stop",
        usage: {
          inputTokens: 20,
          outputTokens: 12,
          totalTokens: 32,
        },
        metadata: {
          provider: "xsus-e2e-test",
        },
      })),

    close:
      close ??
      vi.fn(async () => ({
        success: true,
        closed: true,
      })),
  });

  const registry = {
    get: vi.fn((id) =>
      id === modelId ? adapter : null,
    ),

    list: vi.fn(() => [adapter]),
  };

  const selector = {
    select: vi.fn((input = {}) => {
      if (
        input.modelId &&
        input.modelId !== modelId
      ) {
        throw new Error(
          "Modeli i kërkuar nuk u gjet.",
        );
      }

      return adapter;
    }),
  };

  const orchestrator = createModelOrchestrator({
    registry,
    selector,
    defaultModelId: modelId,
  });

  configureAICoreModelOrchestrator(orchestrator);

  return {
    adapter,
    registry,
    selector,
    orchestrator,
  };
}

describe(
  "XSUS AI Core — Runtime End-to-End Integration",
  () => {
    beforeEach(() => {
      configureAICoreModelOrchestrator(null);
    });

    afterEach(() => {
      configureAICoreModelOrchestrator(null);
    });

    test(
      "përpunon kërkesën nga AI Core deri te Model Adapter",
      async () => {
        const generate = vi.fn(async () => ({
          text: "Përgjigjja u krijua nga Model Adapter.",
          finishReason: "stop",
          metadata: {
            provider: "xsus-e2e-test",
          },
        }));

        const environment = createTestEnvironment({
          generate,
        });

        const result = await processAIRequest({
          query: "Shpjego arkitekturën e XSUS AI.",
          language: "sq",
          modelId: "xsus-e2e-model",
        });

        expect(result.error).toBeUndefined();

        expect(result.answer).toBe(
          "Përgjigjja u krijua nga Model Adapter.",
        );

        expect(generate).toHaveBeenCalledTimes(1);

        expect(environment.adapter.modelId).toBe(
          "xsus-e2e-model",
        );

        expect(
          environment.orchestrator.getRuntimeStatus(
            "xsus-e2e-adapter",
          ).initialized,
        ).toBe(true);
      },
    );

    test(
      "inicializon adapter-in vetëm një herë për kërkesa të njëpasnjëshme",
      async () => {
        const initialize = vi.fn(async () => ({
          success: true,
        }));

        const generate = vi.fn(async () => ({
          text: "Përgjigje e vlefshme.",
        }));

        createTestEnvironment({
          initialize,
          generate,
        });

        const first = await processAIRequest({
          query: "Pyetja e parë",
          language: "sq",
          modelId: "xsus-e2e-model",
        });

        const second = await processAIRequest({
          query: "Pyetja e dytë",
          language: "sq",
          modelId: "xsus-e2e-model",
        });

        expect(first.error).toBeUndefined();
        expect(second.error).toBeUndefined();

        expect(initialize).toHaveBeenCalledTimes(1);
        expect(generate).toHaveBeenCalledTimes(2);
      },
    );

    test(
      "përcjell dështimin e inicializimit pa ekzekutuar gjenerimin",
      async () => {
        const initialize = vi.fn(async () => {
          throw new Error("Initialization failed.");
        });

        const generate = vi.fn(async () => ({
          text: "Nuk duhet të ekzekutohet.",
        }));

        createTestEnvironment({
          initialize,
          generate,
        });

        const result = await processAIRequest({
          query: "Test i inicializimit",
          language: "sq",
          modelId: "xsus-e2e-model",
        });

        expect(result.error).toBeTruthy();
        expect(generate).not.toHaveBeenCalled();
      },
    );

    test(
      "trajton dështimin e gjenerimit dhe lejon kërkesa të mëvonshme",
      async () => {
        const generate = vi
          .fn()
          .mockRejectedValueOnce(
            new Error("Inference failed."),
          )
          .mockResolvedValueOnce({
            text: "Gjenerimi i dytë përfundoi me sukses.",
          });

        createTestEnvironment({
          generate,
        });

        const failedResult = await processAIRequest({
          query: "Kërkesa e parë",
          language: "sq",
          modelId: "xsus-e2e-model",
        });

        expect(failedResult.error).toBeTruthy();

        const successfulResult = await processAIRequest({
          query: "Kërkesa e dytë",
          language: "sq",
          modelId: "xsus-e2e-model",
        });

        expect(
          successfulResult.error,
        ).toBeUndefined();

        expect(successfulResult.answer).toBe(
          "Gjenerimi i dytë përfundoi me sukses.",
        );

        expect(generate).toHaveBeenCalledTimes(2);
      },
    );

    test(
      "pret përfundimin e gjenerimit aktiv gjatë mbylljes",
      async () => {
        const generation = createDeferred();

        const close = vi.fn(async () => ({
          success: true,
          closed: true,
        }));

        const generate = vi.fn(
          () => generation.promise,
        );

        const environment = createTestEnvironment({
          generate,
          close,
        });

        const requestPromise = processAIRequest({
          query: "Kërkesë gjatë mbylljes",
          language: "sq",
          modelId: "xsus-e2e-model",
        });

        while (generate.mock.calls.length === 0) {
          await Promise.resolve();
        }

        const closePromise =
          environment.orchestrator.close();

        expect(close).not.toHaveBeenCalled();

        generation.resolve({
          text: "Gjenerimi përfundoi para mbylljes.",
        });

        const result = await requestPromise;
        const closeResult = await closePromise;

        expect(result.error).toBe(
          "Ndodhi një gabim gjatë përpunimit të kërkesës. Provo përsëri.",
        );

        expect(closeResult.closed).toBe(true);
        expect(close).toHaveBeenCalledTimes(1);

        expect(
          environment.orchestrator.getStatus().closed,
        ).toBe(true);
      },
    );

    test(
      "nuk pranon kërkesa të reja pas mbylljes së Orchestrator",
      async () => {
        const environment = createTestEnvironment();

        await environment.orchestrator.close();

        await expect(
          environment.orchestrator.generate({
            prompt: "Kërkesë pas mbylljes",
            modelId: "xsus-e2e-model",
          }),
        ).rejects.toMatchObject({
          code: MODEL_ORCHESTRATOR_ERRORS.CLOSED,
        });
      },
    );

    test(
      "mbyll adapter-in dhe pastron runtime-et aktive",
      async () => {
        const close = vi.fn(async () => ({
          success: true,
          closed: true,
        }));

        const environment = createTestEnvironment({
          close,
        });

        await environment.orchestrator.generate({
          prompt: "Inicializo runtime",
          modelId: "xsus-e2e-model",
        });

        expect(
          environment.orchestrator.getStatus()
            .activeRuntimes,
        ).toBe(1);

        const result =
          await environment.orchestrator.close();

        expect(result.success).toBe(true);
        expect(result.runtimesClosed).toBe(1);
        expect(close).toHaveBeenCalledTimes(1);

        expect(
          environment.orchestrator.getStatus()
            .activeRuntimes,
        ).toBe(0);
      },
    );
  },
);
