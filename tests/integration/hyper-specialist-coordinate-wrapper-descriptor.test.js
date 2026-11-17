import { describe, expect, it } from "vitest";
import { createSpecializedEngineCoordinator } from "../../src/hyper-xsus-core/cross-cutting/specialized-engine-coordinator.js";
const make = (counter) => createSpecializedEngineCoordinator({ engines: [
  { name: "semantic", execute: async payload => { counter.calls++; return { value: payload.value }; } }
] });
describe("Hyper XSUS Core — coordination wrapper descriptor isolation", () => {
  it("rejects requests getter without invoking getter or engine", async () => {
    const counter = { calls: 0 };
    const coordinator = make(counter);
    let reads = 0;
    const input = {};
    Object.defineProperty(input, "requests", { get() { reads++; return []; } });
    await expect(coordinator.coordinate(input)).rejects.toThrow("accessor");
    expect(reads).toBe(0);
    expect(counter.calls).toBe(0);
  });
  it("rejects inherited requests and non-record wrapper", async () => {
    const counter = { calls: 0 };
    const coordinator = make(counter);
    await expect(coordinator.coordinate(Object.create({ requests: [] }))).rejects.toThrow("requests");
    await expect(coordinator.coordinate([])).rejects.toThrow("requests");
    await expect(coordinator.coordinate(null)).rejects.toThrow("requests");
    expect(counter.calls).toBe(0);
  });
  it("rejects invalid batch before any specialist executes", async () => {
    const counter = { calls: 0 };
    const coordinator = make(counter);
    await expect(coordinator.coordinate({ requests: [
      { engine: "semantic", payload: { value: 1 } },
      { engine: "missing", payload: {} }
    ] })).rejects.toThrow("request");
    expect(counter.calls).toBe(0);
  });
  it("accepts null-prototype wrapper with own data requests", async () => {
    const counter = { calls: 0 };
    const coordinator = make(counter);
    const input = Object.assign(Object.create(null), {
      requests: [{ engine: "semantic", payload: { value: 9 } }]
    });
    const result = await coordinator.coordinate(input);
    expect(result).toMatchObject({ completed: 1, failed: 0 });
    expect(result.results[0].output).toEqual({ value: 9 });
    expect(counter.calls).toBe(1);
  });
  it("keeps empty request batches valid", async () => {
    const counter = { calls: 0 };
    const result = await make(counter).coordinate({ requests: [] });
    expect(result).toMatchObject({ completed: 0, failed: 0 });
    expect(counter.calls).toBe(0);
  });
});
