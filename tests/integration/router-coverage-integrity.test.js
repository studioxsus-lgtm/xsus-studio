import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServiceMock, hasServiceMock } = vi.hoisted(() => ({
  getServiceMock: vi.fn(),
  hasServiceMock: vi.fn(),
}));

vi.mock("../../src/runtime/service-registry.js", () => ({
  getService: getServiceMock,
  hasService: hasServiceMock,
}));

import { routeAIRequest } from "../../src/runtime/router.js";

describe("XSUS AI Core — Runtime Router Coverage Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    hasServiceMock.mockReturnValue(true);

    getServiceMock.mockReturnValue(
      vi.fn(async () => ({
        text: "Successful service response",
      })),
    );
  });

  it("refuzon kërkesat që nuk janë objekte të vlefshme", async () => {
    const invalidRequests = [
      null,
      "invalid",
      123,
      true,
      [],
    ];

    for (const request of invalidRequests) {
      await expect(routeAIRequest(request)).resolves.toEqual({
        success: false,
        error: "Kërkesa duhet të jetë një objekt i vlefshëm.",
        service: null,
      });
    }

    expect(hasServiceMock).not.toHaveBeenCalled();
    expect(getServiceMock).not.toHaveBeenCalled();
  });

  it("refuzon kërkesat pa emër shërbimi", async () => {
    const invalidRequests = [
      {},
      { service: "" },
      { service: "   " },
      { service: 123 },
      { service: null },
    ];

    for (const request of invalidRequests) {
      await expect(routeAIRequest(request)).resolves.toEqual({
        success: false,
        error: "Nuk është përcaktuar shërbimi.",
        service: null,
      });
    }

    expect(hasServiceMock).not.toHaveBeenCalled();
    expect(getServiceMock).not.toHaveBeenCalled();
  });

  it("normalizon hapësirat në emrin e shërbimit", async () => {
    const service = vi.fn(async () => ({
      text: "Normalized service",
    }));

    getServiceMock.mockReturnValue(service);

    const request = {
      service: "  test-service  ",
      prompt: "Test normalization",
    };

    const result = await routeAIRequest(request);

    expect(hasServiceMock).toHaveBeenCalledWith("test-service");
    expect(getServiceMock).toHaveBeenCalledWith("test-service");
    expect(service).toHaveBeenCalledWith(request);

    expect(result).toEqual({
      success: true,
      service: "test-service",
      data: {
        text: "Normalized service",
      },
    });
  });

  it("refuzon shërbimet që nuk janë regjistruar", async () => {
    hasServiceMock.mockReturnValue(false);

    const result = await routeAIRequest({
      service: "missing-service",
      prompt: "Test missing service",
    });

    expect(result).toEqual({
      success: false,
      error: 'Shërbimi "missing-service" nuk është regjistruar.',
      service: "missing-service",
    });

    expect(getServiceMock).not.toHaveBeenCalled();
  });

  it("refuzon shërbimet që nuk janë funksione", async () => {
    const invalidServices = [
      null,
      undefined,
      {},
      [],
      "not-a-function",
      123,
    ];

    for (const invalidService of invalidServices) {
      getServiceMock.mockReturnValue(invalidService);

      const result = await routeAIRequest({
        service: "invalid-service",
      });

      expect(result).toEqual({
        success: false,
        error:
          'Shërbimi "invalid-service" nuk është funksion i vlefshëm.',
        service: "invalid-service",
      });
    }
  });

  it("ekzekuton shërbimin dhe kthen rezultatin me sukses", async () => {
    const serviceResult = {
      text: "AI response",
      model: "test-model",
    };

    const service = vi.fn(async () => serviceResult);

    getServiceMock.mockReturnValue(service);

    const request = {
      service: "ai-service",
      prompt: "Hello XSUS",
      language: "sq",
    };

    const result = await routeAIRequest(request);

    expect(service).toHaveBeenCalledTimes(1);
    expect(service).toHaveBeenCalledWith(request);

    expect(result).toEqual({
      success: true,
      service: "ai-service",
      data: serviceResult,
    });
  });

  it("trajton gabimet gjatë ekzekutimit të shërbimit", async () => {
    const service = vi.fn(async () => {
      throw new Error("Service execution failure");
    });

    getServiceMock.mockReturnValue(service);

    const result = await routeAIRequest({
      service: "failing-service",
    });

    expect(result).toEqual({
      success: false,
      service: "failing-service",
      error: "Service execution failure",
    });
  });

  it("përdor mesazhin rezervë kur gabimi nuk është objekt Error", async () => {
    const service = vi.fn(async () => {
      throw "Unexpected service failure";
    });

    getServiceMock.mockReturnValue(service);

    const result = await routeAIRequest({
      service: "unknown-error-service",
    });

    expect(result).toEqual({
      success: false,
      service: "unknown-error-service",
      error: "Gabim gjatë ekzekutimit të shërbimit.",
    });
  });

  it("përdor mesazhin rezervë kur gabimi Error nuk ka mesazh", async () => {
    const service = vi.fn(async () => {
      throw new Error("   ");
    });

    getServiceMock.mockReturnValue(service);

    const result = await routeAIRequest({
      service: "empty-error-service",
    });

    expect(result).toEqual({
      success: false,
      service: "empty-error-service",
      error: "Gabim gjatë ekzekutimit të shërbimit.",
    });
  });

  it("trajton gabimet gjatë kontrollit të regjistrimit", async () => {
    hasServiceMock.mockImplementation(() => {
      throw new Error("Registry lookup failure");
    });

    const result = await routeAIRequest({
      service: "registry-error-service",
    });

    expect(result).toEqual({
      success: false,
      service: "registry-error-service",
      error: "Registry lookup failure",
    });

    expect(getServiceMock).not.toHaveBeenCalled();
  });

  it("trajton gabimet gjatë marrjes së shërbimit", async () => {
    getServiceMock.mockImplementation(() => {
      throw new Error("Service retrieval failure");
    });

    const result = await routeAIRequest({
      service: "retrieval-error-service",
    });

    expect(result).toEqual({
      success: false,
      service: "retrieval-error-service",
      error: "Service retrieval failure",
    });
  });

  it("ruan izolimin midis kërkesave të njëpasnjëshme", async () => {
    const firstService = vi.fn(async () => ({
      text: "First response",
    }));

    const secondService = vi.fn(async () => ({
      text: "Second response",
    }));

    getServiceMock
      .mockReturnValueOnce(firstService)
      .mockReturnValueOnce(secondService);

    const firstResult = await routeAIRequest({
      service: "first-service",
    });

    const secondResult = await routeAIRequest({
      service: "second-service",
    });

    expect(firstResult).toEqual({
      success: true,
      service: "first-service",
      data: {
        text: "First response",
      },
    });

    expect(secondResult).toEqual({
      success: true,
      service: "second-service",
      data: {
        text: "Second response",
      },
    });

    expect(firstService).toHaveBeenCalledTimes(1);
    expect(secondService).toHaveBeenCalledTimes(1);
  });
});
