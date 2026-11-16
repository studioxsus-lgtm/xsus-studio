import { describe, it, expect } from "vitest";
import { createRuntimeCircuitBreaker } from "../../src/hyper-xsus-core/cross-cutting/runtime-circuit-breaker.js";
describe("Hyper Core runtime circuit breaker", () => {
  it("opens after threshold and closes on successful half-open probe", async () => {
    let now = 0;
    const breaker = createRuntimeCircuitBreaker({ failureThreshold: 2, resetAfterMs: 10, clock: () => now });
    const failure = async () => { throw Error("offline"); };
    await expect(breaker.execute(failure)).rejects.toThrow("offline");
    await expect(breaker.execute(failure)).rejects.toThrow("offline");
    expect(breaker.status().state).toBe("open");
    await expect(breaker.execute(async () => 1)).rejects.toThrow("unavailable");
    now = 10;
    expect(await breaker.execute(async () => 42)).toBe(42);
    expect(breaker.status().state).toBe("closed");
  });
  it("opens again after a failed probe", async () => {
    let now = 0;
    const b = createRuntimeCircuitBreaker({ failureThreshold: 1, resetAfterMs: 5, clock: () => now });
    await expect(b.execute(async () => { throw Error("failed"); })).rejects.toThrow();
    now = 5;
    await expect(b.execute(async () => { throw Error("again"); })).rejects.toThrow("again");
    expect(b.status().state).toBe("open");
  });
  it("rejects invalid configuration", () => {
    expect(() => createRuntimeCircuitBreaker({ failureThreshold: 0 })).toThrow("configuration");
  });
});
