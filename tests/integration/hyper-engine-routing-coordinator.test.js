import { describe, it, expect } from "vitest";
import { createEngineRoutingCoordinator } from "../../src/hyper-xsus-core/cross-cutting/engine-routing-coordinator.js";
describe("Hyper independent engine routing", () => {
  it("uses a supported primary engine", async () => {
    const coordinator = createEngineRoutingCoordinator({ engines: [
      { name: "english", supports: ({ language }) => language === "en",
        process: async ({ text }) => ({ answer: text }) }
    ] });
    const result = await coordinator.route({ text: "Hello", language: "en" });
    expect(result).toMatchObject({ engine: "english", degraded: false, result: { answer: "Hello" } });
  });
  it("fails over without leaking engine exception details", async () => {
    const coordinator = createEngineRoutingCoordinator({ engines: [
      { name: "primary", supports: () => true, process: async () => { throw Error("private"); } },
      { name: "backup", supports: () => true, process: async () => ({ answer: "ok" }) }
    ] });
    expect(await coordinator.route({ text: "Hi" })).toMatchObject({ engine: "backup", degraded: true });
  });
  it("rejects requests when all engines fail", async () => {
    const coordinator = createEngineRoutingCoordinator({ engines: [
      { name: "primary", supports: () => true, process: async () => { throw Error("secret"); } }
    ] });
    await expect(coordinator.route({ text: "Hi" })).rejects.toMatchObject({ code: "HYPER_ENGINE_UNAVAILABLE" });
  });
  it("rejects duplicate engine names and invalid input", () => {
    const engine = { name: "x", supports: () => true, process: async () => ({}) };
    expect(() => createEngineRoutingCoordinator({ engines: [engine, engine] })).toThrow("entry");
    const coordinator = createEngineRoutingCoordinator({ engines: [engine] });
    return expect(coordinator.route({ text: "" })).rejects.toThrow("request");
  });
});
