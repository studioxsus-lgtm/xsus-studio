import { describe, it, expect } from "vitest";

import {
  MODEL_CONTRACTS_VERSION,
  MODEL_ERROR_CODES,
  MODEL_RUNTIME_STATES,
  createModelRequest,
  createModelResponse,
  createModelError,
} from "../../src/runtime/model-contracts.js";

describe("XSUS AI Core — Model Contracts", () => {
  describe("Constants and versions", () => {
    it("ekspozon versionin e saktë", () => {
      expect(MODEL_CONTRACTS_VERSION).toBe("1.0.0");
    });

    it("ekspozon kodet standarde të gabimeve", () => {
      expect(MODEL_ERROR_CODES).toEqual({
        INVALID_REQUEST: "MODEL_INVALID_REQUEST",
        INVALID_RESPONSE: "MODEL_INVALID_RESPONSE",
        NOT_INITIALIZED: "MODEL_NOT_INITIALIZED",
        UNAVAILABLE: "MODEL_UNAVAILABLE",
        TIMEOUT: "MODEL_TIMEOUT",
        ABORTED: "MODEL_ABORTED",
        INFERENCE_FAILED: "MODEL_INFERENCE_FAILED",
        INTERNAL_ERROR: "MODEL_INTERNAL_ERROR",
      });
    });

    it("ekspozon gjendjet standarde të runtime", () => {
      expect(MODEL_RUNTIME_STATES).toEqual({
        IDLE: "idle",
        INITIALIZING: "initializing",
        READY: "ready",
        RUNNING: "running",
        ERROR: "error",
        CLOSED: "closed",
      });
    });

    it("mbron konstantet nga ndryshimi", () => {
      expect(Object.isFrozen(MODEL_ERROR_CODES)).toBe(true);
      expect(Object.isFrozen(MODEL_RUNTIME_STATES)).toBe(true);
    });
  });

  describe("createModelRequest", () => {
    it("krijon një kërkesë standarde", () => {
      const request = createModelRequest({
        prompt: "Hello XSUS AI",
      });

      expect(request).toMatchObject({
        requestId: null,
        conversationId: null,
        prompt: "Hello XSUS AI",
        systemPrompt: null,
        language: "auto",
        modelId: null,
        context: {},
        metadata: {},
        parameters: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
        contractVersion: "1.0.0",
      });

      expect(Number.isNaN(Date.parse(request.timestamp))).toBe(false);
    });

    it("normalizon tekstet dhe gjuhën", () => {
      const request = createModelRequest({
        prompt: "  Përshëndetje XSUS  ",
        systemPrompt: "  You are XSUS AI  ",
        language: " SQ ",
        modelId: "  xsus-local  ",
        requestId: "  request-1  ",
        conversationId: "  conversation-1  ",
      });

      expect(request.prompt).toBe("Përshëndetje XSUS");
      expect(request.systemPrompt).toBe("You are XSUS AI");
      expect(request.language).toBe("sq");
      expect(request.modelId).toBe("xsus-local");
      expect(request.requestId).toBe("request-1");
      expect(request.conversationId).toBe("conversation-1");
    });

    it("pranon parametra personalizimi", () => {
      const request = createModelRequest({
        prompt: "Test",
        parameters: {
          temperature: 1.2,
          maxOutputTokens: 4096,
          topP: 0.9,
        },
      });

      expect(request.parameters).toEqual({
        temperature: 1.2,
        maxOutputTokens: 4096,
        topP: 0.9,
      });
    });

    it("ruan kontekstin dhe metadata në objekte të ndara", () => {
      const context = { topic: "AI" };
      const metadata = { source: "test" };
      const parameters = { temperature: 0.5 };

      const request = createModelRequest({
        prompt: "Test",
        context,
        metadata,
        parameters,
      });

      expect(request.context).toEqual(context);
      expect(request.metadata).toEqual(metadata);
      expect(request.parameters.temperature).toBe(0.5);

      expect(request.context).not.toBe(context);
      expect(request.metadata).not.toBe(metadata);
      expect(request.parameters).not.toBe(parameters);
    });

    it("pranon objekte me prototype null", () => {
      const context = Object.create(null);
      context.source = "local";

      const request = createModelRequest({
        prompt: "Test",
        context,
      });

      expect(request.context).toEqual({ source: "local" });
    });

    it.each([
      null,
      "invalid",
      123,
      [],
    ])("refuzon kërkesën e pavlefshme: %s", (input) => {
      expect(() => createModelRequest(input)).toThrow(TypeError);
    });

    it("refuzon prompt bosh", () => {
      expect(() => createModelRequest({
        prompt: "",
      })).toThrow(TypeError);
    });

    it("refuzon prompt që përmban vetëm hapësira", () => {
      expect(() => createModelRequest({
        prompt: "   ",
      })).toThrow(TypeError);
    });

    it("refuzon prompt që tejkalon 32000 karaktere", () => {
      expect(() => createModelRequest({
        prompt: "a".repeat(32001),
      })).toThrow(RangeError);
    });

    it("pranon prompt me saktësisht 32000 karaktere", () => {
      const request = createModelRequest({
        prompt: "a".repeat(32000),
      });

      expect(request.prompt).toHaveLength(32000);
    });

    it("refuzon systemPrompt bosh", () => {
      expect(() => createModelRequest({
        prompt: "Test",
        systemPrompt: " ",
      })).toThrow(TypeError);
    });

    it("refuzon systemPrompt tepër të gjatë", () => {
      expect(() => createModelRequest({
        prompt: "Test",
        systemPrompt: "a".repeat(32001),
      })).toThrow(RangeError);
    });

    it("refuzon language bosh", () => {
      expect(() => createModelRequest({
        prompt: "Test",
        language: " ",
      })).toThrow(TypeError);
    });

    it("refuzon language më të gjatë se 35 karaktere", () => {
      expect(() => createModelRequest({
        prompt: "Test",
        language: "a".repeat(36),
      })).toThrow(RangeError);
    });

    it.each([
      0,
      2,
      0.7,
    ])("pranon temperature të vlefshme: %s", (temperature) => {
      const request = createModelRequest({
        prompt: "Test",
        parameters: { temperature },
      });

      expect(request.parameters.temperature).toBe(temperature);
    });

    it.each([
      -0.1,
      2.1,
      NaN,
      Infinity,
      "0.7",
      null,
    ])("refuzon temperature të pavlefshme: %s", (temperature) => {
      expect(() => createModelRequest({
        prompt: "Test",
        parameters: { temperature },
      })).toThrow(RangeError);
    });

    it.each([
      1,
      2048,
      32768,
    ])("pranon maxOutputTokens të vlefshëm: %s", (maxOutputTokens) => {
      const request = createModelRequest({
        prompt: "Test",
        parameters: { maxOutputTokens },
      });

      expect(request.parameters.maxOutputTokens).toBe(maxOutputTokens);
    });

    it.each([
      0,
      -1,
      32769,
      1.5,
      NaN,
      Infinity,
      "2048",
      null,
    ])("refuzon maxOutputTokens të pavlefshëm: %s", (maxOutputTokens) => {
      expect(() => createModelRequest({
        prompt: "Test",
        parameters: { maxOutputTokens },
      })).toThrow(RangeError);
    });

    it("refuzon context jo objekt", () => {
      expect(() => createModelRequest({
        prompt: "Test",
        context: [],
      })).toThrow(TypeError);
    });

    it("refuzon metadata jo objekt", () => {
      expect(() => createModelRequest({
        prompt: "Test",
        metadata: "invalid",
      })).toThrow(TypeError);
    });

    it("refuzon parameters jo objekt", () => {
      expect(() => createModelRequest({
        prompt: "Test",
        parameters: [],
      })).toThrow(TypeError);
    });

    it("refuzon ID jo të vlefshme", () => {
      expect(() => createModelRequest({
        prompt: "Test",
        requestId: " ",
      })).toThrow(TypeError);

      expect(() => createModelRequest({
        prompt: "Test",
        conversationId: 123,
      })).toThrow(TypeError);

      expect(() => createModelRequest({
        prompt: "Test",
        modelId: "",
      })).toThrow(TypeError);
    });

    it("krijon timestamp të vlefshëm ISO", () => {
      const request = createModelRequest({
        prompt: "Test",
      });

      expect(new Date(request.timestamp).toISOString())
        .toBe(request.timestamp);
    });
  });

  describe("createModelResponse", () => {
    it("krijon një përgjigje standarde", () => {
      const response = createModelResponse({
        text: "Përgjigjja e XSUS AI",
        modelId: "xsus-local",
      });

      expect(response).toMatchObject({
        success: true,
        requestId: null,
        conversationId: null,
        text: "Përgjigjja e XSUS AI",
        modelId: "xsus-local",
        language: "auto",
        finishReason: "stop",
        usage: {},
        metadata: {},
        contractVersion: "1.0.0",
      });

      expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
    });

    it("normalizon fushat e përgjigjes", () => {
      const response = createModelResponse({
        requestId: " request-1 ",
        conversationId: " conversation-1 ",
        text: "  Hello  ",
        modelId: "  xsus-model  ",
        language: " SQ ",
        finishReason: " stop ",
      });

      expect(response.requestId).toBe("request-1");
      expect(response.conversationId).toBe("conversation-1");
      expect(response.text).toBe("Hello");
      expect(response.modelId).toBe("xsus-model");
      expect(response.language).toBe("sq");
      expect(response.finishReason).toBe("stop");
    });

    it("pranon usage dhe metadata", () => {
      const response = createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
        },
        metadata: {
          provider: "local",
        },
      });

      expect(response.usage).toEqual({
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      });

      expect(response.metadata).toEqual({
        provider: "local",
      });
    });

    it.each([
      "inputTokens",
      "outputTokens",
      "totalTokens",
    ])("refuzon vlera negative ose jo të plota për %s", (field) => {
      expect(() => createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        usage: { [field]: -1 },
      })).toThrow(RangeError);

      expect(() => createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        usage: { [field]: 1.5 },
      })).toThrow(RangeError);
    });

    it("pranon vlera zero për usage", () => {
      const response = createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      });

      expect(response.usage.totalTokens).toBe(0);
    });

    it.each([
      null,
      "invalid",
      123,
      [],
    ])("refuzon përgjigjen jo objekt: %s", (input) => {
      expect(() => createModelResponse(input)).toThrow(TypeError);
    });

    it("refuzon text bosh", () => {
      expect(() => createModelResponse({
        text: " ",
        modelId: "xsus-local",
      })).toThrow(TypeError);
    });

    it("refuzon modelId bosh", () => {
      expect(() => createModelResponse({
        text: "Test",
        modelId: " ",
      })).toThrow(TypeError);
    });

    it("refuzon text tepër të gjatë", () => {
      expect(() => createModelResponse({
        text: "a".repeat(128001),
        modelId: "xsus-local",
      })).toThrow(RangeError);
    });

    it("refuzon finishReason bosh ose jo tekst", () => {
      expect(() => createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        finishReason: " ",
      })).toThrow(TypeError);

      expect(() => createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        finishReason: 123,
      })).toThrow(TypeError);
    });

    it("refuzon usage jo objekt", () => {
      expect(() => createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        usage: [],
      })).toThrow(TypeError);
    });

    it("refuzon metadata jo objekt", () => {
      expect(() => createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        metadata: "invalid",
      })).toThrow(TypeError);
    });

    it("refuzon ID jo të vlefshme", () => {
      expect(() => createModelResponse({
        text: "Test",
        modelId: "xsus-local",
        requestId: " ",
      })).toThrow(TypeError);
    });
  });

  describe("createModelError", () => {
    it("krijon një gabim standard", () => {
      const result = createModelError();

      expect(result).toMatchObject({
        success: false,
        requestId: null,
        error: {
          code: MODEL_ERROR_CODES.INTERNAL_ERROR,
          message: "Ndodhi një gabim gjatë ekzekutimit të modelit.",
          retryable: false,
        },
        metadata: {},
        contractVersion: "1.0.0",
      });

      expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    });

    it("krijon një gabim të personalizuar", () => {
      const result = createModelError({
        requestId: "request-1",
        code: MODEL_ERROR_CODES.TIMEOUT,
        message: "Model timeout",
        retryable: true,
        metadata: {
          modelId: "xsus-local",
        },
      });

      expect(result).toMatchObject({
        success: false,
        requestId: "request-1",
        error: {
          code: MODEL_ERROR_CODES.TIMEOUT,
          message: "Model timeout",
          retryable: true,
        },
        metadata: {
          modelId: "xsus-local",
        },
      });
    });

    it("zëvendëson kodet e panjohura me INTERNAL_ERROR", () => {
      const result = createModelError({
        code: "UNKNOWN_ERROR",
      });

      expect(result.error.code)
        .toBe(MODEL_ERROR_CODES.INTERNAL_ERROR);
    });

    it("pranon të gjitha kodet standarde", () => {
      for (const code of Object.values(MODEL_ERROR_CODES)) {
        const result = createModelError({ code });

        expect(result.error.code).toBe(code);
      }
    });

    it("refuzon retryable jo boolean", () => {
      expect(() => createModelError({
        retryable: "true",
      })).toThrow(TypeError);
    });

    it("refuzon message bosh", () => {
      expect(() => createModelError({
        message: " ",
      })).toThrow(TypeError);
    });

    it("refuzon message jo tekst", () => {
      expect(() => createModelError({
        message: 123,
      })).toThrow(TypeError);
    });

    it("refuzon metadata jo objekt", () => {
      expect(() => createModelError({
        metadata: [],
      })).toThrow(TypeError);
    });

    it("refuzon requestId jo të vlefshëm", () => {
      expect(() => createModelError({
        requestId: " ",
      })).toThrow(TypeError);
    });

    it.each([
      null,
      "invalid",
      123,
      [],
    ])("refuzon input jo objekt: %s", (input) => {
      expect(() => createModelError(input)).toThrow(TypeError);
    });
  });
});
