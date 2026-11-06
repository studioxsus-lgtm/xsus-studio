
import { describe, it, expect, vi } from "vitest";

import {
  createXsusAICoreAdapter,
  XSUS_AI_CORE_ADAPTER_VERSION,
  XSUS_AI_CORE_ADAPTER_ERROR_CODES,
  getXsusAICoreAdapterCapabilities
} from "../../apps/app/adapters/xsus-ai-core-adapter.js";

describe("XSUS AI Core Adapter", () => {
  it("ka versionin e pritshëm", () => {
    expect(XSUS_AI_CORE_ADAPTER_VERSION).toBe("1.0.0");
  });

  it("ekspozon kodet e standardizuara të gabimeve", () => {
    expect(XSUS_AI_CORE_ADAPTER_ERROR_CODES).toEqual({
      INVALID_INPUT: "INVALID_INPUT",
      INVALID_CORE: "INVALID_CORE",
      CORE_ERROR: "CORE_ERROR"
    });
  });

  it("krijon adapter-in me funksionin e injektuar", () => {
    const processRequest = vi.fn();

    const adapter = createXsusAICoreAdapter({
      processRequest
    });

    expect(typeof adapter.processRequest).toBe("function");
    expect(typeof adapter.getCapabilities).toBe("function");
  });

  it("refuzon opsionet që nuk janë objekt", () => {
    expect(() => createXsusAICoreAdapter(null))
      .toThrow(TypeError);

    expect(() => createXsusAICoreAdapter([]))
      .toThrow(TypeError);

    expect(() => createXsusAICoreAdapter("invalid"))
      .toThrow(TypeError);
  });

  it("refuzon funksionin e pavlefshëm të Core-it", () => {
    expect(() =>
      createXsusAICoreAdapter({
        processRequest: "invalid"
      })
    ).toThrow(TypeError);
  });

  it("normalizon query dhe përcjell kontekstin", async () => {
    const coreProcess = vi.fn().mockResolvedValue({
      success: true,
      data: {
        answer: "Test response"
      }
    });

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest({
      query: "  Test query  ",
      context: {
        projectId: "project-001",
        sourceProduct: "other-source"
      },
      metadata: {
        requestId: "request-001",
        sourceProduct: "other-source"
      }
    });

    expect(coreProcess).toHaveBeenCalledTimes(1);

    const normalized = coreProcess.mock.calls[0][0];

    expect(normalized.query).toBe("Test query");

    expect(normalized.context).toEqual({
      projectId: "project-001",
      sourceProduct: "xsus-app"
    });

    expect(normalized.metadata).toEqual({
      requestId: "request-001",
      sourceProduct: "xsus-app",
      integrationAdapter: "1.0.0"
    });

    expect(result.success).toBe(true);
  });

  it("mbështet message si alternativë të query", async () => {
    const coreProcess = vi.fn().mockResolvedValue({
      success: true
    });

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    await adapter.processRequest({
      message: "Hello XSUS"
    });

    expect(coreProcess.mock.calls[0][0].query)
      .toBe("Hello XSUS");
  });

  it("mbështet prompt si alternativë të query dhe message", async () => {
    const coreProcess = vi.fn().mockResolvedValue({
      success: true
    });

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    await adapter.processRequest({
      prompt: "Create an application"
    });

    expect(coreProcess.mock.calls[0][0].query)
      .toBe("Create an application");
  });

  it("i jep përparësi query ndaj message dhe prompt", async () => {
    const coreProcess = vi.fn().mockResolvedValue({
      success: true
    });

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    await adapter.processRequest({
      query: "Primary query",
      message: "Secondary message",
      prompt: "Fallback prompt"
    });

    expect(coreProcess.mock.calls[0][0].query)
      .toBe("Primary query");
  });

  it("refuzon kërkesat që nuk janë objekte të vlefshme", async () => {
    const coreProcess = vi.fn();

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest(null);

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(coreProcess).not.toHaveBeenCalled();
  });

  it("refuzon kërkesat pa query, message ose prompt", async () => {
    const coreProcess = vi.fn();

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest({
      context: {
        projectId: "project-001"
      }
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(coreProcess).not.toHaveBeenCalled();
  });

  it("refuzon tekstin bosh ose vetëm me hapësira", async () => {
    const coreProcess = vi.fn();

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest({
      query: "     "
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(coreProcess).not.toHaveBeenCalled();
  });

  it("refuzon përgjigjen e pavlefshme të Core-it", async () => {
    const coreProcess = vi.fn().mockResolvedValue({
      data: "Invalid response"
    });

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest({
      query: "Test query"
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_CORE");
  });

  it("refuzon përgjigjen që nuk është objekt", async () => {
    const coreProcess = vi.fn().mockResolvedValue(
      "Invalid response"
    );

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest({
      query: "Test query"
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_CORE");
  });

  it("refuzon përgjigjen pa fushën success boolean", async () => {
    const coreProcess = vi.fn().mockResolvedValue({
      success: "true"
    });

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest({
      query: "Test query"
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("INVALID_CORE");
  });

  it("përcjell përgjigjen e Core-it dhe shton metadata integrimi", async () => {
    const coreResponse = {
      success: true,
      data: {
        answer: "XSUS AI Core response"
      },
      metadata: {
        requestId: "request-001"
      }
    };

    const coreProcess = vi.fn().mockResolvedValue(coreResponse);

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest({
      query: "Test integration"
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(coreResponse.data);
    expect(result.metadata).toEqual(coreResponse.metadata);

    expect(result.integration).toMatchObject({
      adapter: "xsus-ai-core-adapter",
      adapterVersion: XSUS_AI_CORE_ADAPTER_VERSION,
      core: "xsus-ai-core"
    });

    expect(result.integration.coreVersion).toBeTruthy();
  });

  it("standardizon gabimet gjatë komunikimit me Core-in", async () => {
    const coreProcess = vi.fn().mockRejectedValue(
      new Error("Internal Core error")
    );

    const adapter = createXsusAICoreAdapter({
      processRequest: coreProcess
    });

    const result = await adapter.processRequest({
      query: "Test query"
    });

    expect(result.success).toBe(false);
    expect(result.error.code).toBe("CORE_ERROR");
    expect(result.error.message).toBe(
      "Ndodhi një gabim gjatë komunikimit me XSUS AI Core."
    );
  });

  it("përgjigjja e gabimit përmban metadata të adapter-it", async () => {
    const adapter = createXsusAICoreAdapter({
      processRequest: vi.fn().mockRejectedValue(
        new Error("Core failure")
      )
    });

    const result = await adapter.processRequest({
      query: "Test query"
    });

    expect(result.metadata).toMatchObject({
      adapter: "xsus-ai-core-adapter",
      adapterVersion: XSUS_AI_CORE_ADAPTER_VERSION
    });

    expect(result.metadata.coreVersion).toBeTruthy();
  });

  it("ekspozon capabilities e adapter-it", () => {
    const adapter = createXsusAICoreAdapter({
      processRequest: vi.fn()
    });

    const capabilities = adapter.getCapabilities();

    expect(capabilities.operations).toContain(
      "processRequest"
    );

    expect(capabilities.features).toEqual(
      expect.arrayContaining([
        "request-processing",
        "conversation-context",
        "memory-aware-processing",
        "knowledge-retrieval",
        "hyper-xsus-core-knowledge-routing"
      ])
    );
  });

  it("i mban capabilities të pandryshueshme", () => {
    const adapter = createXsusAICoreAdapter({
      processRequest: vi.fn()
    });

    expect(Object.isFrozen(adapter)).toBe(true);
    expect(Object.isFrozen(adapter.getCapabilities())).toBe(true);
    expect(Object.isFrozen(getXsusAICoreAdapterCapabilities()))
      .toBe(true);
  });

  it("ekspozon capabilities publike të versionit", () => {
    const capabilities = getXsusAICoreAdapterCapabilities();

    expect(capabilities.adapterVersion).toBe(
      XSUS_AI_CORE_ADAPTER_VERSION
    );

    expect(capabilities.coreVersion).toBeTruthy();

    expect(capabilities.operations).toContain(
      "processRequest"
    );
  });
});
