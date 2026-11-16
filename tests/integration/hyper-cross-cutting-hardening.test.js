import { describe, it, expect } from "vitest";
import { createEngineRoutingCoordinator } from "../../src/hyper-xsus-core/cross-cutting/engine-routing-coordinator.js";
import { createRuntimeCircuitBreaker } from "../../src/hyper-xsus-core/cross-cutting/runtime-circuit-breaker.js";
describe("Hyper Core — integrated routing and runtime hardening", () => {
  it("rejects unsafe primary output and falls back to validated backup", async () => {
    const router = createEngineRoutingCoordinator({ engines: [
      { name: "primary", supports: () => true, process: async () => JSON.parse('{"__proto__":{"admin":true}}') },
      { name: "backup", supports: () => true, process: async () => ({ answer: "safe", items: [1] }) }
    ] });
    const result = await router.route({ text: "Hello" });
    expect(result.engine).toBe("backup");
    expect(result.degraded).toBe(true);
    expect(Object.isFrozen(result.result.items)).toBe(true);
  });
  it("rejects cyclic output and falls back without exposing internal exceptions", async () => {
    const router = createEngineRoutingCoordinator({ engines: [
      { name: "bad", supports: () => true, process: async () => { const a = {}; a.self = a; return a; } },
      { name: "good", supports: () => true, process: async () => ({ ok: true }) }
    ] });
    expect((await router.route({ text: "Bonjour" })).engine).toBe("good");
  });
  it("rejects oversized outputs using configured bounds", async () => {
    const router = createEngineRoutingCoordinator({ maxOutputNodes: 2, engines: [
      { name: "large", supports: () => true, process: async () => ({ a: [1, 2] }) }
    ] });
    await expect(router.route({ text: "Hi" })).rejects.toMatchObject({ code: "HYPER_ENGINE_UNAVAILABLE" });
  });
  it("does not let stale success close a circuit opened by another concurrent call", async () => {
    let complete;
    const breaker = createRuntimeCircuitBreaker({ failureThreshold: 1, resetAfterMs: 100, clock: () => 0 });
    const slow = breaker.execute(() => new Promise(resolve => { complete = resolve; }));
    await expect(breaker.execute(async () => { throw new Error("down"); })).rejects.toThrow("down");
    expect(breaker.status().state).toBe("open");
    complete("late success");
    expect(await slow).toBe("late success");
    expect(breaker.status().state).toBe("open");
  });
  it("allows only one concurrent half-open probe", async () => {
    let now = 0, complete;
    const breaker = createRuntimeCircuitBreaker({ failureThreshold: 1, resetAfterMs: 10, clock: () => now });
    await expect(breaker.execute(async () => { throw new Error("down"); })).rejects.toThrow();
    now = 10;
    const probe = breaker.execute(() => new Promise(resolve => { complete = resolve; }));
    await expect(breaker.execute(async () => "other")).rejects.toThrow("unavailable");
    complete("recovered");
    expect(await probe).toBe("recovered");
    expect(breaker.status().state).toBe("closed");
  });
});
