import { describe, expect, it } from "vitest";
import { createRecoveryFaultToleranceEngine } from "../../src/hyper-xsus-core/knowledge-graph/recovery-fault-tolerance-engine.js";
describe("Hyper XSUS Core — recovery fault tolerance", () => {
  it("opens after threshold failures and blocks further operations", async () => {
    const breaker = createRecoveryFaultToleranceEngine({ threshold: 2 });
    for (let i = 0; i < 2; i++) {
      await expect(breaker.check(async () => { throw new Error("offline"); }))
        .rejects.toThrow("offline");
    }
    expect(breaker.status().mode).toBe("open");
    await expect(breaker.check(async () => "unsafe")).rejects.toMatchObject({
      code: "RECOVERY_CIRCUIT_OPEN"
    });
  });
  it("allows a successful half-open probe after cooldown", async () => {
    let t = 1000;
    const breaker = createRecoveryFaultToleranceEngine({
      threshold: 1, cooldownMs: 100, clock: () => t
    });
    await expect(breaker.check(async () => { throw new Error("offline"); }))
      .rejects.toThrow("offline");
    t = 1100;
    expect(breaker.status().mode).toBe("half-open");
    expect(await breaker.check(async () => "healthy")).toBe("healthy");
    expect(breaker.status().mode).toBe("closed");
  });
  it("reopens if the half-open probe fails", async () => {
    let t = 1000;
    const breaker = createRecoveryFaultToleranceEngine({
      threshold: 1, cooldownMs: 100, clock: () => t
    });
    breaker.trip();
    t = 1100;
    await expect(breaker.check(async () => { throw new Error("still offline"); }))
      .rejects.toThrow("still offline");
    expect(breaker.status().mode).toBe("open");
  });
  it("allows only one simultaneous half-open probe", async () => {
    let t = 1000;
    const breaker = createRecoveryFaultToleranceEngine({
      threshold: 1, cooldownMs: 100, clock: () => t
    });
    breaker.trip();
    t = 1100;
    let release;
    const pending = breaker.check(() => new Promise(resolve => { release = resolve; }));
    await expect(breaker.check(async () => "other")).rejects.toMatchObject({
      code: "RECOVERY_CIRCUIT_OPEN"
    });
    release("done");
    expect(await pending).toBe("done");
  });
  it("validates configuration and rejects invalid clocks", async () => {
    expect(() => createRecoveryFaultToleranceEngine({ threshold: 0 })).toThrow("configuration");
    const breaker = createRecoveryFaultToleranceEngine({ clock: () => -1 });
    expect(() => breaker.status()).toThrow("clock");
  });
});
