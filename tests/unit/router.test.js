
import {
  afterEach,
  describe,
  expect,
  test,
} from "vitest";

import { routeAIRequest } from "../../src/runtime/router.js";

import {
  registerService,
  clearServices,
} from "../../src/runtime/service-registry.js";

describe("XSUS AI Router", () => {
  afterEach(() => {
    clearServices();
  });

  test("refuzon kërkesën e pavlefshme", async () => {
    const result = await routeAIRequest(null);

    expect(result.success).toBe(false);
    expect(result.service).toBe(null);
    expect(result.error).toBeTruthy();
  });

  test("refuzon kërkesën pa emër shërbimi", async () => {
    const result = await routeAIRequest({});

    expect(result.success).toBe(false);
    expect(result.service).toBe(null);
    expect(result.error).toMatch(/shërbimi/i);
  });

  test("refuzon shërbimin e paregjistruar", async () => {
    const result = await routeAIRequest({
      service: "missing-service",
    });

    expect(result.success).toBe(false);
    expect(result.service).toBe("missing-service");
    expect(result.error).toMatch(/nuk është regjistruar/i);
  });

  test("ekzekuton shërbimin e regjistruar", async () => {
    registerService("greeting", async () => "Përshëndetje!");

    const result = await routeAIRequest({
      service: "greeting",
    });

    expect(result.success).toBe(true);
    expect(result.service).toBe("greeting");
    expect(result.data).toBe("Përshëndetje!");
  });

  test("i përcjell kërkesën shërbimit", async () => {
    const request = {
      service: "echo",
      query: "Përshëndetje",
      language: "sq",
    };

    registerService("echo", async (input) => ({
      query: input.query,
      language: input.language,
    }));

    const result = await routeAIRequest(request);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      query: "Përshëndetje",
      language: "sq",
    });
  });

  test("kap gabimet e shërbimit", async () => {
    registerService("failing-service", async () => {
      throw new Error("Gabim prove");
    });

    const result = await routeAIRequest({
      service: "failing-service",
    });

    expect(result.success).toBe(false);
    expect(result.service).toBe("failing-service");
    expect(result.error).toBe("Gabim prove");
  });

  test("trajton refuzimin asinkron të shërbimit", async () => {
    registerService("rejected-service", async () => {
      return Promise.reject(new Error("Refuzim prove"));
    });

    const result = await routeAIRequest({
      service: "rejected-service",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Refuzim prove");
  });
});
