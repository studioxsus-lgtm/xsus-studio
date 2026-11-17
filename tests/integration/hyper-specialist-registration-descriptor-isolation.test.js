import { describe, expect, it } from "vitest";
import { createSpecializedEngineCoordinator } from "../../src/hyper-xsus-core/cross-cutting/specialized-engine-coordinator.js";
const engine = () => ({ name: "semantic", execute: async payload => ({ value: payload.value }) });
describe("Hyper XSUS Core — specialist registration descriptor isolation", () => {
  it("rejects engine name getter without invoking it", () => {
    let reads = 0;
    const item = engine();
    Object.defineProperty(item, "name", { get() { reads++; return "semantic"; } });
    expect(() => createSpecializedEngineCoordinator({ engines: [item] })).toThrow("engine");
    expect(reads).toBe(0);
  });
  it("rejects engine execute getter without invoking it", () => {
    let reads = 0;
    const item = engine();
    Object.defineProperty(item, "execute", { get() { reads++; return async () => ({}); } });
    expect(() => createSpecializedEngineCoordinator({ engines: [item] })).toThrow("engine");
    expect(reads).toBe(0);
  });
  it("rejects engine array element getter without invoking it", () => {
    let reads = 0;
    const engines = [engine()];
    Object.defineProperty(engines, "0", { get() { reads++; return engine(); } });
    expect(() => createSpecializedEngineCoordinator({ engines })).toThrow("engine");
    expect(reads).toBe(0);
  });
  it("rejects inherited engine registration fields", () => {
    expect(() => createSpecializedEngineCoordinator({
      engines: [Object.create(engine())]
    })).toThrow("engine");
  });
  it("accepts null-prototype engine registration and executes it", async () => {
    const item = Object.assign(Object.create(null), engine());
    const coordinator = createSpecializedEngineCoordinator({ engines: [item] });
    const result = await coordinator.coordinate({
      requests: [{ engine: "semantic", payload: { value: 7 } }]
    });
    expect(result).toMatchObject({ completed: 1, failed: 0 });
    expect(result.results[0].output).toEqual({ value: 7 });
  });
  it("preserves duplicate engine rejection", () => {
    expect(() => createSpecializedEngineCoordinator({
      engines: [engine(), engine()]
    })).toThrow("engine");
  });
});
