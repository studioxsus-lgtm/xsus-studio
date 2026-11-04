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
      expect(APP_ERROR_CODES).toBeDefined();
      expect(APP_ERROR_CODES.INVALID_PROJECT).toBeDefined();
      expect(APP_ERROR_CODES.PROJECT_NOT_FOUND).toBeDefined();
      expect(APP_ERROR_CODES.WORKSPACE_FAILURE).toBeDefined();
      expect(APP_ERROR_CODES.INTEGRATION_FAILURE).toBeDefined();
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
  });

  describe("Contract validation", () => {
    it("rejects an invalid request object", () => {
      expect(isAppRequest(null)).toBe(false);
      expect(isAppRequest({})).toBe(false);
      expect(isAppRequest("invalid")).toBe(false);
    });

    it("rejects an invalid response object", () => {
      expect(isAppResponse(null)).toBe(false);
      expect(isAppResponse({})).toBe(false);
      expect(isAppResponse("invalid")).toBe(false);
    });
  });
});
