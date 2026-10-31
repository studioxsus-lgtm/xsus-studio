import { describe, it, expect, vi } from "vitest";

import {
  createModelRuntime,
  MODEL_RUNTIME_VERSION,
} from "../../src/runtime/model-runtime.js";

import {
  MODEL_ERROR_CODES,
  MODEL_RUNTIME_STATES,
} from "../../src/runtime/model-contracts.js";

function createImplementation(overrides = {}) {
  return {
    modelId: "test-model",
    initialize: vi.fn(async () => {}),
    generate: vi.fn(async () => ({
      text: "Përgjigje testuese.",
      finishReason: "stop",
    })),
    close: vi.fn(async () => {}),
    ...overrides,
  };
}

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("XSUS AI Core — Model Runtime", () => {
  describe("Konfigurimi", () => {
    it.each([null, [], "invalid", 123])(
      "refuzon konfigurimin e pavlefshëm: %s",
      (options) => {
        expect(() => createModelRuntime(options)).toThrow(
          TypeError,
        );
      },
    );

    it("krijon runtime me konfigurim standard", () => {
      const runtime = createModelRuntime();

      expect(runtime.getState()).toBe(
        MODEL_RUNTIME_STATES.IDLE,
      );

      expect(runtime.getStatus()).toMatchObject({
        version: MODEL_RUNTIME_VERSION,
        modelId: "xsus-local-model",
        state: MODEL_RUNTIME_STATES.IDLE,
        initialized: false,
        available: false,
        activeGenerations: 0,
        lastError: null,
      });
    });

    it("refuzon modelId bosh", () => {
      expect(() =>
        createModelRuntime({ modelId: " " }),
      ).toThrow(TypeError);
    });

    it("refuzon modelId që nuk është string", () => {
      expect(() =>
        createModelRuntime({ modelId: 123 }),
      ).toThrow(TypeError);
    });

    it("refuzon përdorimin e implementation dhe adapter së bashku", () => {
      expect(() =>
        createModelRuntime({
          implementation: createImplementation(),
          adapter: createImplementation(),
        }),
      ).toThrow(TypeError);
    });

    it("refuzon implementim që nuk është objekt", () => {
      expect(() =>
        createModelRuntime({ implementation: "invalid" }),
      ).toThrow(TypeError);
    });

    it("refuzon implementim pa generate()", () => {
      expect(() =>
        createModelRuntime({
          implementation: {},
        }),
      ).toThrow(TypeError);
    });

    it("refuzon initialize që nuk është funksion", () => {
      expect(() =>
        createModelRuntime({
          implementation: {
            generate: vi.fn(),
            initialize: true,
          },
        }),
      ).toThrow(TypeError);
    });

    it("refuzon close që nuk është funksion", () => {
      expect(() =>
        createModelRuntime({
          implementation: {
            generate: vi.fn(),
            close: true,
          },
        }),
      ).toThrow(TypeError);
    });

    it("ekspozon API të pandryshueshme", () => {
      const runtime = createModelRuntime();

      expect(Object.isFrozen(runtime)).toBe(true);
      expect(typeof runtime.initialize).toBe("function");
      expect(typeof runtime.generate).toBe("function");
      expect(typeof runtime.close).toBe("function");
      expect(typeof runtime.getState).toBe("function");
      expect(typeof runtime.getStatus).toBe("function");
    });
  });

  describe("Inicializimi", () => {
    it("inicializon implementimin dhe kalon në READY", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      const status = await runtime.initialize();

      expect(implementation.initialize).toHaveBeenCalledOnce();
      expect(implementation.initialize).toHaveBeenCalledWith({
        modelId: "test-model",
        runtimeVersion: MODEL_RUNTIME_VERSION,
      });

      expect(status.state).toBe(MODEL_RUNTIME_STATES.READY);
      expect(status.initialized).toBe(true);
    });

    it("përdor modelId të implementimit", async () => {
      const implementation = createImplementation({
        modelId: "custom-model",
      });

      const runtime = createModelRuntime({
        modelId: "default-model",
        implementation,
      });

      const status = await runtime.initialize();

      expect(implementation.initialize).toHaveBeenCalledWith({
        modelId: "custom-model",
        runtimeVersion: MODEL_RUNTIME_VERSION,
      });

      expect(status.modelId).toBe("custom-model");
    });

    it("inicializon implementim pa metodën initialize", async () => {
      const implementation = createImplementation({
        initialize: undefined,
      });

      const runtime = createModelRuntime({ implementation });

      const status = await runtime.initialize();

      expect(status.initialized).toBe(true);
    });

    it("nuk inicializon dy herë implementimin", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();
      await runtime.initialize();

      expect(implementation.initialize).toHaveBeenCalledOnce();
    });

    it("bashkon kërkesat e inicializimit paralel", async () => {
      const deferred = createDeferred();

      const implementation = createImplementation({
        initialize: vi.fn(() => deferred.promise),
      });

      const runtime = createModelRuntime({ implementation });

      const first = runtime.initialize();
      const second = runtime.initialize();

      expect(implementation.initialize).toHaveBeenCalledOnce();

      deferred.resolve();

      const [firstStatus, secondStatus] = await Promise.all([
        first,
        second,
      ]);

      expect(firstStatus.state).toBe(MODEL_RUNTIME_STATES.READY);
      expect(secondStatus.state).toBe(MODEL_RUNTIME_STATES.READY);
    });

    it("refuzon inicializimin pa implementim", async () => {
      const runtime = createModelRuntime();

      await expect(runtime.initialize()).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.UNAVAILABLE,
        retryable: true,
      });
    });

    it("regjistron gabimin kur inicializimi dështon", async () => {
      const implementation = createImplementation({
        initialize: vi.fn(async () => {
          throw new Error("Initialization failed");
        }),
      });

      const runtime = createModelRuntime({ implementation });

      await expect(runtime.initialize()).rejects.toThrow(
        "Initialization failed",
      );

      expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.ERROR);

      expect(runtime.getStatus().lastError).toMatchObject({
        success: false,
        error: {
          message: "Initialization failed",
        },
      });
    });

    it("lejon riprovimin pas dështimit të inicializimit", async () => {
      const initialize = vi.fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce(undefined);

      const implementation = createImplementation({
        initialize,
      });

      const runtime = createModelRuntime({ implementation });

      await expect(runtime.initialize()).rejects.toThrow(
        "Temporary failure",
      );

      const status = await runtime.initialize();

      expect(initialize).toHaveBeenCalledTimes(2);
      expect(status.state).toBe(MODEL_RUNTIME_STATES.READY);
      expect(status.lastError).toBeNull();
    });
  });

  describe("Gjenerimi", () => {
    it("refuzon gjenerimin para inicializimit", async () => {
      const runtime = createModelRuntime({
        implementation: createImplementation(),
      });

      await expect(
        runtime.generate({ prompt: "Përshëndetje" }),
      ).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.NOT_INITIALIZED,
      });
    });

    it("gjeneron përgjigje të standardizuar", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const response = await runtime.generate({
        prompt: "Përshëndetje",
        language: "sq",
        requestId: "request-1",
        conversationId: "conversation-1",
      });

      expect(response).toMatchObject({
        success: true,
        text: "Përgjigje testuese.",
        modelId: "test-model",
        language: "sq",
        requestId: "request-1",
        conversationId: "conversation-1",
        finishReason: "stop",
      });

      expect(implementation.generate).toHaveBeenCalledOnce();
    });

    it("kalon kërkesën e standardizuar te implementimi", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await runtime.generate({
        prompt: "Test prompt",
        language: "en",
        parameters: {
          temperature: 0.4,
        },
      });

      const request = implementation.generate.mock.calls[0][0];

      expect(request).toMatchObject({
        prompt: "Test prompt",
        language: "en",
        parameters: {
          temperature: 0.4,
        },
      });

      expect(request.contractVersion).toBeDefined();
      expect(request.timestamp).toBeDefined();
    });

    it("ruan metadata nga përgjigjja e implementimit", async () => {
      const implementation = createImplementation({
        generate: vi.fn(async () => ({
          text: "Përgjigje",
          modelId: "response-model",
          language: "fr",
          metadata: { source: "test" },
          usage: {
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
          },
        })),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const response = await runtime.generate({
        prompt: "Bonjour",
      });

      expect(response).toMatchObject({
        text: "Përgjigje",
        modelId: "response-model",
        language: "fr",
        metadata: { source: "test" },
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
      });
    });

    it("përdor identifikuesit e kërkesës kur mungojnë në përgjigje", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const response = await runtime.generate({
        prompt: "Test",
        requestId: "request-fallback",
        conversationId: "conversation-fallback",
      });

      expect(response.requestId).toBe("request-fallback");
      expect(response.conversationId).toBe("conversation-fallback");
    });

    it("refuzon kërkesën e pavlefshme", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "" }),
      ).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.INVALID_REQUEST,
        retryable: false,
      });

      expect(implementation.generate).not.toHaveBeenCalled();
    });

    it("standardizon gabimet gjatë gjenerimit", async () => {
      const implementation = createImplementation({
        generate: vi.fn(async () => {
          throw new Error("Inference failed");
        }),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "Test" }),
      ).rejects.toMatchObject({
        message: "Inference failed",
        code: MODEL_ERROR_CODES.INFERENCE_FAILED,
        retryable: false,
      });

      expect(runtime.getStatus().lastError.success).toBe(false);
    });

    it("ruan kodin dhe retryable të gabimit origjinal", async () => {
      const implementation = createImplementation({
        generate: vi.fn(async () => {
          const error = new Error("Temporary inference error");
          error.code = MODEL_ERROR_CODES.TIMEOUT;
          error.retryable = true;
          throw error;
        }),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "Test" }),
      ).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.TIMEOUT,
        retryable: true,
      });
    });

    it("refuzon përgjigjen e pavlefshme", async () => {
      const implementation = createImplementation({
        generate: vi.fn(async () => ({
          text: "",
        })),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "Test" }),
      ).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.INVALID_RESPONSE,
      });
    });

    it("mbështet gjenerime paralele", async () => {
      const first = createDeferred();
      const second = createDeferred();

      const generate = vi.fn()
        .mockImplementationOnce(() => first.promise)
        .mockImplementationOnce(() => second.promise);

      const implementation = createImplementation({ generate });
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const firstGeneration = runtime.generate({ prompt: "First" });
      const secondGeneration = runtime.generate({ prompt: "Second" });

      expect(runtime.getStatus().activeGenerations).toBe(2);

      first.resolve({ text: "First response" });
      await firstGeneration;

      expect(runtime.getStatus().activeGenerations).toBe(1);

      second.resolve({ text: "Second response" });
      await secondGeneration;

      expect(runtime.getStatus().activeGenerations).toBe(0);
    });

    it("përditëson numrin e gjenerimeve edhe pas gabimit", async () => {
      const implementation = createImplementation({
        generate: vi.fn(async () => {
          throw new Error("Generation error");
        }),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "Test" }),
      ).rejects.toThrow("Generation error");

      expect(runtime.getStatus().activeGenerations).toBe(0);
    });

    it("pastron lastError pas gjenerimit të suksesshëm", async () => {
      const generate = vi.fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
        .mockResolvedValueOnce({
          text: "Përgjigjja pas rikuperimit.",
          finishReason: "stop",
        });

      const implementation = createImplementation({
        generate,
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "First request" }),
      ).rejects.toThrow("Temporary failure");

      expect(runtime.getStatus().lastError).not.toBeNull();

      const response = await runtime.generate({
        prompt: "Second request",
      });

      expect(response.success).toBe(true);
      expect(response.text).toBe(
        "Përgjigjja pas rikuperimit.",
      );
      expect(runtime.getStatus().lastError).toBeNull();
    });

    it("izolon dështimin e një gjenerimi nga gjenerimi tjetër paralel", async () => {
      const failedGeneration = createDeferred();
      const successfulGeneration = createDeferred();

      const generate = vi.fn()
        .mockImplementationOnce(() => failedGeneration.promise)
        .mockImplementationOnce(() => successfulGeneration.promise);

      const implementation = createImplementation({ generate });
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const first = runtime.generate({
        prompt: "Failing request",
      });

      const second = runtime.generate({
        prompt: "Successful request",
      });

      expect(runtime.getStatus().activeGenerations).toBe(2);

      failedGeneration.reject(
        new Error("Isolated generation failure"),
      );

      await expect(first).rejects.toThrow(
        "Isolated generation failure",
      );

      expect(runtime.getStatus().activeGenerations).toBe(1);

      successfulGeneration.resolve({
        text: "Successful parallel response",
        finishReason: "stop",
      });

      const response = await second;

      expect(response.success).toBe(true);
      expect(response.text).toBe(
        "Successful parallel response",
      );
      expect(runtime.getStatus().activeGenerations).toBe(0);
      expect(runtime.getStatus().lastError).toBeNull();
    });

    it("pastron gjenerimet aktive pas shumë kërkesave të njëpasnjëshme", async () => {
      const generate = vi.fn(async ({ prompt }) => ({
        text: `Response: ${prompt}`,
        finishReason: "stop",
      }));

      const implementation = createImplementation({ generate });
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      for (let index = 0; index < 50; index += 1) {
        const response = await runtime.generate({
          prompt: `Request ${index}`,
        });

        expect(response.success).toBe(true);
        expect(response.text).toBe(`Response: Request ${index}`);

        expect(runtime.getStatus().activeGenerations).toBe(0);
      }

      expect(generate).toHaveBeenCalledTimes(50);

      expect(runtime.getStatus()).toMatchObject({
        state: MODEL_RUNTIME_STATES.READY,
        initialized: true,
        activeGenerations: 0,
        lastError: null,
      });
    });
  });

  describe("Mbyllja", () => {
    it("mbyll runtime-in dhe thërret close të implementimit", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const status = await runtime.close();

      expect(implementation.close).toHaveBeenCalledWith({
        modelId: "test-model",
        runtimeVersion: MODEL_RUNTIME_VERSION,
      });

      expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(status.initialized).toBe(false);
    });

    it("lejon mbylljen pa implementim", async () => {
      const runtime = createModelRuntime();

      const status = await runtime.close();

      expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
    });

    it("nuk thërret close dy herë kur mbyllja është paralele", async () => {
      const deferred = createDeferred();

      const implementation = createImplementation({
        close: vi.fn(() => deferred.promise),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const first = runtime.close();
      const second = runtime.close();

      await vi.waitFor(() => {
        expect(implementation.close).toHaveBeenCalledOnce();
      });

      deferred.resolve();

      const [firstStatus, secondStatus] = await Promise.all([
        first,
        second,
      ]);

      expect(firstStatus.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(secondStatus.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(implementation.close).toHaveBeenCalledOnce();
    });

    it("pret përfundimin e gjenerimeve aktive", async () => {
      const deferred = createDeferred();

      const implementation = createImplementation({
        generate: vi.fn(() => deferred.promise),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const generation = runtime.generate({ prompt: "Test" });
      const closing = runtime.close();

      expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(implementation.close).not.toHaveBeenCalled();

      deferred.resolve({ text: "Përgjigje" });

      await expect(generation).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.NOT_INITIALIZED,
      });

      const status = await closing;

      expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(implementation.close).toHaveBeenCalledOnce();
      expect(status.activeGenerations).toBe(0);
    });

    it("pret përfundimin e të gjitha gjenerimeve paralele para mbylljes", async () => {
      const firstGeneration = createDeferred();
      const secondGeneration = createDeferred();

      const generate = vi.fn()
        .mockImplementationOnce(() => firstGeneration.promise)
        .mockImplementationOnce(() => secondGeneration.promise);

      const implementation = createImplementation({ generate });
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const first = runtime.generate({ prompt: "First request" });
      const second = runtime.generate({ prompt: "Second request" });

      expect(runtime.getStatus().activeGenerations).toBe(2);

      const closing = runtime.close();

      expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(implementation.close).not.toHaveBeenCalled();

      firstGeneration.resolve({ text: "First response" });

      await expect(first).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.NOT_INITIALIZED,
      });

      expect(runtime.getStatus().activeGenerations).toBe(1);
      expect(implementation.close).not.toHaveBeenCalled();

      secondGeneration.resolve({ text: "Second response" });

      await expect(second).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.NOT_INITIALIZED,
      });

      const status = await closing;

      expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(status.activeGenerations).toBe(0);
      expect(implementation.close).toHaveBeenCalledOnce();
    });

    it("ruan gjendjen CLOSED dhe pastron gjenerimet pas mbylljes paralele", async () => {
      const firstGeneration = createDeferred();
      const secondGeneration = createDeferred();

      const generate = vi.fn()
        .mockImplementationOnce(() => firstGeneration.promise)
        .mockImplementationOnce(() => secondGeneration.promise);

      const implementation = createImplementation({ generate });
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const first = runtime.generate({ prompt: "Request A" });
      const second = runtime.generate({ prompt: "Request B" });

      const firstClose = runtime.close();
      const secondClose = runtime.close();

      expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);

      firstGeneration.resolve({ text: "Response A" });
      secondGeneration.resolve({ text: "Response B" });

      const results = await Promise.allSettled([
        first,
        second,
        firstClose,
        secondClose,
      ]);

      expect(results[0]).toMatchObject({
        status: "rejected",
        reason: {
          code: MODEL_ERROR_CODES.NOT_INITIALIZED,
        },
      });

      expect(results[1]).toMatchObject({
        status: "rejected",
        reason: {
          code: MODEL_ERROR_CODES.NOT_INITIALIZED,
        },
      });

      expect(results[2].status).toBe("fulfilled");
      expect(results[3].status).toBe("fulfilled");

      expect(runtime.getStatus()).toMatchObject({
        state: MODEL_RUNTIME_STATES.CLOSED,
        initialized: false,
        activeGenerations: 0,
      });

      expect(implementation.close).toHaveBeenCalledOnce();
    });

    it("pret përfundimin e inicializimit aktiv", async () => {
      const deferred = createDeferred();

      const implementation = createImplementation({
        initialize: vi.fn(() => deferred.promise),
      });

      const runtime = createModelRuntime({ implementation });

      const initialization = runtime.initialize();
      const closing = runtime.close();

      deferred.resolve();

      await expect(initialization).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.NOT_INITIALIZED,
      });

      const status = await closing;

      expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(implementation.close).toHaveBeenCalledOnce();
    });

    it("refuzon inicializimin pas mbylljes", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.close();

      await expect(runtime.initialize()).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.NOT_INITIALIZED,
      });

      expect(implementation.initialize).not.toHaveBeenCalled();
    });

    it("refuzon gjenerimin pas mbylljes", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();
      await runtime.close();

      await expect(
        runtime.generate({ prompt: "Test" }),
      ).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.NOT_INITIALIZED,
      });
    });

    it("standardizon dhe regjistron gabimin kur close dështon", async () => {
      const implementation = createImplementation({
        close: vi.fn(async () => {
          throw new Error("Close failed");
        }),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await expect(runtime.close()).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.INTERNAL_ERROR,
        message: "Close failed",
        retryable: false,
      });

      expect(runtime.getState()).toBe(
        MODEL_RUNTIME_STATES.CLOSED,
      );

      expect(runtime.getStatus().lastError).toMatchObject({
        success: false,
        error: {
          code: MODEL_ERROR_CODES.INTERNAL_ERROR,
          message: "Close failed",
          retryable: false,
        },
      });
    });

    it("ruan gabimin dhe nuk përsërit close pas dështimit", async () => {
      const implementation = createImplementation({
        close: vi.fn(async () => {
          throw new Error("Persistent close failure");
        }),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const firstClose = runtime.close();

      await expect(firstClose).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.INTERNAL_ERROR,
        message: "Persistent close failure",
      });

      const secondClose = runtime.close();

      await expect(secondClose).rejects.toMatchObject({
        code: MODEL_ERROR_CODES.INTERNAL_ERROR,
        message: "Persistent close failure",
      });

      expect(implementation.close).toHaveBeenCalledOnce();

      expect(runtime.getStatus().lastError).toMatchObject({
        success: false,
        error: {
          code: MODEL_ERROR_CODES.INTERNAL_ERROR,
          message: "Persistent close failure",
        },
      });

      expect(runtime.getState()).toBe(
        MODEL_RUNTIME_STATES.CLOSED,
      );
    });

    it("mbyll implementimin edhe kur disa gjenerime aktive dështojnë", async () => {
      const firstGeneration = createDeferred();
      const secondGeneration = createDeferred();

      const generate = vi.fn()
        .mockImplementationOnce(() => firstGeneration.promise)
        .mockImplementationOnce(() => secondGeneration.promise);

      const implementation = createImplementation({
        generate,
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      const first = runtime.generate({
        prompt: "Failing request A",
      });

      const second = runtime.generate({
        prompt: "Failing request B",
      });

      expect(runtime.getStatus().activeGenerations).toBe(2);

      const closing = runtime.close();

      firstGeneration.reject(new Error("Generation failure A"));
      secondGeneration.reject(new Error("Generation failure B"));

      const results = await Promise.allSettled([
        first,
        second,
        closing,
      ]);

      expect(results[0].status).toBe("rejected");
      expect(results[1].status).toBe("rejected");
      expect(results[2].status).toBe("fulfilled");

      expect(runtime.getStatus()).toMatchObject({
        state: MODEL_RUNTIME_STATES.CLOSED,
        initialized: false,
        activeGenerations: 0,
      });

      expect(implementation.close).toHaveBeenCalledOnce();
    });

    it("kthen statusin kur runtime është mbyllur tashmë", async () => {
      const implementation = createImplementation();
      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();
      await runtime.close();

      const status = await runtime.close();

      expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
      expect(implementation.close).toHaveBeenCalledOnce();
    });
  });

  describe("Statusi", () => {
    it("raporton saktë statusin para inicializimit", () => {
      const runtime = createModelRuntime({
        implementation: createImplementation(),
      });

      expect(runtime.getStatus()).toMatchObject({
        state: MODEL_RUNTIME_STATES.IDLE,
        initialized: false,
        available: true,
        activeGenerations: 0,
      });
    });

    it("raporton adapterId kur implementimi ka id", () => {
      const implementation = createImplementation({
        id: "adapter-test",
      });

      const runtime = createModelRuntime({ adapter: implementation });

      expect(runtime.getStatus().adapterId).toBe("adapter-test");
    });

    it("raporton adapterId null kur nuk ekziston", () => {
      const runtime = createModelRuntime({
        implementation: createImplementation(),
      });

      expect(runtime.getStatus().adapterId).toBeNull();
    });

    it("raporton gabimin e fundit pas dështimit", async () => {
      const implementation = createImplementation({
        generate: vi.fn(async () => {
          throw new Error("Last error");
        }),
      });

      const runtime = createModelRuntime({ implementation });

      await runtime.initialize();

      await expect(
        runtime.generate({ prompt: "Test" }),
      ).rejects.toThrow("Last error");

      expect(runtime.getStatus().lastError).toMatchObject({
        success: false,
        error: {
          message: "Last error",
        },
      });
    });
  });
});
