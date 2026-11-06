
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAppEngine: vi.fn()
}));

vi.mock("../../apps/app/index.js", () => ({
  createAppEngine: mocks.createAppEngine
}));

describe("XSUS App Bridge", () => {
  let bridgeModule;
  let engine;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    engine = {
      processRequest: vi.fn().mockResolvedValue({
        success: true,
        data: { projectId: "test-project" }
      }),
      getStatus: vi.fn().mockReturnValue({
        status: "ready"
      }),
      close: vi.fn()
    };

    mocks.createAppEngine.mockReturnValue(engine);

    bridgeModule = await import(
      "../../platform/xsus-app/xsus-app-bridge.js"
    );
  });

  it("nuk inicializon Engine para kërkesës së parë", () => {
    const status = bridgeModule.getXsusAppBridgeStatus();

    expect(status.initialized).toBe(false);
    expect(status.connected).toBe(false);
    expect(mocks.createAppEngine).not.toHaveBeenCalled();
  });

  it("inicializon vetëm një instancë të XSUS App Engine", async () => {
    await bridgeModule.processXsusAppRequest({
      prompt: "Create a web application"
    });

    await bridgeModule.processXsusAppRequest({
      prompt: "Create a mobile application"
    });

    expect(mocks.createAppEngine).toHaveBeenCalledTimes(1);
  });

  it("përcjell kërkesën te XSUS App Engine", async () => {
    const request = {
      prompt: "Create a web application"
    };

    const result =
      await bridgeModule.processXsusAppRequest(request);

    expect(engine.processRequest).toHaveBeenCalledWith(request);
    expect(result.success).toBe(true);
  });

  it("refuzon kërkesat me format të pavlefshëm", async () => {
    await expect(
      bridgeModule.processXsusAppRequest(null)
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST"
    });

    expect(mocks.createAppEngine).not.toHaveBeenCalled();
  });

  it("refuzon array si kërkesë", async () => {
    await expect(
      bridgeModule.processXsusAppRequest([])
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST"
    });
  });

  it("raporton statusin e Engine pas inicializimit", async () => {
    await bridgeModule.processXsusAppRequest({
      prompt: "Test project"
    });

    const status = bridgeModule.getXsusAppBridgeStatus();

    expect(status.initialized).toBe(true);
    expect(status.connected).toBe(true);
    expect(status.app).toEqual({
      status: "ready"
    });
  });

  it("mbyll Engine dhe lejon inicializimin e ri", async () => {
    await bridgeModule.processXsusAppRequest({
      prompt: "Test project"
    });

    bridgeModule.closeXsusAppBridge();

    expect(engine.close).toHaveBeenCalledTimes(1);

    const status = bridgeModule.getXsusAppBridgeStatus();

    expect(status.initialized).toBe(false);
    expect(status.connected).toBe(false);
  });

  it("përcjell gabimet e Engine pa i fshehur", async () => {
    const expectedError = new Error("Engine processing failed");

    engine.processRequest.mockRejectedValue(expectedError);

    await expect(
      bridgeModule.processXsusAppRequest({
        prompt: "Test project"
      })
    ).rejects.toBe(expectedError);
  });
});
