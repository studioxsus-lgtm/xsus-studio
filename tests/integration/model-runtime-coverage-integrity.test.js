import { describe, it, expect, vi } from "vitest";

import {
  createModelRuntime,
  MODEL_RUNTIME_VERSION,
} from "../../src/runtime/model-runtime.js";

import {
  MODEL_ERROR_CODES,
  MODEL_RUNTIME_STATES,
} from "../../src/runtime/model-contracts.js";

function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createImplementation({
  id = "runtime-coverage-adapter",
  modelId = "runtime-coverage-model",
  initialize = vi.fn(async () => ({ success: true })),
  generate = vi.fn(async () => ({ text: "Successful response" })),
  close = vi.fn(async () => ({ success: true })),
} = {}) {
  return {
    id,
    modelId,
    initialize,
    generate,
    close,
  };
}

describe("XSUS AI Core — Model Runtime Coverage Integrity", () => {
  it("normalizon gabimin e gjenerimit dhe ruan kodin e vlefshëm", async () => {
    const implementationError = new Error(
      "Inference temporarily unavailable",
    );

    implementationError.code = MODEL_ERROR_CODES.INFERENCE_FAILED;
    implementationError.retryable = true;

    const implementation = createImplementation({
      generate: vi.fn(async () => {
        throw implementationError;
      }),
    });

    const runtime = createModelRuntime({
      modelId: implementation.modelId,
      implementation,
    });

    await runtime.initialize();

    await expect(
      runtime.generate({
        prompt: "Trigger inference failure",
      }),
    ).rejects.toMatchObject({
      code: MODEL_ERROR_CODES.INFERENCE_FAILED,
      message: "Inference temporarily unavailable",
      retryable: true,
    });

    const status = runtime.getStatus();

    expect(status.state).toBe(MODEL_RUNTIME_STATES.READY);
    expect(status.activeGenerations).toBe(0);
    expect(status.lastError).toMatchObject({
      success: false,
      error: {
        code: MODEL_ERROR_CODES.INFERENCE_FAILED,
        retryable: true,
      },
    });

    await runtime.close();
  });

  it("përdor kodin rezervë për gabime gjenerimi me kod të panjohur", async () => {
    const implementation = createImplementation({
      generate: vi.fn(async () => {
        const error = new Error("Unknown inference error");
        error.code = "UNKNOWN_MODEL_ERROR";
        throw error;
      }),
    });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    await expect(
      runtime.generate({ prompt: "Test fallback code" }),
    ).rejects.toMatchObject({
      code: MODEL_ERROR_CODES.INFERENCE_FAILED,
      message: "Unknown inference error",
    });

    expect(runtime.getStatus().activeGenerations).toBe(0);

    await runtime.close();
  });

  it("përdor mesazhin rezervë kur implementimi hedh gabim pa mesazh", async () => {
    const implementation = createImplementation({
      generate: vi.fn(async () => {
        throw {};
      }),
    });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    await expect(
      runtime.generate({ prompt: "Test fallback message" }),
    ).rejects.toMatchObject({
      code: MODEL_ERROR_CODES.INFERENCE_FAILED,
      message: "Gjenerimi i përgjigjes nga modeli dështoi.",
    });

    expect(runtime.getStatus().activeGenerations).toBe(0);

    await runtime.close();
  });

  it("rikuperon gjendjen pas një gjenerimi të dështuar", async () => {
    const generate = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({
        text: "Recovered response",
      });

    const implementation = createImplementation({ generate });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    await expect(
      runtime.generate({ prompt: "First attempt" }),
    ).rejects.toBeDefined();

    expect(runtime.getStatus().lastError).not.toBeNull();

    const response = await runtime.generate({
      prompt: "Second attempt",
    });

    expect(response.success).toBe(true);
    expect(response.text).toBe("Recovered response");

    expect(runtime.getStatus().lastError).toBeNull();
    expect(runtime.getStatus().activeGenerations).toBe(0);

    await runtime.close();
  });

  it("normalizon gabimin e mbylljes dhe ruan lastError", async () => {
    const closeError = new Error("Implementation close failure");

    closeError.code = MODEL_ERROR_CODES.INTERNAL_ERROR;
    closeError.retryable = true;

    const implementation = createImplementation({
      close: vi.fn(async () => {
        throw closeError;
      }),
    });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    await expect(runtime.close()).rejects.toMatchObject({
      code: MODEL_ERROR_CODES.INTERNAL_ERROR,
      message: "Implementation close failure",
      retryable: true,
    });

    const status = runtime.getStatus();

    expect(status.state).toBe(MODEL_RUNTIME_STATES.CLOSED);
    expect(status.initialized).toBe(false);
    expect(status.lastError).toMatchObject({
      success: false,
      error: {
        code: MODEL_ERROR_CODES.INTERNAL_ERROR,
        message: "Implementation close failure",
        retryable: true,
      },
    });
  });

  it("përdor kodin rezervë për gabime mbylljeje me kod të panjohur", async () => {
    const implementation = createImplementation({
      close: vi.fn(async () => {
        const error = new Error("Unknown close failure");
        error.code = "UNKNOWN_CLOSE_ERROR";
        throw error;
      }),
    });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    await expect(runtime.close()).rejects.toMatchObject({
      code: MODEL_ERROR_CODES.INTERNAL_ERROR,
      message: "Unknown close failure",
    });

    expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
  });

  it("përdor mesazhin rezervë për gabime mbylljeje pa mesazh", async () => {
    const implementation = createImplementation({
      close: vi.fn(async () => {
        throw {};
      }),
    });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    await expect(runtime.close()).rejects.toMatchObject({
      code: MODEL_ERROR_CODES.INTERNAL_ERROR,
      message: "Mbyllja e implementimit të modelit dështoi.",
    });
  });

  it("ruan të njëjtin proces mbylljeje edhe kur mbyllja dështon", async () => {
    const close = vi.fn(async () => {
      throw new Error("Persistent close failure");
    });

    const implementation = createImplementation({ close });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    const firstClose = runtime.close();
    const secondClose = runtime.close();

    expect(firstClose).toBe(secondClose);

    await expect(firstClose).rejects.toBeDefined();

    expect(close).toHaveBeenCalledTimes(1);
    expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
  });

  it("pastron gjenerimet aktive pas dështimit të tyre", async () => {
    const implementation = createImplementation({
      generate: vi.fn(async () => {
        throw new Error("Active generation failure");
      }),
    });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    const results = await Promise.allSettled([
      runtime.generate({ prompt: "Failure one" }),
      runtime.generate({ prompt: "Failure two" }),
      runtime.generate({ prompt: "Failure three" }),
    ]);

    expect(
      results.every((result) => result.status === "rejected"),
    ).toBe(true);

    expect(runtime.getStatus().activeGenerations).toBe(0);

    await runtime.close();
  });

  it("pret përfundimin e gjenerimeve aktive para mbylljes", async () => {
    const generationStarted = createDeferred();
    const finishGeneration = createDeferred();

    const close = vi.fn(async () => ({ success: true }));

    const implementation = createImplementation({
      generate: vi.fn(async () => {
        generationStarted.resolve();

        await finishGeneration.promise;

        return { text: "Completed before close" };
      }),
      close,
    });

    const runtime = createModelRuntime({ implementation });

    await runtime.initialize();

    const generation = runtime.generate({
      prompt: "Active generation",
    });

    await generationStarted.promise;

    const closing = runtime.close();

    expect(runtime.getState()).toBe(MODEL_RUNTIME_STATES.CLOSED);
    expect(close).not.toHaveBeenCalled();

    finishGeneration.resolve();

    await expect(generation).rejects.toBeDefined();
    await closing;

    expect(close).toHaveBeenCalledTimes(1);
    expect(runtime.getStatus().activeGenerations).toBe(0);
  });

  it("ruan versionin dhe identitetin e runtime-it", () => {
    const implementation = createImplementation();

    const runtime = createModelRuntime({
      modelId: implementation.modelId,
      implementation,
    });

    expect(runtime.getStatus()).toMatchObject({
      version: MODEL_RUNTIME_VERSION,
      modelId: implementation.modelId,
      adapterId: implementation.id,
      state: MODEL_RUNTIME_STATES.IDLE,
      initialized: false,
      available: true,
      activeGenerations: 0,
      lastError: null,
    });
  });
});
