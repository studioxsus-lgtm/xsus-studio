
import { describe, expect, it } from "vitest";

import {
  createAppEngine,
  XSUS_APP_ENGINE_VERSION,
  APP_ENGINE_CAPABILITIES,
  createXsusAICoreAdapter,
  XSUS_AI_CORE_ADAPTER_VERSION,
  XSUS_AI_CORE_ADAPTER_ERROR_CODES,
  createHyperXsusCoreAdapter,
  HYPER_XSUS_APP_ADAPTER_VERSION,
  HYPER_XSUS_APP_ERROR_CODES,
  getHyperXsusCoreAdapterCapabilities,
  createAppIntelligence,
  APP_INTELLIGENCE_VERSION,
  XSUS_APP_PRODUCT
} from "../../apps/app/index.js";

describe("XSUS App Public API", () => {
  it("ekspozon versionin e XSUS App Engine", () => {
    expect(XSUS_APP_ENGINE_VERSION).toBe("1.5.0");
    expect(typeof createAppEngine).toBe("function");
    expect(APP_ENGINE_CAPABILITIES).toBeDefined();
  });

  it("ekspozon XSUS AI Core Adapter", () => {
    expect(typeof createXsusAICoreAdapter).toBe("function");
    expect(XSUS_AI_CORE_ADAPTER_VERSION).toBe("1.0.0");

    expect(XSUS_AI_CORE_ADAPTER_ERROR_CODES).toMatchObject({
      INVALID_INPUT: "INVALID_INPUT",
      INVALID_CORE: "INVALID_CORE",
      CORE_ERROR: "CORE_ERROR"
    });
  });

  it("ekspozon Hyper XSUS Core Adapter", () => {
    expect(typeof createHyperXsusCoreAdapter).toBe("function");
    expect(HYPER_XSUS_APP_ADAPTER_VERSION).toBe("1.0.0");

    expect(HYPER_XSUS_APP_ERROR_CODES).toMatchObject({
      INVALID_OPTIONS: "INVALID_OPTIONS",
      INVALID_QUERY: "INVALID_QUERY",
      ADAPTER_CLOSED: "ADAPTER_CLOSED",
      RETRIEVAL_FAILED: "RETRIEVAL_FAILED"
    });

    expect(typeof getHyperXsusCoreAdapterCapabilities)
      .toBe("function");
  });

  it("ekspozon App Intelligence", () => {
    expect(typeof createAppIntelligence).toBe("function");
    expect(APP_INTELLIGENCE_VERSION).toBe("1.2.0");
  });

  it("ruan identitetin e pavarur të XSUS App", () => {
    expect(XSUS_APP_PRODUCT).toMatchObject({
      id: "xsus-app",
      name: "XSUS App",
      version: "1.0.0",
      status: "development",
      engine: "XSUS App Engine"
    });
  });

  it("ekspozon capabilities të motorit si strukturë të vlefshme", () => {
    expect(APP_ENGINE_CAPABILITIES).toEqual(
      expect.any(Array)
    );

    expect(APP_ENGINE_CAPABILITIES.length).toBeGreaterThan(0);
  });
});
