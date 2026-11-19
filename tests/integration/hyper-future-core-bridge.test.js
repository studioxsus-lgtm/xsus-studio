import { describe, expect, it, vi } from "vitest";
import {
  createHyperFutureBridge,
  HYPER_FUTURE_BRIDGE_PATH,
  HYPER_FUTURE_BRIDGE_VERSION
} from "../../src/platform/xsus-app/hyper-future-bridge.js";

const AUTHORIZATION = "Bearer user-access-token-123456789";
const USER = { userId: "11111111-1111-4111-8111-111111111111", token: "user-access-token-123456789" };
const input = {
  goal: "Build a safe app plan.",
  steps: [
    { id: "inspect", task: "Inspect requirements", dependsOn: [] },
    { id: "review", task: "Review the proposal", dependsOn: ["inspect"] }
  ]
};

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("Hyper-Future Core bridge", () => {
  it("proofreads through Future, then validates a non-executable Hyper draft", async () => {
    const calls = [];
    const verifyUser = vi.fn(async authorization => {
      expect(authorization).toBe(AUTHORIZATION);
      return USER;
    });
    const fetchImpl = vi.fn(async (url, options) => {
      calls.push({ url, options, payload: JSON.parse(options.body) });
      return jsonResponse(200, {
        language: "en",
        status: "corrected",
        text: "Build a safe app plan.",
        review_required: false,
        persisted: false
      });
    });
    const bridge = createHyperFutureBridge({
      verifyUser,
      fetchImpl,
      makeRequestId: () => "trace-123"
    });

    const response = await bridge.handle({ method: "POST", authorization: AUTHORIZATION, body: input });

    expect(bridge.version).toBe(HYPER_FUTURE_BRIDGE_VERSION);
    expect(bridge.path).toBe(HYPER_FUTURE_BRIDGE_PATH);
    expect(verifyUser).toHaveBeenCalledOnce();
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://future-xsus-core-api.onrender.com/v1/language/proofread");
    expect(calls[0].options.headers.Authorization).toBe(AUTHORIZATION);
    expect(calls[0].payload).toEqual({ text: input.goal, language: "en" });
    expect(response).toEqual({
      status: 200,
      data: {
        bridgeVersion: "1.0.0",
        requestId: "trace-123",
        status: "completed",
        language: { core: "future-xsus-core", status: "corrected", text: "Build a safe app plan." },
        plan: {
          core: "hyper-xsus-core",
          goal: "Build a safe app plan.",
          steps: input.steps,
          state: "draft",
          executable: false,
          dependencyGraphValid: true
        },
        safety: { executable: false, sideEffects: false }
      }
    });
  });

  it("does not call either core when the user is not authorized", async () => {
    const fetchImpl = vi.fn();
    const bridge = createHyperFutureBridge({
      verifyUser: async () => { throw new Error("denied"); },
      fetchImpl
    });
    await expect(bridge.handle({ authorization: AUTHORIZATION, body: input }))
      .resolves.toEqual({ status: 403, data: { error: "Access denied." } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns a non-executable draft with a review warning when Future is uncertain", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, {
      language: "en",
      status: "review_required",
      text: input.goal,
      review_required: true,
      persisted: false
    }));
    const bridge = createHyperFutureBridge({ verifyUser: async () => USER, fetchImpl });
    const response = await bridge.handle({ authorization: AUTHORIZATION, body: input });
    expect(response.status).toBe(200);
    expect(response.data.status).toBe("review_required");
    expect(response.data.language.review_required).toBe(true);
    expect(response.data.plan.goal).toBe(input.goal);
    expect(response.data.plan.steps).toEqual(input.steps);
    expect(response.data.plan.executable).toBe(false);
    expect(response.data.safety).toEqual({ executable: false, sideEffects: false });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects invalid Hyper dependency graphs without exposing engine details", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, {
      language: "en", status: "unchanged", text: input.goal, review_required: false, persisted: false
    }));
    const bridge = createHyperFutureBridge({ verifyUser: async () => USER, fetchImpl });
    const response = await bridge.handle({
      authorization: AUTHORIZATION,
      body: { ...input, steps: [{ id: "inspect", task: "Inspect", dependsOn: ["missing"] }] }
    });
    expect(response).toEqual({
      status: 422,
      data: { error: "Hyper XSUS Core could not validate the supplied plan steps." }
    });
  });

  it("allows only the verified Future service origin", () => {
    expect(() => createHyperFutureBridge({
      verifyUser: async () => USER,
      futureBaseUrl: "https://attacker.example"
    })).toThrow("Only the configured HTTPS Future XSUS Core service is allowed.");
  });
});
