import { describe, it, expect } from "vitest";

import {
  XSUS_APP_CONTRACT_VERSION,
  APP_REQUEST_TYPES,
  APP_PLATFORMS,
  APP_ERROR_CODES,
  createAppRequest,
  createAppResponse,
  isAppRequest,
  isAppResponse,
} from "../../apps/app/contracts/app-contracts.js";

describe("XSUS App Contracts", () => {
  describe("Contract definitions", () => {
    it("exposes a valid contract version", () => {
      expect(XSUS_APP_CONTRACT_VERSION).toBe("1.1.0");
    });

    it("defines supported request types", () => {
      expect(APP_REQUEST_TYPES).toEqual(
        expect.arrayContaining([
          "architecture",
          "code-generation",
          "frontend",
          "backend",
          "database",
          "api",
          "debugging",
          "testing",
          "export",
        ])
      );
    });

    it("defines supported platforms", () => {
      expect(APP_PLATFORMS).toEqual([
        "web",
        "android",
        "ios",
        "desktop",
      ]);
    });

    it("defines application error codes", () => {
      expect(Array.isArray(APP_ERROR_CODES)).toBe(true);

      expect(APP_ERROR_CODES).toEqual(
        expect.arrayContaining([
          "INVALID_REQUEST",
          "PROMPT_TOO_LONG",
          "UNSUPPORTED_PLATFORM",
          "ARCHITECT_NOT_CONFIGURED",
          "ARCHITECTURE_FAILED",
          "APP_ENGINE_FAILURE",
          "GENERATION_FAILED",
          "VALIDATION_FAILED",
          "EXPORT_FAILED",
          "INVALID_PROJECT",
          "PROJECT_NOT_FOUND",
          "WORKSPACE_FAILURE",
          "INTEGRATION_FAILURE",
        ])
      );
    });

    it("exposes immutable contract definitions", () => {
      expect(Object.isFrozen(APP_REQUEST_TYPES)).toBe(true);
      expect(Object.isFrozen(APP_PLATFORMS)).toBe(true);
      expect(Object.isFrozen(APP_ERROR_CODES)).toBe(true);
    });
  });

  describe("Request contract", () => {
    it("creates a valid architecture request", () => {
      const request = createAppRequest({
        type: "architecture",
        prompt: "Create a web application",
        platform: "web",
        language: "en",
      });

      expect(isAppRequest(request)).toBe(true);
      expect(request.type).toBe("architecture");
      expect(request.platform).toBe("web");
      expect(request.prompt).toBe("Create a web application");
    });

    it("creates a valid request for Android", () => {
      const request = createAppRequest({
        type: "code-generation",
        prompt: "Create an Android application",
        platform: "android",
        language: "en",
      });

      expect(isAppRequest(request)).toBe(true);
      expect(request.platform).toBe("android");
    });

    it("uses default request values", () => {
      const request = createAppRequest({
        type: "architecture",
        prompt: "Create an application",
      });

      expect(request.platform).toBe("web");
      expect(request.language).toBe("auto");
      expect(request.projectId).toBeNull();
      expect(request.requirements).toEqual([]);
    });

    it("normalizes prompt and language whitespace", () => {
      const request = createAppRequest({
        type: "architecture",
        prompt: "  Create an application  ",
        platform: "web",
        language: " en ",
      });

      expect(request.prompt).toBe("Create an application");
      expect(request.language).toBe("en");
    });

    it("rejects an unsupported request type", () => {
      expect(() =>
        createAppRequest({
          type: "unsupported",
          prompt: "Test",
          platform: "web",
          language: "en",
        })
      ).toThrow();
    });

    it("rejects an unsupported platform", () => {
      expect(() =>
        createAppRequest({
          type: "architecture",
          prompt: "Test",
          platform: "unsupported",
          language: "en",
        })
      ).toThrow();
    });

    it("rejects an empty prompt", () => {
      expect(() =>
        createAppRequest({
          type: "architecture",
          prompt: "",
          platform: "web",
          language: "en",
        })
      ).toThrow();
    });

    it("rejects a whitespace-only prompt", () => {
      expect(() =>
        createAppRequest({
          type: "architecture",
          prompt: "   ",
          platform: "web",
          language: "en",
        })
      ).toThrow();
    });

    it("rejects an invalid language", () => {
      expect(() =>
        createAppRequest({
          type: "architecture",
          prompt: "Test",
          platform: "web",
          language: "",
        })
      ).toThrow();
    });

    it("rejects an invalid project identifier", () => {
      expect(() =>
        createAppRequest({
          type: "architecture",
          prompt: "Test",
          platform: "web",
          language: "en",
          projectId: "",
        })
      ).toThrow();
    });

    it("rejects an invalid requirements value", () => {
      expect(() =>
        createAppRequest({
          type: "architecture",
          prompt: "Test",
          platform: "web",
          language: "en",
          requirements: "not-an-array",
        })
      ).toThrow();
    });

    it("creates an immutable request", () => {
      const request = createAppRequest({
        type: "architecture",
        prompt: "Create an application",
        requirements: ["authentication"],
      });

      expect(Object.isFrozen(request)).toBe(true);
      expect(Object.isFrozen(request.requirements)).toBe(true);
    });
  });

  describe("Response contract", () => {
    it("creates a valid successful response", () => {
      const response = createAppResponse({
        success: true,
        requestId: "request-001",
        projectId: "project-001",
        data: {
          status: "created",
        },
      });

      expect(isAppResponse(response)).toBe(true);
      expect(response.success).toBe(true);
      expect(response.requestId).toBe("request-001");
    });

    it("creates a valid failure response", () => {
      const response = createAppResponse({
        success: false,
        requestId: "request-002",
        error: {
          code: "TEST_ERROR",
          message: "Test failure",
        },
      });

      expect(isAppResponse(response)).toBe(true);
      expect(response.success).toBe(false);
      expect(response.error.message).toBe("Test failure");
    });

    it("accepts a non-empty string as an error", () => {
      const response = createAppResponse({
        success: false,
        error: "Application failed",
      });

      expect(isAppResponse(response)).toBe(true);
      expect(response.error).toBe("Application failed");
    });

    it("rejects a response without a boolean success value", () => {
      expect(() =>
        createAppResponse({
          success: "yes",
        })
      ).toThrow();
    });

    it("rejects a failed response without an error", () => {
      expect(() =>
        createAppResponse({
          success: false,
          requestId: "request-003",
          error: null,
        })
      ).toThrow();
    });

    it("rejects an invalid error object", () => {
      expect(() =>
        createAppResponse({
          success: false,
          error: {
            message: "",
          },
        })
      ).toThrow();
    });

    it("rejects a successful response containing an error", () => {
      expect(() =>
        createAppResponse({
          success: true,
          error: {
            message: "Unexpected error",
          },
        })
      ).toThrow();
    });

    it("rejects an invalid request identifier", () => {
      expect(() =>
        createAppResponse({
          success: true,
          requestId: "",
        })
      ).toThrow();
    });

    it("rejects an invalid project identifier", () => {
      expect(() =>
        createAppResponse({
          success: true,
          projectId: "",
        })
      ).toThrow();
    });

    it("creates an immutable response", () => {
      const response = createAppResponse({
        success: true,
        data: {
          status: "created",
        },
      });

      expect(Object.isFrozen(response)).toBe(true);
    });
  });

  describe("Contract validation", () => {
    it("accepts a valid request", () => {
      const request = createAppRequest({
        type: "architecture",
        prompt: "Create a web application",
      });

      expect(isAppRequest(request)).toBe(true);
    });

    it("rejects an invalid request object", () => {
      expect(isAppRequest(null)).toBe(false);
      expect(isAppRequest({})).toBe(false);
      expect(isAppRequest("invalid")).toBe(false);
      expect(isAppRequest([])).toBe(false);
    });

    it("rejects a request with an incorrect contract version", () => {
      const request = createAppRequest({
        type: "architecture",
        prompt: "Test",
      });

      expect(
        isAppRequest({
          ...request,
          contractVersion: "invalid",
        })
      ).toBe(false);
    });

    it("accepts a valid successful response", () => {
      const response = createAppResponse({
        success: true,
        requestId: "request-001",
      });

      expect(isAppResponse(response)).toBe(true);
    });

    it("accepts a valid failure response", () => {
      const response = createAppResponse({
        success: false,
        error: "Test failure",
      });

      expect(isAppResponse(response)).toBe(true);
    });

    it("rejects an invalid response object", () => {
      expect(isAppResponse(null)).toBe(false);
      expect(isAppResponse({})).toBe(false);
      expect(isAppResponse("invalid")).toBe(false);
      expect(isAppResponse([])).toBe(false);
    });

    it("rejects a response with an incorrect contract version", () => {
      const response = createAppResponse({
        success: true,
      });

      expect(
        isAppResponse({
          ...response,
          contractVersion: "invalid",
        })
      ).toBe(false);
    });
  });
});
