import { describe, expect, it } from "vitest";
import {
  HYPER_APP_CONTRACT_VERSION,
  HYPER_APP_OPERATIONS,
  createHyperApplicationRequest,
  parseHyperApplicationResponse
} from "../../platform/xsus-app/xsus-hyper-application-contract.js";
import { createXsusAppHyperGateway } from "../../platform/xsus-app/xsus-hyper-gateway.js";

const projectId = "22222222-2222-4222-8222-222222222222";

describe("XSUS App Hyper application contract — disabled until server verified", () => {
  it.each(["application.plan", "application.build"])(
    "validates and normalizes a proposed %s request", operation => {
      const request = createHyperApplicationRequest({
        operation, projectId, prompt: "  Build a project dashboard  "
      });
      expect(request).toEqual({
        contractVersion: HYPER_APP_CONTRACT_VERSION,
        operation, projectId, prompt: "Build a project dashboard"
      });
      expect(Object.isFrozen(request)).toBe(true);
    }
  );

  it.each(["application.plan", "application.build"])(
    "validates a matching %s response without exposing arbitrary server fields", operation => {
      const response = parseHyperApplicationResponse({
        ok: true,
        contractVersion: HYPER_APP_CONTRACT_VERSION,
        operation, projectId, requestId: "req_1", status: "accepted",
        privateToken: "never-expose"
      }, { operation, projectId });
      expect(response).toEqual({
        contractVersion: HYPER_APP_CONTRACT_VERSION,
        operation, projectId, requestId: "req_1", status: "accepted"
      });
      expect(response).not.toHaveProperty("privateToken");
    }
  );

  it.each([
    [{ operation: "application.execute", projectId, prompt: "Hello" }, "Unsupported"],
    [{ operation: "application.plan", projectId: "invalid", prompt: "Hello" }, "project ID"],
    [{ operation: "application.plan", projectId, prompt: " " }, "Prompt"],
    [{ operation: "application.build", projectId, prompt: "a".repeat(8001) }, "Prompt"]
  ])("rejects invalid application requests", (input, message) => {
    expect(() => createHyperApplicationRequest(input)).toThrow(message);
  });

  it.each([
    { ok: false, contractVersion: "1.0.0", operation: "application.plan", projectId, requestId: "r", status: "completed" },
    { ok: true, contractVersion: "1.0.0", operation: "application.build", projectId, requestId: "r", status: "completed" },
    { ok: true, contractVersion: "1.0.0", operation: "application.plan", projectId, requestId: "r", status: "unknown" }
  ])("rejects malformed or mismatched Hyper responses", response => {
    expect(() => parseHyperApplicationResponse(response, {
      operation: "application.plan", projectId
    })).toThrow("Invalid Hyper application response.");
  });

  it("keeps both execution operations disabled in the live gateway", async () => {
    expect(HYPER_APP_OPERATIONS).toEqual(["application.plan", "application.build"]);
    const gateway = createXsusAppHyperGateway({
      verifyEvidence: async () => ({ ok: true, verified: true })
    });
    for (const operation of HYPER_APP_OPERATIONS) {
      await expect(gateway.execute(operation, {
        projectId, prompt: "Build an app"
      })).rejects.toThrow("not verified");
    }
  });
});
