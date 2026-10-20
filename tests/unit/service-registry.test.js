
import {
  afterEach,
  describe,
  expect,
  test,
} from "vitest";

import {
  registerService,
  getService,
  hasService,
  listServices,
  unregisterService,
  clearServices,
} from "../../src/runtime/service-registry.js";

describe("XSUS AI Service Registry", () => {
  afterEach(() => {
    clearServices();
  });

  test("regjistron dhe gjen një shërbim", () => {
    const service = async () => "Përshëndetje";

    registerService("greeting", service);

    expect(hasService("greeting")).toBe(true);
    expect(getService("greeting")).toBe(service);
  });

  test("normalizon hapësirat në emrin e shërbimit", () => {
    const service = () => "OK";

    registerService(" greeting ", service);

    expect(hasService("greeting")).toBe(true);
    expect(getService(" greeting ")).toBe(service);
  });

  test("refuzon emrin e pavlefshëm", () => {
    expect(() => registerService("", () => {})).toThrow(
      TypeError
    );

    expect(() => registerService(null, () => {})).toThrow(
      TypeError
    );
  });

  test("refuzon shërbimin që nuk është funksion", () => {
    expect(() => registerService("invalid", null)).toThrow(
      TypeError
    );
  });

  test("refuzon regjistrimin e dyfishtë", () => {
    registerService("greeting", () => "A");

    expect(() =>
      registerService("greeting", () => "B")
    ).toThrow(/regjistruar tashmë/);
  });

  test("liston shërbimet e regjistruara", () => {
    registerService("alpha", () => "A");
    registerService("beta", () => "B");

    expect(listServices()).toEqual(["alpha", "beta"]);
  });

  test("çregjistron një shërbim", () => {
    registerService("temporary", () => "OK");

    expect(unregisterService("temporary")).toBe(true);
    expect(hasService("temporary")).toBe(false);
    expect(unregisterService("temporary")).toBe(false);
  });

  test("pastron të gjitha shërbimet", () => {
    registerService("alpha", () => "A");
    registerService("beta", () => "B");

    clearServices();

    expect(listServices()).toEqual([]);
  });

  test("funksioni i çregjistrimit nuk heq një regjistrim tjetër", () => {
    const firstService = () => "A";
    const secondService = () => "B";

    const unregisterFirst = registerService(
      "shared",
      firstService
    );

    unregisterService("shared");
    registerService("shared", secondService);

    expect(unregisterFirst()).toBe(false);
    expect(getService("shared")).toBe(secondService);
  });
});
