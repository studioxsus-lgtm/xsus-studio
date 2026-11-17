import { describe, expect, it } from "vitest";
import { createSpecializedEngineCoordinator } from "../../src/hyper-xsus-core/cross-cutting/specialized-engine-coordinator.js";
const make = execute => createSpecializedEngineCoordinator({
  engines: [{ name: "worker", execute }]
});
describe("Hyper XSUS Core — specialist request descriptor isolation", () => {
  it("does not invoke an accessor on the engine name", async () => {
    let reads = 0, calls = 0;
    const request = { payload: {} };
    Object.defineProperty(request, "engine", { enumerable: true, get() { reads++; return "worker"; } });
    const coordinator = make(async () => { calls++; return {}; });
    await expect(coordinator.coordinate({ requests: [request] })).rejects.toThrow("request");
    expect(reads).toBe(0);
    expect(calls).toBe(0);
  });
  it("does not invoke an accessor on the payload field", async () => {
    let reads = 0, calls = 0;
    const request = { engine: "worker" };
    Object.defineProperty(request, "payload", { enumerable: true, get() { reads++; return {}; } });
    const coordinator = make(async () => { calls++; return {}; });
    await expect(coordinator.coordinate({ requests: [request] })).rejects.toThrow("request");
    expect(reads).toBe(0);
    expect(calls).toBe(0);
  });
  it("does not invoke an accessor on a request array element", async () => {
    let reads = 0, calls = 0;
    const requests = [{ engine: "worker", payload: {} }];
    Object.defineProperty(requests, "0", { enumerable: true, get() { reads++; return {}; } });
    const coordinator = make(async () => { calls++; return {}; });
    await expect(coordinator.coordinate({ requests })).rejects.toThrow("request");
    expect(reads).toBe(0);
    expect(calls).toBe(0);
  });
  it("rejects inherited request fields and prototype-backed requests", async () => {
    let calls = 0;
    const coordinator = make(async () => { calls++; return {}; });
    const inherited = Object.create({ engine: "worker", payload: {} });
    await expect(coordinator.coordinate({ requests: [inherited] })).rejects.toThrow("request");
    expect(calls).toBe(0);
  });
  it("preserves valid plain and null-prototype request support", async () => {
    const coordinator = make(async payload => ({ answer: payload.value }));
    const request = Object.assign(Object.create(null), { engine: "worker", payload: { value: 7 } });
    const result = await coordinator.coordinate({ requests: [request] });
    expect(result).toMatchObject({ completed: 1, failed: 0 });
    expect(result.results[0].output.answer).toBe(7);
  });
  it("rejects an unsafe second request before executing the first", async () => {
    let calls = 0, reads = 0;
    const coordinator = createSpecializedEngineCoordinator({ engines: [
      { name: "first", execute: async () => { calls++; return {}; } },
      { name: "second", execute: async () => { calls++; return {}; } }
    ] });
    const unsafe = { engine: "second" };
    Object.defineProperty(unsafe, "payload", { enumerable: true, get() { reads++; return {}; } });
    await expect(coordinator.coordinate({ requests: [
      { engine: "first", payload: {} }, unsafe
    ] })).rejects.toThrow("request");
    expect(calls).toBe(0);
    expect(reads).toBe(0);
  });
});
