
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configureAICoreKnowledgeAdapter: vi.fn(),
  createXsusAICoreAdapter: vi.fn(),
  createHyperXsusCoreAdapter: vi.fn()
}));

vi.mock("../../src/core/ai-core.js", () => ({
  configureAICoreKnowledgeAdapter:
    mocks.configureAICoreKnowledgeAdapter
}));

vi.mock("../../apps/app/adapters/xsus-ai-core-adapter.js", () => ({
  createXsusAICoreAdapter: mocks.createXsusAICoreAdapter
}));

vi.mock("../../apps/app/adapters/hyper-xsus-core-adapter.js", () => ({
  createHyperXsusCoreAdapter: mocks.createHyperXsusCoreAdapter
}));

describe("XSUS App Intelligence Integration", () => {
  let intelligenceModule;
  let aiCore;
  let hyperCore;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    aiCore = {
      processRequest: vi.fn().mockResolvedValue({
        success: true,
        data: { answer: "AI response" }
      }),

      getCapabilities: vi.fn().mockReturnValue({
        operations: ["processRequest"]
      })
    };

    hyperCore = {
      retrieve: vi.fn().mockResolvedValue({
        success: true,
        results: [{ id: "knowledge-001" }]
      }),

      getStatus: vi.fn().mockReturnValue({
        connected: true
      }),

      close: vi.fn()
    };

    mocks.createXsusAICoreAdapter.mockReturnValue(aiCore);
    mocks.createHyperXsusCoreAdapter.mockReturnValue(hyperCore);

    intelligenceModule = await import(
      "../../apps/app/integration/app-intelligence.js"
    );
  });

  it("ekspozon versionin e integrimit", () => {
    expect(
      intelligenceModule.APP_INTELLIGENCE_VERSION
    ).toBe("1.2.0");
  });

  it("krijon të dy adapter-at e pavarur", () => {
    intelligenceModule.createAppIntelligence();

    expect(
      mocks.createXsusAICoreAdapter
    ).toHaveBeenCalledTimes(1);

    expect(
      mocks.createHyperXsusCoreAdapter
    ).toHaveBeenCalledTimes(1);
  });

  it("konfiguron Hyper XSUS Core si knowledge provider të AI Core", () => {
    intelligenceModule.createAppIntelligence();

    expect(
      mocks.configureAICoreKnowledgeAdapter
    ).toHaveBeenCalledTimes(1);

    expect(
      mocks.configureAICoreKnowledgeAdapter
    ).toHaveBeenCalledWith(hyperCore);
  });

  it("përcjell kërkesat te XSUS AI Core Adapter", async () => {
    const intelligence =
      intelligenceModule.createAppIntelligence();

    const request = {
      query: "Create an application"
    };

    const result = await intelligence.processRequest(request);

    expect(aiCore.processRequest).toHaveBeenCalledWith(request);
    expect(result.success).toBe(true);
  });

  it("përcjell kërkesat për njohuri te Hyper XSUS Core", async () => {
    const intelligence =
      intelligenceModule.createAppIntelligence();

    const result = await intelligence.retrieveKnowledge(
      "application architecture"
    );

    expect(hyperCore.retrieve).toHaveBeenCalledWith(
      "application architecture",
      {}
    );

    expect(result.success).toBe(true);
  });

  it("përcjell opsionet e kërkimit te Hyper XSUS Core", async () => {
    const intelligence =
      intelligenceModule.createAppIntelligence();

    const options = {
      limit: 5
    };

    await intelligence.retrieveKnowledge(
      "knowledge graph",
      options
    );

    expect(hyperCore.retrieve).toHaveBeenCalledWith(
      "knowledge graph",
      options
    );
  });

  it("ekspozon statusin e integrimit", () => {
    const intelligence =
      intelligenceModule.createAppIntelligence();

    const status = intelligence.getStatus();

    expect(status).toBeDefined();
    expect(typeof status).toBe("object");

    expect(aiCore.getCapabilities).toHaveBeenCalled();
    expect(hyperCore.getStatus).toHaveBeenCalled();
  });

  it("mbyll integrimin dhe pastron konfigurimin e Knowledge Adapter", async () => {
    const intelligence =
      intelligenceModule.createAppIntelligence();

    await intelligence.close();

    expect(
      mocks.configureAICoreKnowledgeAdapter
    ).toHaveBeenLastCalledWith(null);

    expect(hyperCore.close).toHaveBeenCalledTimes(1);
  });

  it("nuk lejon dy pronarë aktivë të integrimit", () => {
    intelligenceModule.createAppIntelligence();

    expect(() =>
      intelligenceModule.createAppIntelligence()
    ).toThrow();
  });

  it("lejon krijimin e integrimit të ri pas mbylljes", async () => {
    const first =
      intelligenceModule.createAppIntelligence();

    await first.close();

    const second =
      intelligenceModule.createAppIntelligence();

    expect(second).toBeDefined();

    expect(
      mocks.createXsusAICoreAdapter
    ).toHaveBeenCalledTimes(2);

    expect(
      mocks.createHyperXsusCoreAdapter
    ).toHaveBeenCalledTimes(2);
  });
});
